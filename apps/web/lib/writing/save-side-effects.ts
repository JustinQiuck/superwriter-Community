import type { Entity } from "@/types/entity";
import { rebuildCoreMemory } from "@/lib/ai/core-memory-builder";
import { fireAndForgetEmbed } from "@/lib/ai/embed-pipeline";
import { detectDeviations } from "@/lib/ai/deviation-detector";
import { addRecallMemory } from "@/lib/db/queries/memories";
import { storeDeviationReports } from "@/lib/db/queries/deviations";
import { buildContentSignature, type ContentSignature } from "@/lib/writing/content-signature";

const MIN_MEANINGFUL_CHAR_DELTA = 80;
const MIN_MEANINGFUL_WORD_DELTA = 30;
const MIN_RECALL_INTERVAL_MS = 5 * 60 * 1000;
const MIN_DEVIATION_INTERVAL_MS = 2 * 60 * 1000;

export interface EntityUpdateInput {
  name?: string;
  data?: Record<string, unknown>;
  content?: string;
  tags?: string[];
  color?: string;
  sort_order?: number;
  status?: string;
  timeline_date?: string;
  cover_image_url?: string;
  ai_context?: string;
}

export interface SaveSideEffect {
  type: "core_memory" | "recall_chapter" | "recall_entity" | "embedding" | "deviation_detection";
}

export interface PreparedSaveSideEffects {
  updateInput: EntityUpdateInput;
  effects: SaveSideEffect[];
  storyId: string;
  entityId: string;
  entityName: string;
  entityType: string;
  chapterNumber?: number;
  wordCount?: number;
  content?: string;
}

export interface SaveSideEffectDeps {
  rebuildCoreMemory: typeof rebuildCoreMemory;
  addRecallMemory: typeof addRecallMemory;
  fireAndForgetEmbed: typeof fireAndForgetEmbed;
  detectDeviations: typeof detectDeviations;
  storeDeviationReports: typeof storeDeviationReports;
  logError: (label: string, error: unknown) => void;
}

interface PrepareInput {
  storyId: string;
  entityId: string;
  previousEntity: Entity;
  updateInput: EntityUpdateInput;
  now?: Date;
}

interface ProcessingMetadata {
  last_content_signature?: string;
  last_content_text_length?: number;
  last_content_word_count?: number;
  last_memory_rebuild_at?: string;
  last_embedding_at?: string;
  last_deviation_check_at?: string;
  last_recall_signature?: string;
  last_recall_at?: string;
}

export function prepareEntitySaveSideEffects({
  storyId,
  entityId,
  previousEntity,
  updateInput,
  now = new Date(),
}: PrepareInput): PreparedSaveSideEffects {
  const effects: SaveSideEffect[] = [];
  const previousData = toRecord(previousEntity.data);
  const incomingData = updateInput.data;
  const nextData = incomingData ? { ...previousData, ...incomingData } : previousData;
  const keyDataChanged = incomingData !== undefined;

  const prepared: PreparedSaveSideEffects = {
    updateInput: { ...updateInput },
    effects,
    storyId,
    entityId,
    entityName: updateInput.name ?? previousEntity.name,
    entityType: previousEntity.type,
    chapterNumber: getNumber(nextData.chapter_number),
  };

  if (previousEntity.type !== "chapter") {
    if (keyDataChanged) {
      effects.push({ type: "core_memory" }, { type: "recall_entity" });
    }
    return prepared;
  }

  const contentChangedByValue =
    updateInput.content !== undefined && updateInput.content !== (previousEntity.content ?? "");
  const nextContent = updateInput.content ?? previousEntity.content ?? "";
  const signature = buildContentSignature(nextContent);
  const metadata = getProcessingMetadata(previousData);
  const shouldProcessContent =
    contentChangedByValue && isMeaningfulContentChange(previousEntity.content ?? "", signature, metadata);
  const shouldRecall =
    shouldProcessContent || shouldProcessByInterval(metadata.last_recall_at, now, MIN_RECALL_INTERVAL_MS);
  const shouldCheckDeviation =
    shouldProcessContent ||
    shouldProcessByInterval(metadata.last_deviation_check_at, now, MIN_DEVIATION_INTERVAL_MS);

  prepared.content = nextContent;
  prepared.wordCount = getNumber(nextData.word_count) ?? signature.wordCount;

  if (keyDataChanged || shouldProcessContent) {
    effects.push({ type: "core_memory" });
  }

  if (contentChangedByValue && shouldRecall) {
    effects.push({ type: "recall_chapter" });
  }

  if (contentChangedByValue && shouldProcessContent && nextContent.trim()) {
    effects.push({ type: "embedding" });
  }

  if (contentChangedByValue && shouldCheckDeviation && nextContent.trim()) {
    effects.push({ type: "deviation_detection" });
  }

  if (effects.length > 0) {
    prepared.updateInput.data = withProcessingMetadata(nextData, metadata, effects, signature, now);
  } else if (incomingData) {
    prepared.updateInput.data = nextData;
  }

  return prepared;
}

export async function runEntitySaveSideEffects(
  prepared: PreparedSaveSideEffects,
  deps: SaveSideEffectDeps = defaultDeps,
): Promise<void> {
  const tasks = prepared.effects.map(async (effect) => {
    try {
      switch (effect.type) {
        case "core_memory":
          await deps.rebuildCoreMemory(prepared.storyId);
          break;
        case "recall_chapter":
          await deps.addRecallMemory(
            prepared.storyId,
            "chapter_save",
            `保存第${prepared.chapterNumber ?? "?"}章「${prepared.entityName}」`,
            {
              chapterId: prepared.entityId,
              chapterNumber: prepared.chapterNumber,
              wordCount: prepared.wordCount,
            },
          );
          break;
        case "recall_entity":
          await deps.addRecallMemory(
            prepared.storyId,
            "entity_update",
            `修改${prepared.entityType}「${prepared.entityName}」`,
            { entityId: prepared.entityId, entityType: prepared.entityType },
          );
          break;
        case "embedding":
          if (prepared.content) {
            deps.fireAndForgetEmbed(prepared.storyId, "chapter", prepared.entityId, prepared.content, {
              chapter_number: prepared.chapterNumber,
              chapter_name: prepared.entityName,
            });
          }
          break;
        case "deviation_detection":
          if (prepared.content) {
            const results = await deps.detectDeviations(
              prepared.storyId,
              prepared.entityId,
              prepared.content,
            );
            if (results.length > 0) {
              await deps.storeDeviationReports(prepared.storyId, results);
            }
          }
          break;
      }
    } catch (error) {
      deps.logError(`[Writing] ${effect.type} side effect failed`, error);
    }
  });

  await Promise.all(tasks);
}

function isMeaningfulContentChange(
  previousContent: string,
  nextSignature: ContentSignature,
  metadata: ProcessingMetadata,
): boolean {
  if (metadata.last_content_signature === nextSignature.signature) return false;

  const baselineLength =
    metadata.last_content_text_length ?? buildContentSignature(previousContent).textLength;
  const baselineWords =
    metadata.last_content_word_count ?? buildContentSignature(previousContent).wordCount;

  const charDelta = Math.abs(nextSignature.textLength - baselineLength);
  const wordDelta = Math.abs(nextSignature.wordCount - baselineWords);
  const relativeDelta = baselineLength === 0 ? 1 : charDelta / baselineLength;

  return (
    charDelta >= MIN_MEANINGFUL_CHAR_DELTA ||
    wordDelta >= MIN_MEANINGFUL_WORD_DELTA ||
    relativeDelta >= 0.1
  );
}

function shouldProcessByInterval(
  timestamp: string | undefined,
  now: Date,
  intervalMs: number,
): boolean {
  if (!timestamp) return false;
  const previousTime = Date.parse(timestamp);
  if (!Number.isFinite(previousTime)) return true;
  return now.getTime() - previousTime >= intervalMs;
}

function withProcessingMetadata(
  data: Record<string, unknown>,
  previousMetadata: ProcessingMetadata,
  effects: SaveSideEffect[],
  signature: ContentSignature,
  now: Date,
): Record<string, unknown> {
  const timestamp = now.toISOString();
  const nextMetadata: ProcessingMetadata = { ...previousMetadata };

  if (effects.some((effect) => effect.type === "core_memory")) {
    nextMetadata.last_memory_rebuild_at = timestamp;
  }
  if (effects.some((effect) => effect.type === "embedding")) {
    nextMetadata.last_embedding_at = timestamp;
    nextMetadata.last_content_signature = signature.signature;
    nextMetadata.last_content_text_length = signature.textLength;
    nextMetadata.last_content_word_count = signature.wordCount;
  }
  if (effects.some((effect) => effect.type === "deviation_detection")) {
    nextMetadata.last_deviation_check_at = timestamp;
    nextMetadata.last_content_signature = signature.signature;
    nextMetadata.last_content_text_length = signature.textLength;
    nextMetadata.last_content_word_count = signature.wordCount;
  }
  if (effects.some((effect) => effect.type === "recall_chapter")) {
    nextMetadata.last_recall_signature = signature.signature;
    nextMetadata.last_recall_at = timestamp;
  }

  return {
    ...data,
    ai_processing: nextMetadata,
  };
}

function getProcessingMetadata(data: Record<string, unknown>): ProcessingMetadata {
  return toRecord(data.ai_processing) as ProcessingMetadata;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

const defaultDeps: SaveSideEffectDeps = {
  rebuildCoreMemory,
  addRecallMemory,
  fireAndForgetEmbed,
  detectDeviations,
  storeDeviationReports,
  logError: (label, error) => console.error(label, error),
};
