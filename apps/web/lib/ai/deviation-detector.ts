import { createClient } from "@/lib/supabase/server";
import { generateText, type LanguageModel } from "ai";
import { getModel } from "@/lib/ai/providers";
import { resolveAIModelRoute } from "@/lib/ai/model-registry";
import { fillTemplate } from "@/lib/ai/template-engine";
import { getCoreMemory } from "@/lib/db/queries/memories";
import {
  DEVIATION_EMOTION_ANALYSIS_PROMPT,
  DEVIATION_CONTRADICTION_CHECK_PROMPT,
} from "@/lib/ai/prompts/deviation-prompts";
import { resolveChapterBeat } from "@/lib/blueprint/chapter-beat-resolver";
import type { DeviationResult, DeviationSeverity } from "@/types/deviation";
import type { BlueprintBeat, BlueprintChapter, Entity } from "@/types/entity";

interface EmotionAnalysisResult {
  score: number;
  reason: string;
}

interface ContradictionResult {
  hasContradiction: boolean;
  detail: string;
}

export async function detectDeviations(
  storyId: string,
  chapterId: string,
  chapterContent: string,
): Promise<DeviationResult[]> {
  const plainText = chapterContent
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();

  if (!plainText || plainText.length < 50) return [];

  const supabase = await createClient();

  const [chapterResult, beatsResult, blueprintChaptersResult] = await Promise.all([
    supabase
      .from("entities")
      .select("*")
      .eq("story_id", storyId)
      .eq("id", chapterId)
      .eq("type", "chapter")
      .single(),
    supabase
      .from("blueprint_beats")
      .select("*")
      .eq("story_id", storyId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("blueprint_chapters")
      .select("*")
      .eq("story_id", storyId)
      .order("sort_order", { ascending: true }),
  ]);

  const chapter = chapterResult.data as Entity | null;
  const beats = (beatsResult.data ?? []) as BlueprintBeat[];
  const blueprintChapters = (blueprintChaptersResult.data ?? []) as BlueprintChapter[];
  if (!chapter) return [];

  const resolved = resolveChapterBeat(chapter, beats, blueprintChapters);
  if (!resolved) return [];
  const beat = resolved.beat;

  const results = await Promise.allSettled([
    checkEmotionDeviation(plainText, beat),
    checkCharacterAbsence(plainText, beat, storyId),
    checkPacingDeviation(plainText, beat),
    checkSettingContradiction(plainText, storyId),
  ]);

  const deviations: DeviationResult[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      deviations.push(...result.value);
    } else {
      console.error("[Deviation] Check failed:", result.reason);
    }
  }

  return deviations;
}

async function checkEmotionDeviation(
  content: string,
  beat: BlueprintBeat,
): Promise<DeviationResult[]> {
  if (beat.emotion_target === 0 || beat.emotion_target === null || beat.emotion_target === undefined) {
    return [];
  }

  const textForAnalysis = content.length > 4000 ? content.slice(0, 4000) : content;

  try {
    const resolvedRoute = await resolveAIModelRoute({
      routeKey: "deviation_emotion_analysis",
      plan: null,
      capability: "analysis",
      callScope: "internal_system",
    });
    const model = getModel(resolvedRoute);
    const { text: response } = await generateText({
      model: model as LanguageModel,
      prompt: fillTemplate(DEVIATION_EMOTION_ANALYSIS_PROMPT, {
        chapter_content: textForAnalysis,
      }),
    });

    const parsed = parseJsonResponse<EmotionAnalysisResult>(response);
    if (!parsed || typeof parsed.score !== "number") return [];

    const delta = Math.abs(parsed.score - beat.emotion_target);
    if (delta <= 3) return [];

    const severity: DeviationSeverity = delta > 6 ? "high" : delta > 4 ? "medium" : "low";

    return [{
      beatId: beat.id,
      deviationType: "emotion",
      severity,
      blueprintValue: `目标情绪值: ${beat.emotion_target}（${beat.title}）`,
      actualValue: `实际情绪值: ${parsed.score}（${parsed.reason}）`,
    }];
  } catch {
    return [];
  }
}

async function checkCharacterAbsence(
  content: string,
  beat: BlueprintBeat,
  storyId: string,
): Promise<DeviationResult[]> {
  const charIds = beat.suggested_character_ids;
  if (!charIds || charIds.length === 0) return [];

  const supabase = await createClient();
  const { data: characters } = await supabase
    .from("entities")
    .select("id, name, data")
    .eq("story_id", storyId)
    .in("id", charIds);

  if (!characters || characters.length === 0) return [];

  const absent: string[] = [];
  const lowerContent = content.toLowerCase();

  for (const char of characters) {
    const names = [char.name];
    const data = char.data as Record<string, unknown> | null;
    if (data?.aliases && Array.isArray(data.aliases)) {
      names.push(...(data.aliases as string[]));
    }
    if (data?.nickname && typeof data.nickname === "string") {
      names.push(data.nickname);
    }

    const found = names.some((name) => name && lowerContent.includes(name.toLowerCase()));
    if (!found) {
      absent.push(char.name);
    }
  }

  if (absent.length === 0) return [];

  const severity: DeviationSeverity = absent.length >= 3 ? "high" : absent.length >= 2 ? "medium" : "low";

  return [{
    beatId: beat.id,
    deviationType: "character_absence",
    severity,
    blueprintValue: `建议出场角色: ${characters.map((c) => c.name).join("、")}`,
    actualValue: `未出场角色: ${absent.join("、")}`,
  }];
}

async function checkPacingDeviation(
  content: string,
  beat: BlueprintBeat,
): Promise<DeviationResult[]> {
  const beatContent = beat.content as Record<string, unknown> | null;
  const targetWordCount = beatContent?.target_word_count as number | undefined;
  if (!targetWordCount || targetWordCount <= 0) return [];

  const actualWordCount = content.length;
  const ratio = actualWordCount / targetWordCount;

  if (ratio >= 0.5 && ratio <= 1.5) return [];

  const deviation = ratio < 0.5
    ? `字数不足（${actualWordCount}字 / 目标${targetWordCount}字）`
    : `字数超标（${actualWordCount}字 / 目标${targetWordCount}字）`;

  const severity: DeviationSeverity = ratio < 0.3 || ratio > 2.0 ? "high" : "medium";

  return [{
    beatId: beat.id,
    deviationType: "pacing",
    severity,
    blueprintValue: `目标字数: ${targetWordCount}`,
    actualValue: deviation,
  }];
}

async function checkSettingContradiction(
  content: string,
  storyId: string,
): Promise<DeviationResult[]> {
  const coreMemory = await getCoreMemory(storyId);
  const constraints = coreMemory?.keyConstraints ?? [];
  if (constraints.length === 0) return [];

  const textForCheck = content.length > 4000 ? content.slice(0, 4000) : content;

  try {
    const resolvedRoute = await resolveAIModelRoute({
      routeKey: "deviation_contradiction_check",
      plan: null,
      capability: "analysis",
      callScope: "internal_system",
    });
    const model = getModel(resolvedRoute);
    const { text: response } = await generateText({
      model: model as LanguageModel,
      prompt: fillTemplate(DEVIATION_CONTRADICTION_CHECK_PROMPT, {
        key_constraints: constraints.map((c, i) => `${i + 1}. ${c}`).join("\n"),
        chapter_content: textForCheck,
      }),
    });

    const parsed = parseJsonResponse<ContradictionResult>(response);
    if (!parsed?.hasContradiction || !parsed.detail) return [];

    return [{
      beatId: null,
      deviationType: "setting_contradiction",
      severity: "high",
      blueprintValue: `约束: ${constraints.join("；")}`,
      actualValue: parsed.detail,
    }];
  } catch {
    return [];
  }
}

function parseJsonResponse<T>(text: string): T | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]) as T;
  } catch {
    return null;
  }
}
