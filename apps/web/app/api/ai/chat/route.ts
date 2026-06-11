import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateText,
  streamText,
  type LanguageModel,
  type LanguageModelUsage,
} from "ai";
import { prepareAIRouteCall } from "@/lib/ai/route-runtime";
import {
  CommunityAIConfigurationError,
  resolveCommunityAIModel,
} from "@/lib/ai/community-runtime";
import {
  createCreditLedgerClient,
  markAIUsageBillingFailed,
  refundAIUsageCredits,
  reserveAIUsageCredits,
  settleAIUsageCredits,
} from "@/lib/ai/credit-ledger";
import { normalizeAIError, serializeAIErrorForStream } from "@/lib/ai/ai-errors";
import {
  createBufferedTextDataStreamResponse,
  shouldUseBufferedChannelResponse,
} from "@/lib/ai/buffered-data-stream";
import { deriveAIArtifactMetadata } from "@/lib/ai/ai-generation-artifacts";
import { resolveScopedChapterId } from "@/lib/ai/chapter-scope";
import { logAIFinishPersistence } from "@/lib/ai/finish-persistence";
import { resolveEffectivePlan } from "@/lib/db/queries/plans";
import { buildEnhancedContext } from "@/lib/ai/context-builder";
import {
  AI_ROUTE_MAX_ABORT_AFTER_MS,
  AI_ROUTE_MAX_RETRIES,
  createAIRouteTimeout,
  resolveAIRouteAbortAfterMs,
} from "@/lib/ai/route-timeout";
import { isCommunityEdition } from "@/lib/edition";
import type { FocusPayload } from "@/types/ai";

export const maxDuration = 120;

export async function POST(request: Request) {
  const body = await request.json();
  const {
    messages,
    model: modelId,
    storyId,
    focusPayload,
  } = body as {
    messages: { role: "user" | "assistant"; content: string }[];
    model?: string;
    storyId?: string;
    focusPayload?: FocusPayload;
  };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "请先登录" } },
      { status: 401 },
    );
  }

  const ledger = createCreditLedgerClient();

  const requestStartedAt = Date.now();
  let reservation: { usageId: string } | null = null;
  let reservationFinalized = false;
  let providerChannelId: string | null = null;
  const refundReservation = async (reason: string, error?: unknown) => {
    if (!reservation || reservationFinalized) return;
    reservationFinalized = true;
    const normalized = error ? normalizeAIError(error) : null;
    await refundAIUsageCredits({
      supabase: ledger,
      usageId: reservation.usageId,
      userId: user.id,
      reason,
      latencyMs: Date.now() - requestStartedAt,
      providerChannelId,
      errorCode: normalized?.code ?? reason,
      errorMessage: normalized?.message ?? reason,
      telemetryMetadata: {
        failure_reason: reason,
        error_code: normalized?.code ?? null,
        error_message: normalized?.message ?? null,
      },
    });
  };

  try {
    let systemPrompt =
      "你是 SuperWriter 的 AI 创作助手。帮助用户进行小说创作、角色设计、情节规划等。请用中文回复。";
    let usageStoryId: string | null = null;
    let usageChapterId: string | null = null;
    let hasExtendedContext = false;

    if (storyId) {
      const { data: story } = await supabase
        .from("stories")
        .select("id, title, genre, era")
        .eq("id", storyId)
        .eq("user_id", user.id)
        .single();

      if (!story) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "故事不存在或无权访问" } },
          { status: 404 },
        );
      }

      const latestUserMessage = [...messages]
        .reverse()
        .find((message) => message.role === "user")?.content;
      const scopedChapter = await resolveScopedChapterId(
        supabase,
        storyId,
        focusPayload?.chapterId ?? null,
      );

      if (!scopedChapter.ok) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "章节不存在或不属于当前故事" } },
          { status: 400 },
        );
      }

      const effectiveFocusPayload: FocusPayload = {
        ...(focusPayload ?? { storyId }),
        storyId,
        chapterId: scopedChapter.chapterId,
      };
      const enhancedContext = await buildEnhancedContext(
        effectiveFocusPayload,
        latestUserMessage,
      );
      const promptParts = [
        systemPrompt,
        `当前故事：${story.title}（${story.genre ?? "未指定"}·${story.era ?? "未指定"}）`,
        enhancedContext.memoryPrompt,
        enhancedContext.focusPrompt,
      ].filter(Boolean);

      systemPrompt = promptParts.join("\n\n");
      usageStoryId = storyId;
      usageChapterId = scopedChapter.chapterId;
      hasExtendedContext = true;
    }

    if (isCommunityEdition()) {
      const communityRoute = await resolveCommunityAIModel({ userId: user.id });
      const communityTimeout = createAIRouteTimeout(AI_ROUTE_MAX_ABORT_AFTER_MS);
      const finalizeCommunityChat = async ({
        text,
        usage,
      }: {
        text: string;
        usage?: LanguageModelUsage;
      }) => {
        communityTimeout.clear();
        if (!text.trim()) {
          throw new Error("AI 服务已连接，但模型没有返回内容。请检查模型 ID 是否支持当前任务。");
        }
        const latestUserMessage = [...messages]
          .reverse()
          .find((message) => message.role === "user")?.content ?? "";
        const artifact = deriveAIArtifactMetadata("free_chat");

        if (usageStoryId) {
          await logAIFinishPersistence("ai_generations", supabase.from("ai_generations").insert({
            user_id: user.id,
            story_id: usageStoryId,
            chapter_id: usageChapterId,
            mode: "free_chat",
            prompt: latestUserMessage,
            context_entity_ids: [usageChapterId].filter(Boolean),
            model: communityRoute.modelAlias,
            result: text,
            tokens_used: (usage?.promptTokens ?? 0) + (usage?.completionTokens ?? 0),
            source: artifact.source,
            content_type: artifact.contentType,
            status: artifact.status,
          }));
        }
      };

      const result = streamText({
        model: communityRoute.model,
        system: systemPrompt,
        messages,
        abortSignal: communityTimeout.signal,
        maxRetries: AI_ROUTE_MAX_RETRIES,
        onError: () => {
          communityTimeout.clear();
        },
        onFinish: finalizeCommunityChat,
      });

      return result.toDataStreamResponse({
        getErrorMessage: serializeAIErrorForStream,
      });
    }

    const { effectivePlan } = await resolveEffectivePlan(supabase, user.id);
    const routeCall = await prepareAIRouteCall({
      routeKey: "free_chat",
      plan: effectivePlan,
      capability: "chat",
      callScope: "user_plan_scoped",
      requestedModelId: modelId,
      hasEnhancedContext: hasExtendedContext,
    });

    if (routeCall.status === "disabled") {
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
    if (routeCall.status === "budget_rejected") {
      return NextResponse.json(
        {
          error: {
            code: "AI_COST_BUDGET_EXCEEDED",
            message: "当前高级模型额度繁忙，请稍后再试。",
          },
        },
        { status: 429 },
      );
    }

    const { creditPreview, requestCost, estimatedCostCents, model, resolvedRoute, budgetDecision } = routeCall;
    providerChannelId = resolvedRoute.channelId;
    const routeAbortAfterMs = resolveAIRouteAbortAfterMs(resolvedRoute.fallbackPolicy);
    const reserveResult = await reserveAIUsageCredits({
      supabase: ledger,
      requestId: crypto.randomUUID(),
      userId: user.id,
      storyId: usageStoryId,
      provider: resolvedRoute.providerKey,
      model: resolvedRoute.modelAlias,
      mode: "free_chat",
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
    reservation = { usageId: reserveResult.usageId };

    const routeTimeout = createAIRouteTimeout(routeAbortAfterMs);
    const finalizeChat = async ({
      text,
      usage,
    }: {
      text: string;
      usage?: LanguageModelUsage;
    }) => {
      routeTimeout.clear();
      if (!reservation) {
        throw new Error("AI 调用记录处理失败");
      }
      if (!text.trim()) {
        const emptyOutputError = new Error("AI 服务已连接，但模型没有返回内容。请检查模型 ID 是否支持当前任务。");
        await refundReservation("provider_empty_output", emptyOutputError);
        throw emptyOutputError;
      }
      const latestUserMessage = [...messages]
        .reverse()
        .find((message) => message.role === "user")?.content ?? "";
      const artifact = deriveAIArtifactMetadata("free_chat");

      try {
        await settleAIUsageCredits({
          supabase: ledger,
          usageId: reservation.usageId,
          userId: user.id,
          inputTokens: usage?.promptTokens ?? 0,
          outputTokens: usage?.completionTokens ?? 0,
          latencyMs: Date.now() - requestStartedAt,
          estimatedCostCents,
          providerChannelId,
          telemetryMetadata: { finish_state: "settled" },
        });
      } catch (error) {
        await markAIUsageBillingFailed({
          supabase: ledger,
          usageId: reservation.usageId,
          userId: user.id,
          reason: "settlement_failed",
          latencyMs: Date.now() - requestStartedAt,
          providerChannelId,
          telemetryMetadata: { failure_reason: "settlement_failed" },
        }).catch((markError) => {
          console.error("AI credit failure marking failed", markError);
        });
        reservationFinalized = true;
        throw error;
      }
      reservationFinalized = true;

      if (usageStoryId) {
        await logAIFinishPersistence("ai_generations", supabase.from("ai_generations").insert({
          user_id: user.id,
          story_id: usageStoryId,
          chapter_id: usageChapterId,
          mode: "free_chat",
          prompt: latestUserMessage,
          context_entity_ids: [usageChapterId].filter(Boolean),
          model: resolvedRoute.modelAlias,
          result: text,
          tokens_used: (usage?.promptTokens ?? 0) + (usage?.completionTokens ?? 0),
          source: artifact.source,
          content_type: artifact.contentType,
          status: artifact.status,
        }));
      }
    };

    if (shouldUseBufferedChannelResponse(resolvedRoute)) {
      try {
        const result = await generateText({
          model: model as LanguageModel,
          system: systemPrompt,
          messages,
          abortSignal: routeTimeout.signal,
          maxRetries: AI_ROUTE_MAX_RETRIES,
        });
        routeTimeout.clear();
        await finalizeChat({ text: result.text, usage: result.usage });
        return createBufferedTextDataStreamResponse({
          text: result.text,
          usage: result.usage,
          getErrorMessage: serializeAIErrorForStream,
        });
      } catch (error) {
        routeTimeout.clear();
        throw error;
      }
    }

    const result = streamText({
      model: model as LanguageModel,
      system: systemPrompt,
      messages,
      abortSignal: routeTimeout.signal,
      maxRetries: AI_ROUTE_MAX_RETRIES,
      onError: ({ error }) => {
        routeTimeout.clear();
        void refundReservation("provider_stream_error", error).catch((error) => {
          console.error("AI credit refund failed", error);
        });
      },
      onFinish: finalizeChat,
    });

    return result.toDataStreamResponse({
      getErrorMessage: serializeAIErrorForStream,
    });
  } catch (error) {
    if (error instanceof CommunityAIConfigurationError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: 400 },
      );
    }
    await refundReservation("provider_error", error).catch((refundError) => {
      console.error("AI credit refund failed", refundError);
    });
    const normalized = normalizeAIError(error);
    const status =
      normalized.code === "UNAUTHORIZED"
        ? 401
        : normalized.code === "QUOTA_EXCEEDED"
          ? 429
          : 500;

    return NextResponse.json(
      { error: normalized },
      { status },
    );
  }
}
