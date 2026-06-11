import type { AIMode } from "@superwriter/shared";
import type {
  AIArtifactContentType,
  AIArtifactSource,
  AIArtifactStatus,
  AIEditorDraft,
} from "@/types/ai";

export interface AIArtifactMetadata {
  source: AIArtifactSource;
  contentType: AIArtifactContentType;
  status: AIArtifactStatus;
}

export interface AIGenerationArtifactRow {
  id: string;
  story_id: string;
  chapter_id: string | null;
  mode: string;
  prompt: string;
  result: string | null;
  content_type: string | null;
  status: string | null;
  source: string | null;
  created_at: string | null;
}

const AI_MODES = [
  "character_generate",
  "character_dialogue",
  "location_generate",
  "event_suggest",
  "outline_generate",
  "chapter_continue",
  "chapter_rewrite",
  "sensory_expand",
  "conflict_intensify",
  "pacing_tighten",
  "hook_boost",
  "voice_check",
  "chapter_drift_check",
  "chapter_completion_review",
  "foreshadowing_check",
  "consistency_check",
  "timeline_fill",
  "relationship_suggest",
  "information_track",
  "free_chat",
  "synopsis_candidates",
  "blueprint_generate",
  "blueprint_expand",
  "story_outline_generate",
  "story_asset_needs",
  "blueprint_reverse_sync",
  "beat_suggest",
  "deviation_suggest",
  "arc_suggest",
  "foreshadowing_suggest",
  "work_learning_analyze",
  "work_learning_apply",
] as const satisfies readonly AIMode[];

const DRAFT_MODES = new Set<AIMode>([
  "chapter_continue",
  "chapter_rewrite",
  "sensory_expand",
  "conflict_intensify",
  "pacing_tighten",
  "hook_boost",
]);

const DIALOGUE_MODES = new Set<AIMode>(["character_dialogue"]);

const SETTING_MODES = new Set<AIMode>([
  "character_generate",
  "location_generate",
  "relationship_suggest",
  "timeline_fill",
  "information_track",
  "story_asset_needs",
]);

const PLOT_MODES = new Set<AIMode>([
  "event_suggest",
  "outline_generate",
  "synopsis_candidates",
  "blueprint_generate",
  "blueprint_expand",
  "story_outline_generate",
  "blueprint_reverse_sync",
  "beat_suggest",
  "deviation_suggest",
  "arc_suggest",
  "foreshadowing_suggest",
]);

const ANALYSIS_MODES = new Set<AIMode>([
  "voice_check",
  "chapter_drift_check",
  "chapter_completion_review",
  "foreshadowing_check",
  "consistency_check",
  "work_learning_analyze",
  "work_learning_apply",
]);

const AI_MODE_VALUES = new Set<string>(AI_MODES);

const AI_ARTIFACT_CONTENT_TYPES = new Set<string>([
  "draft",
  "dialogue",
  "setting",
  "plot",
  "inspiration",
  "analysis",
  "title",
  "summary",
  "chat",
] satisfies AIArtifactContentType[]);

const AI_ARTIFACT_STATUSES = new Set<string>([
  "pending",
  "applied",
  "saved",
  "discarded",
] satisfies AIArtifactStatus[]);

const AI_ARTIFACT_SOURCES = new Set<string>([
  "free_chat",
  "quick_action",
  "editor_selection",
  "blueprint",
  "work_learning",
  "unknown",
] satisfies AIArtifactSource[]);

export function deriveAIArtifactMetadata(mode: AIMode): AIArtifactMetadata {
  if (mode === "free_chat") {
    return {
      source: "free_chat",
      contentType: "chat",
      status: "saved",
    };
  }

  if (DRAFT_MODES.has(mode)) {
    return {
      source: "quick_action",
      contentType: "draft",
      status: "pending",
    };
  }

  if (DIALOGUE_MODES.has(mode)) {
    return {
      source: "quick_action",
      contentType: "dialogue",
      status: "pending",
    };
  }

  if (SETTING_MODES.has(mode)) {
    return {
      source: "quick_action",
      contentType: "setting",
      status: "saved",
    };
  }

  if (PLOT_MODES.has(mode)) {
    return {
      source: "quick_action",
      contentType: "plot",
      status: "saved",
    };
  }

  if (ANALYSIS_MODES.has(mode)) {
    return {
      source: mode === "work_learning_analyze" || mode === "work_learning_apply"
        ? "work_learning"
        : "quick_action",
      contentType: "analysis",
      status: "saved",
    };
  }

  return {
    source: "unknown",
    contentType: "inspiration",
    status: "pending",
  };
}

export function mapGenerationRowToDraft(row: AIGenerationArtifactRow): AIEditorDraft | null {
  if (!row.result?.trim()) return null;

  const mode = normalizeAIMode(row.mode);
  if (!mode) return null;

  const metadata = normalizeArtifactMetadata(row, deriveAIArtifactMetadata(mode));

  return {
    id: row.id,
    generationId: row.id,
    storyId: row.story_id,
    chapterId: row.chapter_id,
    mode,
    sourceText: row.prompt,
    resultText: row.result,
    contentType: metadata.contentType,
    artifactStatus: metadata.status,
    createdAt: row.created_at ?? new Date(0).toISOString(),
  };
}

function normalizeAIMode(mode: string): AIMode | null {
  return AI_MODE_VALUES.has(mode) ? mode as AIMode : null;
}

function normalizeArtifactMetadata(
  row: AIGenerationArtifactRow,
  fallback: AIArtifactMetadata,
): AIArtifactMetadata {
  return {
    source: isAIArtifactSource(row.source) ? row.source : fallback.source,
    contentType: isAIArtifactContentType(row.content_type)
      ? row.content_type
      : fallback.contentType,
    status: isAIArtifactStatus(row.status) ? row.status : fallback.status,
  };
}

function isAIArtifactContentType(
  value: string | null,
): value is AIArtifactContentType {
  return value != null && AI_ARTIFACT_CONTENT_TYPES.has(value);
}

function isAIArtifactStatus(value: string | null): value is AIArtifactStatus {
  return value != null && AI_ARTIFACT_STATUSES.has(value);
}

function isAIArtifactSource(value: string | null): value is AIArtifactSource {
  return value != null && AI_ARTIFACT_SOURCES.has(value);
}
