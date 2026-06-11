import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateText, type LanguageModel } from "ai";
import { AI_PLAN_PROVIDER } from "@superwriter/shared";
import { getModel } from "@/lib/ai/providers";
import { resolveAIModelRoute } from "@/lib/ai/model-registry";
import { resolveAICreditPreview } from "@/lib/ai/credit-policy";
import { estimateAIUsageCostCents } from "@/lib/ai/cost-estimate";
import { resolveAICostBudgetDecision } from "@/lib/ai/cost-budget";
import { logAIFinishPersistence } from "@/lib/ai/finish-persistence";
import {
  createCreditLedgerClient,
  refundAIUsageCredits,
  reserveAIUsageCredits,
  settleAIUsageCredits,
} from "@/lib/ai/credit-ledger";
import { fillTemplate } from "@/lib/ai/template-engine";
import { DEVIATION_SUGGEST_PROMPT } from "@/lib/ai/prompts/deviation-prompts";
import { updateDeviationSuggestion } from "@/lib/db/queries/deviations";
import { addRecallMemory } from "@/lib/db/queries/memories";
import { buildEnhancedContext } from "@/lib/ai/context-builder";
import { resolveEffectivePlan } from "@/lib/db/queries/plans";
import { z } from "zod";

const suggestSchema = z.object({
  storyId: z.string().uuid(),
  reportId: z.string().uuid(),
  deviationType: z.string(),
  blueprintValue: z.string(),
  actualValue: z.string(),
  focusPayload: z.object({
    storyId: z.string().uuid(),
    chapterId: z.string().uuid().nullable().optional(),
    beatId: z.string().uuid().nullable().optional(),
    cursorContext: z.object({
      before: z.string(),
      after: z.string(),
      currentParagraph: z.string(),
    }).nullable().optional(),
  }).optional(),
});

export async function POST(request: Request) {
  const requestStartedAt = Date.now();
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = suggestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 },
      );
    }

    const { storyId, reportId, deviationType, blueprintValue, actualValue, focusPayload } = parsed.data;
    const { effectivePlan } = await resolveEffectivePlan(supabase, user.id);
    const ledger = createCreditLedgerClient();
    const planProvider = AI_PLAN_PROVIDER[effectivePlan];

    const typeLabels: Record<string, string> = {
      emotion: "情绪偏差",
      character_absence: "角色缺席",
      pacing: "节奏偏差",
      setting_contradiction: "设定矛盾",
    };

    const { data: story } = await supabase
      .from("stories")
      .select("title, genre")
      .eq("id", storyId)
      .eq("user_id", user.id)
      .single();

    if (!story) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Story not found or access denied" } },
        { status: 403 },
      );
    }

    const enhancedContext = focusPayload
      ? await buildEnhancedContext({ ...focusPayload, storyId }, actualValue)
      : null;
    const storyContext = [
      `故事「${story.title}」（${story.genre}）`,
      enhancedContext?.focusPrompt,
      enhancedContext?.memoryPrompt,
    ].filter(Boolean).join("\n\n");

    const creditPreview = await resolveAICreditPreview({
      routeKey: "deviation_suggestion",
      plan: effectivePlan,
      provider: planProvider,
      hasEnhancedContext: Boolean(enhancedContext),
    });
    const budgetDecision = await resolveAICostBudgetDecision({
      plan: effectivePlan,
      estimatedCostCents: estimateAIUsageCostCents({
        providerKey: planProvider,
        priceTier: creditPreview.priceTier,
        creditsCost: creditPreview.creditsCost,
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
      routeKey: "deviation_suggestion",
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
      creditsCost: creditPreview.creditsCost,
    });
    const reserveResult = await reserveAIUsageCredits({
      supabase: ledger,
      requestId: crypto.randomUUID(),
      userId: user.id,
      storyId,
      provider: resolvedRoute.providerKey,
      model: resolvedRoute.modelAlias,
      mode: "deviation_suggestion",
      routeKey: creditPreview.routeKey,
      creditsCost: creditPreview.creditsCost,
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

    let suggestion = "";
    try {
      const result = await generateText({
        model: model as LanguageModel,
        prompt: fillTemplate(DEVIATION_SUGGEST_PROMPT, {
          deviation_type: typeLabels[deviationType] ?? deviationType,
          blueprint_value: blueprintValue,
          actual_value: actualValue,
          story_context: storyContext,
        }),
      });
      suggestion = result.text;

      await settleAIUsageCredits({
        supabase: ledger,
        usageId: reserveResult.usageId,
        userId: user.id,
        inputTokens: result.usage?.promptTokens ?? 0,
        outputTokens: result.usage?.completionTokens ?? 0,
        latencyMs: Date.now() - requestStartedAt,
        estimatedCostCents,
        providerChannelId: resolvedRoute.channelId,
        telemetryMetadata: { finish_state: "settled" },
      });
      await logAIFinishPersistence(
        "story_deviation_reports",
        updateDeviationSuggestion(reportId, suggestion, storyId),
      );
      await addRecallMemory(storyId, "ai_interaction", `AI建议修复${typeLabels[deviationType] ?? "偏差"}`, {
        reportId,
        deviationType,
      }).catch(() => {});
    } catch (error) {
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

    return NextResponse.json({ data: { suggestion } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Suggestion generation failed";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
