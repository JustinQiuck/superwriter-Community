import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateText,
  streamText,
  type LanguageModel,
  type LanguageModelUsage,
} from "ai";
import {
  CHARACTER_GENERATE_PROMPT,
  CHAPTER_CONTINUE_PROMPT,
  CONSISTENCY_CHECK_PROMPT,
  DIALOGUE_GENERATE_PROMPT,
  SENSORY_EXPANSION_PROMPT,
  INFO_TRACKING_PROMPT,
} from "@/lib/ai/prompts";
import {
  BLUEPRINT_GENERATE_PROMPT,
  BLUEPRINT_EXPAND_PROMPT,
  BEAT_SUGGEST_PROMPT,
  STORY_SYNOPSIS_CANDIDATES_PROMPT,
  STORY_OUTLINE_PROMPT,
  STORY_ASSET_NEEDS_PROMPT,
  BLUEPRINT_REVERSE_SYNC_PROMPT,
} from "@/lib/ai/prompts/blueprint-prompts";
import type { AIMode } from "@superwriter/shared";
import {
  buildAIContext,
  buildEnhancedContext,
  buildMemoryContext,
  formatMemoryForPrompt,
} from "@/lib/ai/context-builder";
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
import { estimateAIUsageCostCents } from "@/lib/ai/cost-estimate";
import { deriveAIArtifactMetadata } from "@/lib/ai/ai-generation-artifacts";
import { runConsistencyCheck } from "@/lib/ai/consistency/checker";
import { shouldRunBundledConsistencyCheck } from "@/lib/ai/consistency/rules";
import {
  resolveScopedChapterId,
  resolveScopedEntityIds,
} from "@/lib/ai/chapter-scope";
import { logAIFinishPersistence } from "@/lib/ai/finish-persistence";
import { fillTemplate } from "@/lib/ai/template-engine";
import { resolveEffectivePlan } from "@/lib/db/queries/plans";
import { createConsistencyFindings } from "@/lib/db/queries/consistency-findings";
import { hasMeaningfulChapterCompletionPrompt } from "@/lib/writing/chapter-completion";
import {
  resolveAIModeCapability,
  type ResolvedAIModelRoute,
} from "@/lib/ai/model-registry";
import { getModel } from "@/lib/ai/providers";
import {
  AI_ROUTE_MAX_ABORT_AFTER_MS,
  AI_ROUTE_MAX_RETRIES,
  createAIRouteTimeout,
  resolveAIRouteAbortAfterMs,
} from "@/lib/ai/route-timeout";
import { isCommunityEdition } from "@/lib/edition";
import type { FocusPayload } from "@/types/ai";

export const maxDuration = 120;

const CONTRACT_FIRST_MODES = new Set<AIMode>([
  "synopsis_candidates",
]);

const DEFAULT_USER_PROMPTS: Partial<Record<AIMode, string>> = {
  synopsis_candidates: "请根据故事契约生成 3 个简介候选。",
};

const DEFAULT_AI_MAX_TOKENS = 1_600;
const AI_MODE_MAX_TOKENS: Partial<Record<AIMode, number>> = {
  synopsis_candidates: 1_600,
  story_outline_generate: 1_800,
  story_asset_needs: 1_400,
  blueprint_generate: 1_800,
  blueprint_expand: 2_000,
  blueprint_reverse_sync: 1_400,
  beat_suggest: 1_200,
  chapter_continue: 2_000,
  chapter_rewrite: 1_600,
  sensory_expand: 1_400,
  character_dialogue: 1_400,
  conflict_intensify: 1_400,
  pacing_tighten: 1_200,
  hook_boost: 1_200,
  character_generate: 1_200,
  location_generate: 1_200,
  event_suggest: 1_200,
  relationship_suggest: 1_200,
};

export async function POST(request: Request) {
  const body = await request.json();
  const {
    mode,
    storyId,
    prompt,
    model: modelId,
    chapterId,
    characterIds,
    locationIds,
    focusPayload,
  } = body as {
    mode: AIMode;
    storyId: string;
    prompt?: string;
    model?: string;
    chapterId?: string;
    characterIds?: string[];
    locationIds?: string[];
    focusPayload?: FocusPayload;
  };

  if (mode === "chapter_completion_review" && !hasMeaningfulChapterCompletionPrompt(prompt)) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "完章检查需要当前章节正文。",
        },
      },
      { status: 400 },
    );
  }

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
    const storyRes = await supabase
      .from("stories")
      .select("genre, era, title")
      .eq("id", storyId)
      .eq("user_id", user.id)
      .single();
    const story = storyRes.data;

    if (!story) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "故事不存在或无权访问" } },
        { status: 404 },
      );
    }

    const requestedChapterId = focusPayload?.chapterId ?? chapterId ?? null;
    const scopedChapter = await resolveScopedChapterId(
      supabase,
      storyId,
      requestedChapterId,
    );

    if (!scopedChapter.ok) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "章节不存在或不属于当前故事" } },
        { status: 400 },
      );
    }

    const scopedChapterId = scopedChapter.chapterId;
    const scopedCharacters = await resolveScopedEntityIds(
      supabase,
      storyId,
      characterIds,
      "character",
    );
    const scopedLocations = await resolveScopedEntityIds(
      supabase,
      storyId,
      locationIds,
      "location",
    );

    if (!scopedCharacters.ok || !scopedLocations.ok) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "角色或地点不存在，或不属于当前故事" } },
        { status: 400 },
      );
    }

    const scopedCharacterIds = scopedCharacters.entityIds;
    const scopedLocationIds = scopedLocations.entityIds;
    const effectiveFocusPayload = focusPayload
      ? {
          ...focusPayload,
          storyId,
          chapterId: scopedChapterId,
        }
      : null;

    const enhancedContext = effectiveFocusPayload
      ? await buildEnhancedContext(effectiveFocusPayload, prompt)
      : null;

    const aiContext = enhancedContext
      ? enhancedContext.aiContext
      : await buildAIContext({
          storyId,
          chapterId: scopedChapterId ?? undefined,
          characterIds: scopedCharacterIds,
          locationIds: scopedLocationIds,
        });

    let systemPrompt = "你是一位专业的小说创作助手。";
    const userPrompt = prompt?.trim() || DEFAULT_USER_PROMPTS[mode] || "";

    const includeMemoryPrompt = !CONTRACT_FIRST_MODES.has(mode);
    const memoryContext = includeMemoryPrompt
      ? enhancedContext?.memoryContext ?? (await buildMemoryContext(storyId, prompt))
      : null;
    const memoryPrompt = memoryContext && memoryContext.totalTokensUsed > 0
      ? enhancedContext?.memoryPrompt ?? formatMemoryForPrompt(memoryContext)
      : "";

    switch (mode) {
      case "character_generate": {
        systemPrompt = fillTemplate(CHARACTER_GENERATE_PROMPT, {
          user_input: userPrompt || "请根据故事背景生成一个角色",
          story_genre: story?.genre ?? "未指定",
          story_era: story?.era ?? "未指定",
        });
        break;
      }
      case "chapter_continue": {
        const blueprintBeat = enhancedContext?.blueprintContext?.currentBeat ?? null;
        systemPrompt = fillTemplate(CHAPTER_CONTINUE_PROMPT, {
          previous_summary:
            aiContext.timelineContext?.previousEvents?.join("；") ?? "",
          current_content: aiContext.currentContent ?? "",
          characters_summary: (aiContext.relevantCharacters ?? [])
            .map((c) => `${c.name}：${c.briefDescription}`)
            .join("\n"),
          timeline_context: aiContext.timelineContext?.currentDate ?? "",
          style_profile: aiContext.styleProfile?.tone ?? "自然流畅",
          beat_target: blueprintBeat?.description ?? "推进故事",
          emotion_target: String(blueprintBeat?.emotion_target ?? 0),
          scene_goal: aiContext.currentChapter?.summary ?? "完成当前场景",
          ending_hook: blueprintBeat?.synopsis ?? "自然的章节收尾",
          target_word_count: "2000",
          pov: aiContext.styleProfile?.pov ?? "第三人称有限",
        });
        break;
      }
      case "consistency_check":
        systemPrompt = fillTemplate(CONSISTENCY_CHECK_PROMPT, {
          character_data: (aiContext.relevantCharacters ?? [])
            .map((c) => `角色名：${c.name}\n设定：${c.briefDescription ?? "无"}`)
            .join("\n\n"),
          relationships: (aiContext.relevantCharacters ?? [])
            .flatMap((c) => (c.relationships ?? []).map((r) => `${c.name} → ${r.name}：${r.type}`))
            .join("\n"),
          timeline: (aiContext.timelineContext?.previousEvents ?? []).join("\n"),
          text_to_check: aiContext.currentContent ?? "",
        });
        break;
      case "character_dialogue":
        systemPrompt = fillTemplate(DIALOGUE_GENERATE_PROMPT, {
          scene_description: userPrompt || "当前场景",
          characters: (aiContext.relevantCharacters ?? [])
            .map((c) => `${c.name}：${c.briefDescription}`)
            .join("\n"),
          dialogue_purpose: "推进情节并揭示角色性格",
          style_profile: aiContext.styleProfile?.tone ?? "自然流畅",
        });
        break;
      case "sensory_expand":
        systemPrompt = fillTemplate(SENSORY_EXPANSION_PROMPT, {
          original_text: aiContext.currentContent ?? "",
          scene_environment: (aiContext.relevantLocations ?? [])
            .map((l) => `${l.name}：${JSON.stringify(l.sensoryDetails)}`)
            .join("\n"),
          characters_present: (aiContext.relevantCharacters ?? [])
            .map((c) => `${c.name}：${c.briefDescription}`)
            .join("\n"),
          era: story?.era ?? "未指定",
        });
        break;
      case "information_track":
        systemPrompt = fillTemplate(INFO_TRACKING_PROMPT, {
          text: aiContext.currentContent ?? "",
          known_info: (aiContext.relevantCharacters ?? [])
            .map((c) => {
              const knows = c.knownInformation ?? [];
              return `${c.name} 已知信息：${knows.join("；") || "无"}`;
            })
            .join("\n"),
        });
        break;
      case "outline_generate":
        systemPrompt = `你是小说大纲规划专家。帮助用户创建和优化故事大纲。故事 ID: ${storyId}`;
        break;
      case "location_generate":
        systemPrompt = `你是小说场景/地点设计专家。根据简短描述生成丰富的地点设定。输出 JSON 格式。`;
        break;
      case "event_suggest":
        systemPrompt = `你是小说情节设计专家。根据已有设定建议有趣的情节点和事件转折。`;
        break;
      case "relationship_suggest":
        systemPrompt = `你是小说角色关系设计专家。分析角色性格，建议有戏剧张力的角色关系。`;
        break;
      case "free_chat":
        systemPrompt = `你是 SuperWriter 的 AI 创作助手。帮助用户进行小说创作。故事 ID: ${storyId}`;
        break;
      case "chapter_rewrite":
        systemPrompt = `你是小说润色专家。请改写用户提供的段落，提升文采和表现力。保持原文核心意思不变。`;
        break;
      case "conflict_intensify":
        systemPrompt = "你是网文情节强化编辑。请保留原意，增加阻力、冲突、压迫感和读者期待。只输出正文。";
        break;
      case "pacing_tighten":
        systemPrompt = "你是网文节奏编辑。请压缩拖沓解释，保留必要信息，让阅读节奏更快。只输出正文。";
        break;
      case "hook_boost":
        systemPrompt = "你是网文爽点和钩子编辑。请在不脱离本章目标的前提下，增强段落的期待感、反转或爽点。只输出正文。";
        break;
      case "voice_check":
        systemPrompt = "你是角色口吻检查编辑。请检查角色说话是否符合设定，指出问题并给出替换句。";
        break;
      case "chapter_drift_check":
        systemPrompt = "你是网文章节目标检查编辑。请对照本章目标检查当前内容是否跑偏，并给出最小修正建议。";
        break;
      case "chapter_completion_review":
        systemPrompt = "你是网文连载责编。请检查本章是否完成目标，列出发布前最小修改建议，并给出下一章开头准备。输出分为：本章完成度、需要补写、下一章钩子。";
        break;
      case "foreshadowing_check":
        systemPrompt = "你是网文伏笔检查编辑。请检查当前章节是否遗漏应交代的伏笔、线索或设定信息，并给出补写建议。";
        break;
      case "synopsis_candidates":
        systemPrompt = fillTemplate(STORY_SYNOPSIS_CANDIDATES_PROMPT, {
          genre: body.workflow?.contract?.genre ?? story?.genre ?? "未指定",
          tone: body.workflow?.contract?.tone ?? "未指定",
          target_reader: body.workflow?.contract?.targetReader ?? "未指定",
          reader_promise: body.workflow?.contract?.readerPromise ?? "未指定",
          core_hook: body.workflow?.contract?.coreHook ?? "未指定",
          protagonist_seed: body.workflow?.contract?.protagonistSeed ?? "未指定",
          protagonist_want: body.workflow?.contract?.protagonistWant ?? "未指定",
          protagonist_flaw: body.workflow?.contract?.protagonistFlaw ?? "未指定",
          opposition_force: body.workflow?.contract?.oppositionForce ?? "未指定",
          central_conflict: body.workflow?.contract?.centralConflict ?? "未指定",
          stakes: body.workflow?.contract?.stakes ?? "未指定",
          story_question: body.workflow?.contract?.storyQuestion ?? "未指定",
          ending_direction: body.workflow?.contract?.endingDirection ?? "未指定",
          mice_type: body.workflow?.contract?.miceType ?? "event",
          constraints: Array.isArray(body.workflow?.contract?.constraints)
            ? body.workflow.contract.constraints.join("、")
            : "无",
          comparable_works: Array.isArray(body.workflow?.contract?.comparableWorks)
            ? body.workflow.contract.comparableWorks.join("、")
            : "无",
        });
        break;
      case "story_outline_generate":
        systemPrompt = fillTemplate(STORY_OUTLINE_PROMPT, {
          synopsis: body.synopsis ?? "",
          structure_template: body.structureTemplate ?? "three_act",
          genre: body.workflow?.contract?.genre ?? story?.genre ?? "未指定",
          target_reader: body.workflow?.contract?.targetReader ?? "未指定",
          reader_promise: body.workflow?.contract?.readerPromise ?? "未指定",
          core_hook: body.workflow?.contract?.coreHook ?? "未指定",
          central_conflict: body.workflow?.contract?.centralConflict ?? "未指定",
          stakes: body.workflow?.contract?.stakes ?? "未指定",
          ending_direction: body.workflow?.contract?.endingDirection ?? "未指定",
          mice_type: body.workflow?.contract?.miceType ?? "event",
        });
        break;
      case "story_asset_needs":
        systemPrompt = fillTemplate(STORY_ASSET_NEEDS_PROMPT, {
          synopsis: body.synopsis ?? "",
          outline_json: JSON.stringify(body.workflow?.outline ?? []),
        });
        break;
      case "blueprint_reverse_sync":
        systemPrompt = fillTemplate(BLUEPRINT_REVERSE_SYNC_PROMPT, {
          workflow_json: JSON.stringify(body.workflow ?? {}),
          draft_text: prompt ?? "",
        });
        break;
      case "blueprint_generate":
        systemPrompt = fillTemplate(BLUEPRINT_GENERATE_PROMPT, {
          story_synopsis: prompt ?? "",
          story_genre: story?.genre ?? "未指定",
          story_era: story?.era ?? "未指定",
          template_structure: body.templateStructure ?? "三幕式结构",
          existing_characters: (aiContext.relevantCharacters ?? [])
            .map((c) => c.name)
            .join("、") || "暂无角色",
        });
        break;
      case "blueprint_expand":
        systemPrompt = fillTemplate(BLUEPRINT_EXPAND_PROMPT, {
          synopsis: body.synopsis ?? "",
          beat_list: body.beatList ?? "[]",
          existing_characters: (aiContext.relevantCharacters ?? [])
            .map((c) => `${c.name}：${c.briefDescription ?? ""}`)
            .join("\n") || "暂无",
          existing_locations: (aiContext.relevantLocations ?? [])
            .map((l) => l.name)
            .join("、") || "暂无",
        });
        break;
      case "beat_suggest":
        systemPrompt = fillTemplate(BEAT_SUGGEST_PROMPT, {
          beat_title: body.beatTitle ?? "",
          beat_description: body.beatDescription ?? "",
          emotion_target: String(body.emotionTarget ?? 0),
          beat_type: body.beatType ?? "custom",
          previous_beat: body.previousBeat ?? "无",
          next_beat: body.nextBeat ?? "无",
          available_characters: (aiContext.relevantCharacters ?? [])
            .map((c) => c.name)
            .join("、") || "暂无",
          available_locations: (aiContext.relevantLocations ?? [])
            .map((l) => l.name)
            .join("、") || "暂无",
        });
        break;
      case "deviation_suggest":
        systemPrompt = "你是小说创作顾问。根据偏差检测结果，给出具体的修复建议。";
        break;
      default:
        systemPrompt = "你是小说创作助手，帮助用户创作故事。";
    }

    const promptParts = [systemPrompt, memoryPrompt, enhancedContext?.focusPrompt].filter(Boolean);
    const finalSystemPrompt = promptParts.join("\n\n");
    const maxTokens = resolveAIMaxTokens(mode);

    if (isCommunityEdition()) {
      const communityRoute = await resolveCommunityAIModel({ userId: user.id });
      const communityTimeout = createAIRouteTimeout(AI_ROUTE_MAX_ABORT_AFTER_MS);
      const finalizeCommunityGeneration = async ({
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
        const artifact = deriveAIArtifactMetadata(mode);
        const generationChapterId = effectiveFocusPayload?.chapterId ?? scopedChapterId;
        const generationId = crypto.randomUUID();
        const generationPersisted = await logAIFinishPersistence("ai_generations", supabase.from("ai_generations").insert({
          id: generationId,
          user_id: user.id,
          story_id: storyId,
          chapter_id: generationChapterId,
          mode,
          prompt: userPrompt,
          context_entity_ids: [
            generationChapterId,
            ...scopedCharacterIds,
            ...scopedLocationIds,
          ].filter(Boolean),
          model: communityRoute.modelAlias,
          result: text,
          tokens_used: (usage?.promptTokens ?? 0) + (usage?.completionTokens ?? 0),
          source: artifact.source,
          content_type: artifact.contentType,
          status: artifact.status,
        }));

        if (
          generationPersisted &&
          memoryContext &&
          text.trim() &&
          shouldRunBundledConsistencyCheck(mode)
        ) {
          try {
            const findings = await runConsistencyCheck({
              storyId,
              chapterId: generationChapterId,
              sourceType: "ai_generation",
              sourceId: generationId,
              sourceRouteKey: mode,
              sourceRef: `AI 生成：${mode}`,
              generatedText: text,
              memoryContext,
            });
            await createConsistencyFindings(supabase, findings);
          } catch (error) {
            console.error("AI consistency check persistence failed", error);
          }
        }
      };

      const result = streamText({
        model: communityRoute.model,
        system: finalSystemPrompt,
        prompt: userPrompt,
        abortSignal: communityTimeout.signal,
        maxRetries: AI_ROUTE_MAX_RETRIES,
        maxTokens,
        onError: () => {
          communityTimeout.clear();
        },
        onFinish: finalizeCommunityGeneration,
      });

      return result.toDataStreamResponse({
        getErrorMessage: serializeAIErrorForStream,
      });
    }

    const { effectivePlan } = await resolveEffectivePlan(supabase, user.id);
    const routeCall = await prepareAIRouteCall({
      routeKey: mode,
      plan: effectivePlan,
      capability: resolveAIModeCapability(mode),
      callScope: "user_plan_scoped",
      requestedModelId: modelId,
      hasEnhancedContext: Boolean(enhancedContext),
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

    const {
      creditPreview,
      requestCost,
      estimatedCostCents: initialEstimatedCostCents,
      model,
      resolvedRoute,
      budgetDecision,
    } = routeCall;
    let activeRoute: ResolvedAIModelRoute = resolvedRoute;
    let activeEstimatedCostCents = initialEstimatedCostCents;
    let routeAbortAfterMs = resolveAIRouteAbortAfterMs(activeRoute.fallbackPolicy);

    const reserveUsageForRoute = async ({
      route,
      routeTimeoutMs,
      estimatedCostCents,
      fallbackReason,
      primaryError,
    }: {
      route: ResolvedAIModelRoute;
      routeTimeoutMs: number;
      estimatedCostCents: number;
      fallbackReason: string | null;
      primaryError?: unknown;
    }) => {
      providerChannelId = route.channelId;
      const normalizedPrimaryError = primaryError ? normalizeAIError(primaryError) : null;
      const result = await reserveAIUsageCredits({
        supabase: ledger,
        requestId: crypto.randomUUID(),
        userId: user.id,
        storyId,
        provider: route.providerKey,
        model: route.modelAlias,
        mode,
        routeKey: creditPreview.routeKey,
        creditsCost: requestCost,
        billingReason: creditPreview.chargeBehavior,
        modelConfigId: route.modelConfigId,
        routeConfigId: route.routeConfigId,
        planKey: effectivePlan,
        routeSource: route.source,
        callScope: route.callScope,
        priceTier: creditPreview.priceTier,
        contextTier: creditPreview.contextTier,
        modelCostTier: route.modelCostTier,
        modelQualityTier: route.modelQualityTier,
        modelContextTier: route.modelContextTier,
        isFallback: route.source === "database-fallback",
        fallbackReason,
        estimatedCostCents,
        budgetAction: budgetDecision.degradeAction,
        budgetReason: budgetDecision.reason,
        telemetryMetadata: {
          fallback_mode: route.fallbackPolicy?.fallbackMode ?? null,
          route_timeout_ms: routeTimeoutMs,
          max_tokens: maxTokens,
          primary_error_code: normalizedPrimaryError?.code ?? null,
          primary_error_message: normalizedPrimaryError?.message ?? null,
        },
      });
      if (result.ok) {
        reservation = { usageId: result.usageId };
        reservationFinalized = false;
      }
      return result;
    };

    const reserveResult = await reserveUsageForRoute({
      route: activeRoute,
      routeTimeoutMs: routeAbortAfterMs,
      estimatedCostCents: activeEstimatedCostCents,
      fallbackReason: activeRoute.source === "database-fallback"
        ? "primary_unavailable_or_not_entitled"
        : null,
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

    let routeTimeout = createAIRouteTimeout(routeAbortAfterMs);
    const finalizeGeneration = async ({
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
      const artifact = deriveAIArtifactMetadata(mode);
      const generationChapterId = effectiveFocusPayload?.chapterId ?? scopedChapterId;

      try {
        await settleAIUsageCredits({
          supabase: ledger,
          usageId: reservation.usageId,
          userId: user.id,
          inputTokens: usage?.promptTokens ?? 0,
          outputTokens: usage?.completionTokens ?? 0,
          latencyMs: Date.now() - requestStartedAt,
          estimatedCostCents: activeEstimatedCostCents,
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

      const generationId = crypto.randomUUID();
      const generationPersisted = await logAIFinishPersistence("ai_generations", supabase.from("ai_generations").insert({
        id: generationId,
        user_id: user.id,
        story_id: storyId,
        chapter_id: generationChapterId,
        mode,
        prompt: userPrompt,
        context_entity_ids: [
          generationChapterId,
          ...scopedCharacterIds,
          ...scopedLocationIds,
        ].filter(Boolean),
        model: activeRoute.modelAlias,
        result: text,
        tokens_used: (usage?.promptTokens ?? 0) + (usage?.completionTokens ?? 0),
        source: artifact.source,
        content_type: artifact.contentType,
        status: artifact.status,
      }));

      if (
        generationPersisted &&
        memoryContext &&
        text.trim() &&
        shouldRunBundledConsistencyCheck(mode)
      ) {
        try {
          const findings = await runConsistencyCheck({
            storyId,
            chapterId: generationChapterId,
            sourceType: "ai_generation",
            sourceId: generationId,
            sourceRouteKey: mode,
            sourceRef: `AI 生成：${mode}`,
            generatedText: text,
            memoryContext,
          });
          await createConsistencyFindings(supabase, findings);
        } catch (error) {
          console.error("AI consistency check persistence failed", error);
        }
      }
    };

    if (shouldUseBufferedChannelResponse(resolvedRoute)) {
      const generateBuffered = (languageModel: LanguageModel) =>
        generateText({
          model: languageModel,
          system: finalSystemPrompt,
          prompt: userPrompt,
          abortSignal: routeTimeout.signal,
          maxRetries: AI_ROUTE_MAX_RETRIES,
          maxTokens,
        });

      let result;
      try {
        result = await generateBuffered(model as LanguageModel);
      } catch (error) {
        routeTimeout.clear();
        const fallbackRoute = activeRoute.runtimeFallbackRoute ?? null;
        if (!fallbackRoute) throw error;

        await refundReservation("provider_primary_error", error);
        reservation = null;
        reservationFinalized = false;
        activeRoute = fallbackRoute;
        activeEstimatedCostCents = estimateAIUsageCostCents({
          providerKey: activeRoute.providerKey,
          priceTier: creditPreview.priceTier,
          creditsCost: requestCost,
          channelCostTier: activeRoute.channelCostTier,
        });
        routeAbortAfterMs = resolveFallbackRouteAbortAfterMs(activeRoute.fallbackPolicy);

        const fallbackReserveResult = await reserveUsageForRoute({
          route: activeRoute,
          routeTimeoutMs: routeAbortAfterMs,
          estimatedCostCents: activeEstimatedCostCents,
          fallbackReason: "primary_provider_error",
          primaryError: error,
        });
        if (!fallbackReserveResult.ok) {
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

        routeTimeout = createAIRouteTimeout(routeAbortAfterMs);
        try {
          result = await generateBuffered(getModel(activeRoute) as LanguageModel);
        } catch (fallbackError) {
          routeTimeout.clear();
          throw fallbackError;
        }
      }
      routeTimeout.clear();
      await finalizeGeneration({ text: result.text, usage: result.usage });
      return createBufferedTextDataStreamResponse({
        text: result.text,
        usage: result.usage,
        getErrorMessage: serializeAIErrorForStream,
      });
    }

    const result = streamText({
      model: model as LanguageModel,
      system: finalSystemPrompt,
      prompt: userPrompt,
      abortSignal: routeTimeout.signal,
      maxRetries: AI_ROUTE_MAX_RETRIES,
      maxTokens,
      onError: ({ error }) => {
        routeTimeout.clear();
        void refundReservation("provider_stream_error", error).catch((error) => {
          console.error("AI credit refund failed", error);
        });
      },
      onFinish: finalizeGeneration,
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

function resolveFallbackRouteAbortAfterMs(
  policy: ResolvedAIModelRoute["fallbackPolicy"],
): number {
  const configured = policy?.fallbackTimeoutMs;
  if (typeof configured === "number" && Number.isFinite(configured)) {
    return Math.min(
      AI_ROUTE_MAX_ABORT_AFTER_MS,
      Math.max(1_000, Math.round(configured)),
    );
  }
  return resolveAIRouteAbortAfterMs(policy);
}

function resolveAIMaxTokens(mode: AIMode): number {
  return AI_MODE_MAX_TOKENS[mode] ?? DEFAULT_AI_MAX_TOKENS;
}
