import { NextResponse } from "next/server";
import { generateText, type LanguageModel } from "ai";
import { z } from "zod";
import { AI_PLAN_PROVIDER } from "@superwriter/shared";
import { deriveAIArtifactMetadata } from "@/lib/ai/ai-generation-artifacts";
import { resolveAICreditPreview } from "@/lib/ai/credit-policy";
import { estimateAIUsageCostCents } from "@/lib/ai/cost-estimate";
import { resolveAICostBudgetDecision } from "@/lib/ai/cost-budget";
import {
  createCreditLedgerClient,
  refundAIUsageCredits,
  reserveAIUsageCredits,
  settleAIUsageCredits,
} from "@/lib/ai/credit-ledger";
import { logAIFinishPersistence } from "@/lib/ai/finish-persistence";
import { resolveAIModelRoute } from "@/lib/ai/model-registry";
import {
  AI_ROUTE_MAX_RETRIES,
  createAIRouteTimeout,
  resolveAIRouteAbortAfterMs,
} from "@/lib/ai/route-timeout";
import { getModel } from "@/lib/ai/providers";
import { resolveEffectivePlan } from "@/lib/db/queries/plans";
import { createClient } from "@/lib/supabase/server";
import { parseWorkLearningApplyResult } from "@/lib/work-learning/parse-analysis";
import { buildWorkLearningApplyPrompt } from "@/lib/work-learning/prompts";
import { techniqueCardSchema } from "@/lib/work-learning/schema";

export const maxDuration = 120;

const applySchema = z.object({
  card: techniqueCardSchema,
  target: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("blueprint"),
      storyId: z.string().uuid(),
    }),
    z.object({
      type: z.literal("chapter"),
      storyId: z.string().uuid(),
      chapterId: z.string().uuid(),
    }),
  ]),
});

export async function POST(request: Request) {
  const requestStartedAt = Date.now();
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = applySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "作品学习应用输入无效",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    }

    const targetContext = await fetchTargetContext(supabase, parsed.data.target, user.id);
    if (!targetContext) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "目标故事或章节不存在，或无权访问" } },
        { status: 404 },
      );
    }

    const { effectivePlan } = await resolveEffectivePlan(supabase, user.id);
    const ledger = createCreditLedgerClient();
    const planProvider = AI_PLAN_PROVIDER[effectivePlan];
    const creditPreview = await resolveAICreditPreview({
      routeKey: "work_learning_apply",
      plan: effectivePlan,
      provider: planProvider,
    });
    const requestCost = creditPreview.creditsCost;
    const budgetDecision = await resolveAICostBudgetDecision({
      plan: effectivePlan,
      estimatedCostCents: estimateAIUsageCostCents({
        providerKey: planProvider,
        priceTier: creditPreview.priceTier,
        creditsCost: requestCost,
      }),
    });

    if (creditPreview.isDisabled) {
      return NextResponse.json(
        {
          error: {
            code: "AI_ACTION_DISABLED",
            message: "这个 AI 功能当前未开放。",
          },
        },
        { status: 403 },
      );
    }
    if (budgetDecision.shouldReject) {
      return NextResponse.json(
        { error: { code: "AI_COST_BUDGET_EXCEEDED", message: "当前高级模型额度繁忙，请稍后再试。" } },
        { status: 429 },
      );
    }

    const resolvedRoute = await resolveAIModelRoute({
      routeKey: "work_learning_apply",
      plan: effectivePlan,
      capability: "analysis",
      callScope: "user_plan_scoped",
      requestedPriceTier: creditPreview.priceTier,
      allowPaidFallback: budgetDecision.allowPaidFallback,
    });
    const model = getModel(resolvedRoute);
    const estimatedCostCents = estimateAIUsageCostCents({
      providerKey: resolvedRoute.providerKey,
      priceTier: creditPreview.priceTier,
      creditsCost: requestCost,
    });
    const routeAbortAfterMs = resolveAIRouteAbortAfterMs(resolvedRoute.fallbackPolicy);
    const reserveResult = await reserveAIUsageCredits({
      supabase: ledger,
      requestId: crypto.randomUUID(),
      userId: user.id,
      storyId: parsed.data.target.storyId,
      provider: resolvedRoute.providerKey,
      model: resolvedRoute.modelAlias,
      mode: "work_learning_apply",
      routeKey: creditPreview.routeKey,
      creditsCost: requestCost,
      billingReason: creditPreview.chargeBehavior,
      modelConfigId: resolvedRoute.modelConfigId,
      routeConfigId: resolvedRoute.routeConfigId,
      planKey: effectivePlan,
      routeSource: resolvedRoute.source,
      callScope: resolvedRoute.callScope,
      priceTier: creditPreview.priceTier,
      contextTier: creditPreview.contextTier,
      modelCostTier: resolvedRoute.modelCostTier,
      modelQualityTier: resolvedRoute.modelQualityTier,
      modelContextTier: resolvedRoute.modelContextTier,
      isFallback: resolvedRoute.source === "database-fallback",
      fallbackReason: resolvedRoute.source === "database-fallback" ? "primary_unavailable_or_not_entitled" : null,
      estimatedCostCents,
      budgetAction: budgetDecision.degradeAction,
      budgetReason: budgetDecision.reason,
      telemetryMetadata: {
        fallback_mode: resolvedRoute.fallbackPolicy?.fallbackMode ?? null,
        route_timeout_ms: routeAbortAfterMs,
      },
    });

    if (!reserveResult.ok) {
      return NextResponse.json(
        {
          error: {
            code: "QUOTA_EXCEEDED",
            message: "当前 AI 请求暂不可用。",
          },
        },
        { status: 429 },
      );
    }

    const prompt = buildWorkLearningApplyPrompt({
      cardTitle: parsed.data.card.title,
      abstractRule: parsed.data.card.abstractRule,
      migrationSuggestion: parsed.data.card.migrationSuggestion,
      practiceTask: parsed.data.card.practiceTask,
      targetLabel: targetContext.label,
      targetContext: targetContext.context,
    });

    const routeTimeout = createAIRouteTimeout(routeAbortAfterMs);
    try {
      const { text, usage } = await generateText({
        model: model as LanguageModel,
        prompt,
        abortSignal: routeTimeout.signal,
        maxRetries: AI_ROUTE_MAX_RETRIES,
      });
      routeTimeout.clear();
      const guidance = parseWorkLearningApplyResult(text);
      const artifact = deriveAIArtifactMetadata("work_learning_apply");

      await settleAIUsageCredits({
        supabase: ledger,
        usageId: reserveResult.usageId,
        userId: user.id,
        inputTokens: usage?.promptTokens ?? 0,
        outputTokens: usage?.completionTokens ?? 0,
        latencyMs: Date.now() - requestStartedAt,
        estimatedCostCents,
        providerChannelId: resolvedRoute.channelId,
        telemetryMetadata: { finish_state: "settled" },
      });

      await logAIFinishPersistence("ai_generations", supabase.from("ai_generations").insert({
        user_id: user.id,
        story_id: parsed.data.target.storyId,
        chapter_id: parsed.data.target.type === "chapter" ? parsed.data.target.chapterId : null,
        mode: "work_learning_apply",
        prompt: JSON.stringify({
          kind: "work_learning_apply_summary",
          cardId: parsed.data.card.id,
          cardTitle: parsed.data.card.title,
          target: parsed.data.target,
        }),
        context_entity_ids: parsed.data.target.type === "chapter" ? [parsed.data.target.chapterId] : [],
        model: resolvedRoute.modelAlias,
        result: JSON.stringify(guidance),
        tokens_used: (usage?.promptTokens ?? 0) + (usage?.completionTokens ?? 0),
        source: artifact.source,
        content_type: artifact.contentType,
        status: artifact.status,
      }));

      return NextResponse.json({ data: guidance });
    } catch (error) {
      routeTimeout.clear();
      await refundAIUsageCredits({
        supabase: ledger,
        usageId: reserveResult.usageId,
        userId: user.id,
        reason: "provider_error",
        latencyMs: Date.now() - requestStartedAt,
        providerChannelId: resolvedRoute.channelId,
        telemetryMetadata: { failure_reason: "provider_error" },
      }).catch((refundError) => {
        console.error("AI credit refund failed", refundError);
      });
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "作品学习应用失败";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}

async function fetchTargetContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  target: z.infer<typeof applySchema>["target"],
  userId: string,
): Promise<{ label: string; context: string } | null> {
  const { data: story, error: storyError } = await supabase
    .from("stories")
    .select("id, title, description, genre, era")
    .eq("id", target.storyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (storyError) throw storyError;
  if (!story) return null;

  const storyRecord = story as {
    title?: string | null;
    description?: string | null;
    genre?: string | null;
    era?: string | null;
  };
  const storyContext = [
    `故事：${storyRecord.title ?? "未命名"}`,
    storyRecord.genre ? `类型：${storyRecord.genre}` : null,
    storyRecord.era ? `时代：${storyRecord.era}` : null,
    storyRecord.description ? `简介：${storyRecord.description}` : null,
  ].filter(Boolean).join("\n");

  if (target.type === "blueprint") {
    return {
      label: "故事蓝图",
      context: storyContext,
    };
  }

  const { data: chapter, error: chapterError } = await supabase
    .from("entities")
    .select("id, name, content, data")
    .eq("id", target.chapterId)
    .eq("story_id", target.storyId)
    .eq("type", "chapter")
    .maybeSingle();

  if (chapterError) throw chapterError;
  if (!chapter) return null;

  const chapterRecord = chapter as {
    name?: string | null;
    content?: string | null;
    data?: { summary?: string } | null;
  };

  return {
    label: `章节：${chapterRecord.name ?? "未命名章节"}`,
    context: [
      storyContext,
      `章节：${chapterRecord.name ?? "未命名章节"}`,
      chapterRecord.data?.summary ? `章节摘要：${chapterRecord.data.summary}` : null,
      chapterRecord.content ? `章节正文片段：${chapterRecord.content.slice(0, 3000)}` : null,
    ].filter(Boolean).join("\n\n"),
  };
}
