import { NextResponse } from "next/server";
import { generateText, type LanguageModel } from "ai";
import { z } from "zod";
import { AI_PLAN_PROVIDER } from "@superwriter/shared";
import { getModel } from "@/lib/ai/providers";
import { resolveAICreditPreview } from "@/lib/ai/credit-policy";
import { estimateAIUsageCostCents } from "@/lib/ai/cost-estimate";
import { resolveAICostBudgetDecision } from "@/lib/ai/cost-budget";
import {
  createCreditLedgerClient,
  refundAIUsageCredits,
  reserveAIUsageCredits,
  settleAIUsageCredits,
} from "@/lib/ai/credit-ledger";
import { resolveAIModelRoute } from "@/lib/ai/model-registry";
import {
  AI_ROUTE_MAX_RETRIES,
  createAIRouteTimeout,
  resolveAIRouteAbortAfterMs,
} from "@/lib/ai/route-timeout";
import { deriveAIArtifactMetadata } from "@/lib/ai/ai-generation-artifacts";
import { logAIFinishPersistence } from "@/lib/ai/finish-persistence";
import { resolveEffectivePlan } from "@/lib/db/queries/plans";
import { createClient } from "@/lib/supabase/server";
import { buildWorkLearningAnalysisPrompt } from "@/lib/work-learning/prompts";
import { parseTechniqueCards } from "@/lib/work-learning/parse-analysis";
import { workLearningSkillIdSchema } from "@/lib/work-learning/schema";
import { getWorkLearningSkill } from "@/lib/work-learning/skill-registry";
import {
  hashWorkLearningSource,
  summarizeWorkLearningPrompt,
  summarizeWorkLearningResult,
} from "@/lib/work-learning/source";

export const maxDuration = 120;

const MAX_SOURCE_LENGTH = 60_000;

const analyzeSchema = z.object({
  text: z.string().trim().min(1).max(MAX_SOURCE_LENGTH),
  skillId: workLearningSkillIdSchema,
  sourceTitle: z.string().trim().max(200).optional(),
  targetStoryId: z.string().uuid().optional(),
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
    const parsed = analyzeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "作品学习输入无效",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    }

    const skill = getWorkLearningSkill(parsed.data.skillId);
    if (!skill) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "未知作品学习 Skill" } },
        { status: 400 },
      );
    }

    const targetStory = parsed.data.targetStoryId
      ? await fetchOwnedStoryContext(supabase, parsed.data.targetStoryId, user.id)
      : null;

    if (parsed.data.targetStoryId && !targetStory) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "目标故事不存在或无权访问" } },
        { status: 404 },
      );
    }

    const { effectivePlan } = await resolveEffectivePlan(supabase, user.id);
    const ledger = createCreditLedgerClient();
    const planProvider = AI_PLAN_PROVIDER[effectivePlan];
    const creditPreview = await resolveAICreditPreview({
      routeKey: "work_learning_analyze",
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
      routeKey: "work_learning_analyze",
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
      storyId: parsed.data.targetStoryId ?? null,
      provider: resolvedRoute.providerKey,
      model: resolvedRoute.modelAlias,
      mode: "work_learning_analyze",
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

    const sourceHash = hashWorkLearningSource(parsed.data.text);
    const sourceLength = parsed.data.text.length;
    const prompt = buildWorkLearningAnalysisPrompt({
      skill,
      text: parsed.data.text,
      sourceTitle: parsed.data.sourceTitle,
      targetStoryContext: targetStory?.context,
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
      const analysis = parseTechniqueCards(text, parsed.data.skillId);
      const resultSummary = summarizeWorkLearningResult({
        summary: analysis.summary,
        cardCount: analysis.cards.length,
        cardTitles: analysis.cards.map((card) => card.title),
      });
      const promptSummary = summarizeWorkLearningPrompt({
        skillId: parsed.data.skillId,
        sourceTitle: parsed.data.sourceTitle,
        sourceHash,
        sourceLength,
      });
      const artifact = deriveAIArtifactMetadata("work_learning_analyze");

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

      if (parsed.data.targetStoryId) {
        await logAIFinishPersistence("ai_generations", supabase.from("ai_generations").insert({
          user_id: user.id,
          story_id: parsed.data.targetStoryId,
          mode: "work_learning_analyze",
          prompt: promptSummary,
          context_entity_ids: [],
          model: resolvedRoute.modelAlias,
          result: resultSummary,
          tokens_used: (usage?.promptTokens ?? 0) + (usage?.completionTokens ?? 0),
          source: artifact.source,
          content_type: artifact.contentType,
          status: artifact.status,
        }));
      }

      return NextResponse.json({
        data: {
          summary: analysis.summary,
          cards: analysis.cards,
          sourceHash,
          sourceLength,
        },
      });
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
    const message = error instanceof Error ? error.message : "作品学习拆解失败";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}

async function fetchOwnedStoryContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storyId: string,
  userId: string,
): Promise<{ id: string; context: string } | null> {
  const { data, error } = await supabase
    .from("stories")
    .select("id, title, description, genre, era")
    .eq("id", storyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const story = data as {
    id: string;
    title?: string | null;
    description?: string | null;
    genre?: string | null;
    era?: string | null;
  };

  return {
    id: story.id,
    context: [
      `故事：${story.title ?? "未命名"}`,
      story.genre ? `类型：${story.genre}` : null,
      story.era ? `时代：${story.era}` : null,
      story.description ? `简介：${story.description}` : null,
    ].filter(Boolean).join("\n"),
  };
}
