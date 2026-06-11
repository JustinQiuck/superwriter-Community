import { createClient } from "@/lib/supabase/server";
import { resolveChapterBeat } from "@/lib/blueprint/chapter-beat-resolver";
import type { BlueprintBeat, BlueprintChapter, Entity, StoryBlueprint } from "@/types/entity";
import type {
  BlueprintWorkflowState,
  SceneExecutionCard,
} from "./workflow-types";
import { getBlueprintWorkflowState } from "./workflow-state";

export interface BlueprintWorkflowContext {
  workflow: BlueprintWorkflowState;
  currentSceneCard: SceneExecutionCard | null;
}

export function selectFirstSceneCard(
  contentGuidance: Record<string, unknown> | null | undefined,
): SceneExecutionCard | null {
  const sceneCards = contentGuidance?.scene_cards;
  if (!Array.isArray(sceneCards) || sceneCards.length === 0) return null;
  return normalizeSceneCard(sceneCards[0]);
}

export async function getBlueprintWorkflowContext(
  storyId: string,
  chapterId?: string,
): Promise<BlueprintWorkflowContext> {
  const supabase = await createClient();
  const { data: blueprint } = await supabase
    .from("story_blueprints")
    .select("*")
    .eq("story_id", storyId)
    .single();

  const workflow = getBlueprintWorkflowState((blueprint as StoryBlueprint | null) ?? null);

  if (!chapterId) {
    return { workflow, currentSceneCard: null };
  }

  const linkedChapter = await loadLinkedBlueprintChapter(storyId, chapterId, supabase);
  if (linkedChapter) {
    return {
      workflow,
      currentSceneCard: selectFirstSceneCard(linkedChapter.content_guidance),
    };
  }

  const fallbackChapter = await loadBeatMatchedBlueprintChapter(
    storyId,
    chapterId,
    supabase,
  );

  return {
    workflow,
    currentSceneCard: selectFirstSceneCard(fallbackChapter?.content_guidance),
  };
}

async function loadLinkedBlueprintChapter(
  storyId: string,
  chapterId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<BlueprintChapter | null> {
  const { data } = await supabase
    .from("blueprint_chapters")
    .select("*")
    .eq("story_id", storyId)
    .contains("content_guidance", { linked_entity_chapter_id: chapterId })
    .maybeSingle();

  return (data as BlueprintChapter | null) ?? null;
}

async function loadBeatMatchedBlueprintChapter(
  storyId: string,
  chapterId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<BlueprintChapter | null> {
  const [
    { data: chapter },
    { data: beats },
    { data: blueprintChapters },
  ] = await Promise.all([
    supabase
      .from("entities")
      .select("*")
      .eq("story_id", storyId)
      .eq("id", chapterId)
      .eq("type", "chapter")
      .maybeSingle(),
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

  const resolvedBeat = chapter
    ? resolveChapterBeat(
        chapter as Entity,
        ((beats ?? []) as BlueprintBeat[]),
        ((blueprintChapters ?? []) as BlueprintChapter[]),
      )?.beat
    : null;

  if (!resolvedBeat) return null;

  return (
    ((blueprintChapters ?? []) as BlueprintChapter[]).find(
      (blueprintChapter) => blueprintChapter.beat_id === resolvedBeat.id,
    ) ?? null
  );
}

function normalizeSceneCard(value: unknown): SceneExecutionCard | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Partial<Record<keyof SceneExecutionCard, unknown>>;
  return {
    id: getString(record.id) || "scene-card-1",
    title: getString(record.title),
    pov: getString(record.pov),
    location: getString(record.location),
    time: getString(record.time),
    goal: getString(record.goal),
    conflict: getString(record.conflict),
    turn: getString(record.turn),
    outcome: getString(record.outcome),
    openingHook: getString(record.openingHook),
    endingHook: getString(record.endingHook),
    payoff: getString(record.payoff),
    serialPacingNote: getString(record.serialPacingNote),
  };
}

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}
