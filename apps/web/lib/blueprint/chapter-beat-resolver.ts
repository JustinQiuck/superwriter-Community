import type { BlueprintBeat, BlueprintChapter, Entity } from "@/types/entity";

export type ChapterBeatResolutionReason =
  | "chapter_data"
  | "blueprint_chapter_link"
  | "chapter_number_blueprint_chapter"
  | "chapter_number_sequence"
  | "writing_status"
  | "first_beat";

export interface ChapterBeatResolution {
  beat: BlueprintBeat;
  reason: ChapterBeatResolutionReason;
}

export function resolveChapterBeat(
  chapter: Entity,
  beats: BlueprintBeat[],
  blueprintChapters: BlueprintChapter[] = [],
): ChapterBeatResolution | null {
  const orderedBeats = [...beats].sort(bySortOrder);
  if (orderedBeats.length === 0) return null;

  const beatsById = new Map(orderedBeats.map((beat) => [beat.id, beat]));
  const chapterData = toRecord(chapter.data);
  const explicitBeatId = firstString(
    chapterData.beat_id,
    chapterData.blueprint_beat_id,
    chapterData.current_beat_id,
  );
  const explicitBeat = explicitBeatId ? beatsById.get(explicitBeatId) : undefined;
  if (explicitBeat) {
    return { beat: explicitBeat, reason: "chapter_data" };
  }

  const linkedBlueprintChapter = findLinkedBlueprintChapter(chapter, blueprintChapters);
  const linkedBeat = linkedBlueprintChapter?.beat_id
    ? beatsById.get(linkedBlueprintChapter.beat_id)
    : undefined;
  if (linkedBeat) {
    return { beat: linkedBeat, reason: "blueprint_chapter_link" };
  }

  const chapterNumber = getNumber(chapterData.chapter_number);
  if (chapterNumber !== undefined) {
    const chapterNumberMatch = findBlueprintChapterByNumber(chapterNumber, blueprintChapters);
    const chapterNumberBeat = chapterNumberMatch?.beat_id
      ? beatsById.get(chapterNumberMatch.beat_id)
      : undefined;
    if (chapterNumberBeat) {
      return {
        beat: chapterNumberBeat,
        reason: "chapter_number_blueprint_chapter",
      };
    }
  }

  const writingBeat = orderedBeats.find((beat) => beat.status === "writing");
  if (writingBeat) {
    return { beat: writingBeat, reason: "writing_status" };
  }

  if (chapterNumber !== undefined) {
    const sequenceBeat = orderedBeats[chapterNumber - 1];
    if (sequenceBeat) {
      return { beat: sequenceBeat, reason: "chapter_number_sequence" };
    }
  }

  return { beat: orderedBeats[0], reason: "first_beat" };
}

function findLinkedBlueprintChapter(
  chapter: Entity,
  blueprintChapters: BlueprintChapter[],
): BlueprintChapter | undefined {
  return blueprintChapters
    .slice()
    .sort(bySortOrder)
    .find((blueprintChapter) => {
      const guidance = toRecord(blueprintChapter.content_guidance);
      return firstString(
        guidance.linked_entity_chapter_id,
        guidance.entity_chapter_id,
        guidance.chapter_entity_id,
      ) === chapter.id;
    });
}

function findBlueprintChapterByNumber(
  chapterNumber: number,
  blueprintChapters: BlueprintChapter[],
): BlueprintChapter | undefined {
  return blueprintChapters
    .slice()
    .sort(bySortOrder)
    .find((blueprintChapter) => {
      const guidance = toRecord(blueprintChapter.content_guidance);
      const guidanceNumber = getNumber(guidance.chapter_number);
      return guidanceNumber === chapterNumber;
    });
}

function bySortOrder(
  left: { sort_order?: number; created_at?: string },
  right: { sort_order?: number; created_at?: string },
): number {
  const leftOrder = getSortNumber(left.sort_order);
  const rightOrder = getSortNumber(right.sort_order);
  if (leftOrder !== undefined || rightOrder !== undefined) {
    return (leftOrder ?? Number.MAX_SAFE_INTEGER) - (rightOrder ?? Number.MAX_SAFE_INTEGER);
  }

  return (left.created_at ?? "").localeCompare(right.created_at ?? "");
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function getNumber(value: unknown): number | undefined {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : undefined;
}

function getSortNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
