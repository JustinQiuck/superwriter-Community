import { createClient } from "@/lib/supabase/server";
import type { AIContext, FocusPayload } from "@/types/ai";
import type { BlueprintBeat } from "@/types/entity";
import {
  getCoreMemory,
  searchArchivalMemory,
  getRecentRecallMemories,
} from "@/lib/db/queries/memories";
import { getGenreProfile } from "@/lib/db/queries/genre-profiles";
import { embedText, estimateTokens } from "@/lib/ai/embedding";
import {
  getBlueprintWorkflowContext,
  type BlueprintWorkflowContext,
} from "@/lib/blueprint/workflow-context";
import type { MemoryContext } from "@/types/memory";

interface ContextBuilderInput {
  storyId: string;
  chapterId?: string;
  characterIds?: string[];
  locationIds?: string[];
}

export async function buildAIContext(
  input: ContextBuilderInput
): Promise<Partial<AIContext>> {
  const supabase = await createClient();
  const { storyId, chapterId, characterIds, locationIds } = input;

  const context: Partial<AIContext> = {};

  const [chapterResult, relationshipsResult, timelineResult] =
    await Promise.all([
      // 当前章节
      chapterId
        ? supabase.from("entities").select("*").eq("story_id", storyId).eq("id", chapterId).single()
        : Promise.resolve({ data: null }),

      // 故事关系网络
      supabase.from("relationships").select("*").eq("story_id", storyId),

      // 时间线事件（最近 10 个）
      supabase
        .from("timeline_events")
        .select("*")
        .eq("story_id", storyId)
        .order("start_date", { ascending: true })
        .limit(10),
    ]);

  const chapterData = chapterResult.data?.data;
  const derivedCharacterIds = characterIds?.length
    ? characterIds
    : getStringArray(chapterData?.participant_entity_ids);
  const derivedLocationIds = locationIds?.length
    ? locationIds
    : getStringArray(chapterData?.location_entity_ids);

  const [charactersResult, locationsResult] = await Promise.all([
    // 相关角色（最多 5 个）
    derivedCharacterIds.length > 0
      ? supabase.from("entities").select("*").eq("story_id", storyId).in("id", derivedCharacterIds.slice(0, 5))
      : Promise.resolve({ data: [] }),

    // 相关地点（最多 3 个）
    derivedLocationIds.length > 0
      ? supabase.from("entities").select("*").eq("story_id", storyId).in("id", derivedLocationIds.slice(0, 3))
      : Promise.resolve({ data: [] }),
  ]);

  // 组装章节上下文
  if (chapterResult.data) {
    const ch = chapterResult.data;
    context.currentContent = (ch.content ?? "").slice(-2000);
    context.currentChapter = {
      number: ch.data?.chapter_number ?? 1,
      summary: ch.ai_context ?? ch.data?.summary ?? "",
      povCharacterId: ch.data?.pov_character_id ?? "",
      locationIds: derivedLocationIds,
      participantIds: derivedCharacterIds,
    };
  }

  // 组装角色上下文（含关系）
  const rels = relationshipsResult.data ?? [];
  const chars = charactersResult.data ?? [];
  if (chars.length > 0) {
    context.relevantCharacters = chars.map((c) => {
      const charRels = rels
        .filter((r) => r.from_entity_id === c.id || r.to_entity_id === c.id)
        .slice(0, 5)
        .map((r) => ({ name: r.to_entity_id === c.id ? r.from_entity_id : r.to_entity_id, type: r.type }));
      return {
        id: c.id,
        name: c.name,
        briefDescription: c.ai_context ?? c.data?.description ?? "",
        currentState: c.data?.arc?.starting_state ?? "",
        sensorySymbols: c.data?.sensory_symbols ?? {},
        knownInformation: c.data?.information_state?.knows ?? [],
        relationships: charRels,
      };
    });
  }

  // 组装地点上下文
  const locs = locationsResult.data ?? [];
  if (locs.length > 0) {
    context.relevantLocations = locs.map((l) => ({
      id: l.id,
      name: l.name,
      atmosphere: l.data?.atmosphere ?? "",
      sensoryDetails: l.data?.sensory_details ?? {},
    }));
  }

  // 组装时间线上下文
  const events = timelineResult.data ?? [];
  if (events.length > 0) {
    // 粗略以 sort_order 估算前后事件
    const previousEvents = events.slice(0, Math.min(3, events.length)).map((e) => e.title);
    const upcomingEvents = events.slice(-3).map((e) => e.title);
    context.timelineContext = {
      previousEvents,
      upcomingEvents,
      currentDate: events[0]?.start_date ?? "",
    };
  }

  return context;
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export interface BlueprintContext {
  currentBeat: BlueprintBeat | null;
  previousBeat: BlueprintBeat | null;
  nextBeat: BlueprintBeat | null;
  contextString: string;
}

export interface EnhancedContext {
  aiContext: Partial<AIContext>;
  blueprintContext: BlueprintContext;
  workflowContext: BlueprintWorkflowContext;
  memoryContext: MemoryContext;
  memoryPrompt: string;
  focusPrompt: string;
}

export async function buildEnhancedContext(
  focusPayload: FocusPayload,
  userInput?: string,
): Promise<EnhancedContext> {
  const [aiContext, blueprintContext, workflowContext, memoryContext] = await Promise.all([
    buildAIContext({
      storyId: focusPayload.storyId,
      chapterId: focusPayload.chapterId ?? undefined,
    }),
    buildBlueprintContext(focusPayload.storyId, focusPayload.beatId ?? undefined),
    getBlueprintWorkflowContext(
      focusPayload.storyId,
      focusPayload.chapterId ?? undefined,
    ),
    buildMemoryContext(
      focusPayload.storyId,
      focusPayload.cursorContext?.currentParagraph || userInput,
    ),
  ]);

  const memoryPrompt = formatMemoryForPrompt(memoryContext);
  const focusPrompt = formatFocusForPrompt(
    focusPayload,
    blueprintContext,
    workflowContext,
  );

  return {
    aiContext,
    blueprintContext,
    workflowContext,
    memoryContext,
    memoryPrompt,
    focusPrompt,
  };
}

export function formatFocusForPrompt(
  focusPayload: FocusPayload,
  blueprintContext?: BlueprintContext,
  workflowContext?: BlueprintWorkflowContext,
): string {
  const parts: string[] = [];

  if (focusPayload.chapterId) {
    parts.push(`当前章节 ID：${focusPayload.chapterId}`);
  }
  if (focusPayload.beatId) {
    parts.push(`当前蓝图节拍 ID：${focusPayload.beatId}`);
  }
  if (blueprintContext?.contextString) {
    parts.push("\n## 当前蓝图焦点");
    parts.push(blueprintContext.contextString);
  }
  if (workflowContext) {
    const { contract, structureTemplate } = workflowContext.workflow;
    const { currentSceneCard } = workflowContext;
    parts.push("\n## 蓝图工作流");
    parts.push(`结构模板：${structureTemplate}`);
    if (contract.genre || contract.readerPromise || contract.centralConflict) {
      parts.push(`类型：${contract.genre || "未指定"}`);
      parts.push(`读者承诺：${contract.readerPromise || "未指定"}`);
      parts.push(`中心冲突：${contract.centralConflict || "未指定"}`);
    }
    if (currentSceneCard) {
      parts.push("\n## 当前场景执行卡");
      parts.push(`场景：${currentSceneCard.title || "未命名场景"}`);
      parts.push(`目标：${currentSceneCard.goal || "未填写"}`);
      parts.push(`冲突：${currentSceneCard.conflict || "未填写"}`);
      parts.push(`转折：${currentSceneCard.turn || "未填写"}`);
      parts.push(`结果：${currentSceneCard.outcome || "未填写"}`);
      parts.push(`开场钩子：${currentSceneCard.openingHook || "未填写"}`);
      parts.push(`章末钩子：${currentSceneCard.endingHook || "未填写"}`);
      parts.push(`兑现点：${currentSceneCard.payoff || "未填写"}`);
    }
  }
  if (focusPayload.cursorContext?.currentParagraph) {
    parts.push("\n## 当前光标段落");
    parts.push(focusPayload.cursorContext.currentParagraph.slice(0, 1000));
  }
  if (focusPayload.cursorContext?.before || focusPayload.cursorContext?.after) {
    parts.push("\n## 光标附近文本");
    if (focusPayload.cursorContext.before) {
      parts.push(`前文：${focusPayload.cursorContext.before.slice(-800)}`);
    }
    if (focusPayload.cursorContext.after) {
      parts.push(`后文：${focusPayload.cursorContext.after.slice(0, 800)}`);
    }
  }

  if (parts.length === 0) return "";
  return `\n## 写作焦点\n${parts.join("\n")}`;
}

export async function buildBlueprintContext(
  storyId: string,
  beatId?: string,
): Promise<BlueprintContext> {
  const supabase = await createClient();

  const { data: blueprint } = await supabase
    .from("story_blueprints")
    .select("id")
    .eq("story_id", storyId)
    .single();

  if (!blueprint) {
    return { currentBeat: null, previousBeat: null, nextBeat: null, contextString: "" };
  }

  const { data: beats } = await supabase
    .from("blueprint_beats")
    .select("*")
    .eq("story_id", storyId)
    .eq("blueprint_id", blueprint.id)
    .order("sort_order", { ascending: true });

  if (!beats || beats.length === 0 || !beatId) {
    return { currentBeat: null, previousBeat: null, nextBeat: null, contextString: "" };
  }

  const currentBeat = (beats as BlueprintBeat[]).find((b) => b.id === beatId) ?? null;
  if (!currentBeat) {
    return { currentBeat: null, previousBeat: null, nextBeat: null, contextString: "" };
  }

  const currentIndex = beats.findIndex((b) => b.id === beatId);
  const previousBeat = currentIndex > 0 ? (beats[currentIndex - 1] as BlueprintBeat) : null;
  const nextBeat = currentIndex < beats.length - 1 ? (beats[currentIndex + 1] as BlueprintBeat) : null;

  const contextParts: string[] = [];
  contextParts.push(`当前节拍：「${currentBeat.title}」（${currentBeat.description ?? "无描述"}）`);
  contextParts.push(`情绪目标：${currentBeat.emotion_target > 0 ? "+" : ""}${currentBeat.emotion_target}`);
  if (currentBeat.synopsis) {
    contextParts.push(`节拍摘要：${currentBeat.synopsis}`);
  }
  if (previousBeat) {
    contextParts.push(`上一节拍：「${previousBeat.title}」— ${previousBeat.synopsis ?? previousBeat.description ?? ""}`);
  }
  if (nextBeat) {
    contextParts.push(`下一节拍：「${nextBeat.title}」— ${nextBeat.synopsis ?? nextBeat.description ?? ""}`);
  }

  return {
    currentBeat,
    previousBeat,
    nextBeat,
    contextString: contextParts.join("\n"),
  };
}

const MEMORY_TOKEN_BUDGET = 3000;
const CORE_MEMORY_MAX_TOKENS = 2000;
const ARCHIVAL_MAX_TOKENS = 600;
const RECALL_MAX_TOKENS = 400;

export async function buildMemoryContext(
  storyId: string,
  userInput?: string,
): Promise<MemoryContext> {
  const [coreMemory, archivalSnippets, recentOperations] = await Promise.all([
    getCoreMemory(storyId),
    userInput ? searchByUserInput(storyId, userInput) : Promise.resolve([]),
    getRecentRecallMemories(storyId, 10),
  ]);

  let tokensUsed = 0;

  let coreData: MemoryContext["coreMemory"] = null;
  if (coreMemory) {
    const coreText = JSON.stringify(coreMemory);
    const coreTokens = estimateTokens(coreText);
    if (coreTokens <= CORE_MEMORY_MAX_TOKENS) {
      coreData = {
        storySettings: coreMemory.storySettings,
        currentSnapshot: coreMemory.currentSnapshot,
        creatorPreferences: coreMemory.creatorPreferences,
        keyConstraints: coreMemory.keyConstraints,
      };
      tokensUsed += coreTokens;
    } else {
      coreData = {
        storySettings: coreMemory.storySettings,
        currentSnapshot: {
          ...coreMemory.currentSnapshot,
          mainCharacters: coreMemory.currentSnapshot.mainCharacters.slice(0, 2),
        },
        creatorPreferences: coreMemory.creatorPreferences,
        keyConstraints: coreMemory.keyConstraints,
      };
      tokensUsed += CORE_MEMORY_MAX_TOKENS;
    }
  }

  const remainingForArchival = Math.min(
    ARCHIVAL_MAX_TOKENS,
    MEMORY_TOKEN_BUDGET - tokensUsed,
  );
  const trimmedArchival = trimByBudget(
    archivalSnippets.map((s) => ({ text: s.content, data: s })),
    remainingForArchival,
  );
  tokensUsed += trimmedArchival.reduce(
    (sum, s) => sum + estimateTokens(s.text),
    0,
  );

  const remainingForRecall = Math.min(
    RECALL_MAX_TOKENS,
    MEMORY_TOKEN_BUDGET - tokensUsed,
  );
  const trimmedRecall = trimByBudget(
    recentOperations.map((o) => ({
      text: `${o.operationType}: ${o.summary}`,
      data: o,
    })),
    remainingForRecall,
  );

  return {
    coreMemory: coreData,
    archivalSnippets: trimmedArchival.map(
      (a) => a.data as MemoryContext["archivalSnippets"][0],
    ),
    recentOperations: trimmedRecall.map(
      (r) => r.data as MemoryContext["recentOperations"][0],
    ),
    totalTokensUsed: tokensUsed,
  };
}

async function searchByUserInput(
  storyId: string,
  userInput: string,
): Promise<MemoryContext["archivalSnippets"]> {
  try {
    const queryEmbedding = await embedText(userInput);
    return searchArchivalMemory(storyId, queryEmbedding, 0.6, 5);
  } catch (err) {
    console.error("[Memory] Archival search failed:", err);
    return [];
  }
}

function trimByBudget<T extends { text: string }>(
  items: T[],
  tokenBudget: number,
): T[] {
  const result: T[] = [];
  let used = 0;
  for (const item of items) {
    const tokens = estimateTokens(item.text);
    if (used + tokens > tokenBudget) break;
    result.push(item);
    used += tokens;
  }
  return result;
}

export function formatMemoryForPrompt(ctx: MemoryContext): string {
  const parts: string[] = [];

  if (ctx.coreMemory) {
    const cm = ctx.coreMemory;
    parts.push("## 核心记忆");
    parts.push(
      `故事：${cm.storySettings.title}（${cm.storySettings.genre}·${cm.storySettings.era}）`,
    );
    if (cm.storySettings.synopsis) {
      parts.push(`世界观：${cm.storySettings.synopsis.slice(0, 300)}`);
    }
    parts.push(
      `当前进度：第${cm.currentSnapshot.currentChapter}章，当前节拍「${cm.currentSnapshot.currentBeat}」，总字数${cm.currentSnapshot.totalWords}`,
    );
    if (cm.currentSnapshot.mainCharacters.length > 0) {
      parts.push(
        `主要角色：${cm.currentSnapshot.mainCharacters.map((c) => `${c.name}(${c.status})`).join("、")}`,
      );
    }
    if (
      cm.creatorPreferences.writingStyle ||
      cm.creatorPreferences.tonePreference
    ) {
      parts.push(
        `创作者偏好：${[cm.creatorPreferences.writingStyle, cm.creatorPreferences.tonePreference].filter(Boolean).join("，")}`,
      );
    }
    if (cm.keyConstraints.length > 0) {
      parts.push("⚠️ 关键约束（必须遵守）：");
      cm.keyConstraints.forEach((c, i) => parts.push(`  ${i + 1}. ${c}`));
    }
  }

  if (ctx.archivalSnippets.length > 0) {
    parts.push("\n## 相关记忆片段");
    ctx.archivalSnippets.forEach((s) => {
      parts.push(
        `[${s.sourceType}] ${s.content.slice(0, 200)}${s.content.length > 200 ? "..." : ""}`,
      );
    });
  }

  if (ctx.recentOperations.length > 0) {
    parts.push("\n## 最近操作");
    ctx.recentOperations.forEach((o) => {
      parts.push(`- ${o.summary}`);
    });
  }

  return parts.join("\n");
}

export async function getGenrePromptOverride(storyId: string): Promise<string> {
  const supabase = await createClient();
  const { data: story } = await supabase
    .from("stories")
    .select("genre")
    .eq("id", storyId)
    .single();

  if (!story?.genre) return "";

  const genreMap: Record<string, string> = {
    "玄幻": "xuanhuan",
    "武侠": "xuanhuan",
    "悬疑": "mystery",
    "推理": "mystery",
    "言情": "romance",
    "都市": "romance",
  };

  const profileName = genreMap[story.genre];
  if (!profileName) return "";

  try {
    const profile = await getGenreProfile(profileName);
    if (profile?.aiPromptOverrides?.style) {
      return `\n## 题材创作指导\n${profile.aiPromptOverrides.style}`;
    }
  } catch {
    // genre prompt is optional enrichment
  }
  return "";
}
