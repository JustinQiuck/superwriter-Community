import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveChapterBeat } from "@/lib/blueprint/chapter-beat-resolver";
import { getBlueprintWorkflowContext } from "@/lib/blueprint/workflow-context";
import { getBlueprintChapters, getBlueprintWithBeats } from "@/lib/db/queries/blueprints";
import { getDeviationReports } from "@/lib/db/queries/deviations";
import { createClient } from "@/lib/supabase/server";
import { buildWritingBriefFromParts } from "@/lib/writing/daily-writing-brief";
import type { BlueprintWorkflowContext } from "@/lib/blueprint/workflow-context";
import type {
  BriefBeatInput,
  BriefChapterInput,
  BriefDeviationInput,
} from "@/lib/writing/daily-writing-brief";
import type { DeviationReport } from "@/types/deviation";
import type { BlueprintBeat, Entity } from "@/types/entity";

const idSchema = z.string().uuid();
const chapterBriefSelect = "id, story_id, type, name, sort_order, data, ai_context";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storyId: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 },
      );
    }

    const { storyId } = await params;
    const storyIdResult = idSchema.safeParse(storyId);
    if (!storyIdResult.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid storyId" } },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const chapterIdResult = idSchema.safeParse(searchParams.get("chapterId"));
    if (!chapterIdResult.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid chapterId" } },
        { status: 400 },
      );
    }

    const { data: story, error: storyError } = await supabase
      .from("stories")
      .select("id")
      .eq("id", storyIdResult.data)
      .eq("user_id", user.id)
      .maybeSingle();

    if (storyError) throw storyError;
    if (!story) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 },
      );
    }

    const { data: chapterData, error: chapterError } = await supabase
      .from("entities")
      .select(chapterBriefSelect)
      .eq("story_id", storyIdResult.data)
      .eq("id", chapterIdResult.data)
      .eq("type", "chapter")
      .maybeSingle();

    if (chapterError) throw chapterError;
    if (!chapterData) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Chapter not found" } },
        { status: 404 },
      );
    }

    const chapter = chapterData as Entity;
    const [previousChapter, beatContext] = await Promise.all([
      loadPreviousChapter(
        storyIdResult.data,
        chapter.sort_order,
        supabase,
      ),
      resolveBeatContext(storyIdResult.data, chapter),
    ]);
    const beat = beatContext.currentBeat;
    const workflowContext = beat
      ? await loadWorkflowContextSafely(storyIdResult.data, chapter.id)
      : { currentSceneCard: null };
    const deviations = beat
      ? await getDeviationReports(storyIdResult.data, {
          status: "pending",
          beatId: beat.id,
        })
      : [];

    const brief = buildWritingBriefFromParts({
      chapter: toBriefChapter(chapter),
      beat: beat ? toBriefBeat(beat) : null,
      nextBeat: beatContext.nextBeat ? toBriefBeat(beatContext.nextBeat) : null,
      previousChapter: previousChapter ? toBriefChapter(previousChapter) : null,
      currentSceneCard: workflowContext.currentSceneCard,
      deviations: deviations.map(toBriefDeviation),
    });

    return NextResponse.json({ data: brief });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to build writing brief";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}

async function loadWorkflowContextSafely(
  storyId: string,
  chapterId: string,
): Promise<Pick<BlueprintWorkflowContext, "currentSceneCard">> {
  try {
    return await getBlueprintWorkflowContext(storyId, chapterId);
  } catch {
    return { currentSceneCard: null };
  }
}

async function loadPreviousChapter(
  storyId: string,
  sortOrder: number | undefined,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Entity | null> {
  if (typeof sortOrder !== "number") return null;

  const { data, error } = await supabase
    .from("entities")
    .select(chapterBriefSelect)
    .eq("story_id", storyId)
    .eq("type", "chapter")
    .lt("sort_order", sortOrder)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as Entity | null) ?? null;
}

async function resolveBeatContext(
  storyId: string,
  chapter: Entity,
): Promise<{ currentBeat: BlueprintBeat | null; nextBeat: BlueprintBeat | null }> {
  const blueprintResult = await getBlueprintWithBeats(storyId);
  if (!blueprintResult) return { currentBeat: null, nextBeat: null };

  const blueprintChapters = await getBlueprintChapters(
    storyId,
    blueprintResult.blueprint.id,
  );
  const resolvedBeat = resolveChapterBeat(
    chapter,
    blueprintResult.beats,
    blueprintChapters,
  )?.beat ?? null;

  if (!resolvedBeat) return { currentBeat: null, nextBeat: null };

  const orderedBeats = [...blueprintResult.beats].sort(bySortOrder);
  const currentIndex = orderedBeats.findIndex((beat) => beat.id === resolvedBeat.id);
  const nextBeat =
    currentIndex >= 0 && currentIndex < orderedBeats.length - 1
      ? orderedBeats[currentIndex + 1]
      : null;

  return { currentBeat: resolvedBeat, nextBeat };
}

function toBriefChapter(chapter: Entity): BriefChapterInput {
  const data = toRecord(chapter.data);
  return {
    id: chapter.id,
    name: chapter.name,
    sortOrder: chapter.sort_order ?? null,
    summary: firstString(data.summary, chapter.ai_context),
    mustInclude: stringsFromUnknown(data.must_include),
    keyInformation: stringsFromUnknown(data.key_information),
    wordCount: numberOrNull(data.word_count),
    targetWordCount: numberOrNull(data.target_word_count),
  };
}

function toBriefBeat(beat: BlueprintBeat): BriefBeatInput {
  return {
    id: beat.id,
    title: beat.title,
    description: beat.description ?? null,
    synopsis: beat.synopsis ?? null,
    emotionTarget: numberOrNull(beat.emotion_target),
    content: beat.content,
  };
}

function toBriefDeviation(deviation: DeviationReport): BriefDeviationInput {
  return {
    id: deviation.id,
    type: deviation.deviationType,
    severity: deviation.severity,
    blueprintValue: deviation.blueprintValue,
    actualValue: deviation.actualValue,
    suggestion: deviation.aiSuggestion,
  };
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringsFromUnknown(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(stringsFromUnknown);
  }

  if (typeof value === "string" && value.trim()) {
    return [value.replace(/\s+/g, " ").trim()];
  }

  return [];
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function bySortOrder(
  left: { sort_order?: number; created_at?: string },
  right: { sort_order?: number; created_at?: string },
): number {
  const leftOrder =
    typeof left.sort_order === "number" ? left.sort_order : Number.MAX_SAFE_INTEGER;
  const rightOrder =
    typeof right.sort_order === "number" ? right.sort_order : Number.MAX_SAFE_INTEGER;
  if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  return (left.created_at ?? "").localeCompare(right.created_at ?? "");
}
