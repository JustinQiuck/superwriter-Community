import type { AIMode } from "@superwriter/shared";
import type { MemoryContext } from "@/types/memory";

export interface AIContext {
  currentContent: string;
  currentChapter: {
    number: number;
    summary: string;
    povCharacterId: string;
    locationIds: string[];
    participantIds: string[];
  };
  relevantCharacters: {
    id: string;
    name: string;
    briefDescription: string;
    currentState: string;
    sensorySymbols: {
      visual?: string;
      auditory?: string;
      olfactory?: string;
      tactile?: string;
      gustatory?: string;
    };
    knownInformation: string[];
    relationships: { name: string; type: string }[];
  }[];
  relevantLocations: {
    id: string;
    name: string;
    atmosphere: string;
    sensoryDetails: {
      visual?: string;
      auditory?: string;
      olfactory?: string;
    };
  }[];
  timelineContext: {
    previousEvents: string[];
    upcomingEvents: string[];
    currentDate: string;
  };
  styleProfile: {
    tone: string;
    pov: string;
    tense: string;
    sampleParagraph: string;
  };
  memoryContext?: MemoryContext;
}

export interface CursorContext {
  before: string;
  after: string;
  currentParagraph: string;
}

export interface FocusPayload {
  storyId: string;
  chapterId?: string | null;
  beatId?: string | null;
  cursorContext?: CursorContext | null;
}

export interface EditorSelectionSnapshot {
  from: number;
  to: number;
  text: string;
}

export type AIArtifactStatus = "pending" | "applied" | "saved" | "discarded";

export type AIArtifactContentType =
  | "draft"
  | "dialogue"
  | "setting"
  | "plot"
  | "inspiration"
  | "analysis"
  | "title"
  | "summary"
  | "chat";

export type AIArtifactSource =
  | "free_chat"
  | "quick_action"
  | "editor_selection"
  | "blueprint"
  | "work_learning"
  | "unknown";

export interface AIArtifactAppliedTarget {
  chapterId: string;
  applyMode: AIApplyMode;
  requestId: string;
}

export interface AIEditorDraft {
  id: string;
  generationId?: string;
  storyId: string;
  chapterId?: string | null;
  mode: AIMode;
  sourceText: string;
  resultText: string;
  contentType?: AIArtifactContentType;
  artifactStatus?: AIArtifactStatus;
  selection?: EditorSelectionSnapshot;
  decision?: "accepted" | "rejected" | "reference";
  createdAt: string;
}

export type AIApplyMode = "insert" | "replace" | "append";

export interface AIApplyRequest {
  id: string;
  draftId: string;
  chapterId?: string | null;
  mode: AIApplyMode;
  text: string;
  selection?: EditorSelectionSnapshot;
}

export interface AIGenerationRequest {
  mode: AIMode;
  storyId: string;
  entityId?: string;
  prompt?: string;
  context?: Partial<AIContext>;
}

export interface AIGenerationRecord {
  id: string;
  story_id: string;
  user_id: string;
  mode: string;
  prompt: string;
  context_entity_ids?: string[];
  model: string;
  result?: string;
  tokens_used?: number;
  accepted?: boolean;
  rating?: number;
  created_at: string;
}
