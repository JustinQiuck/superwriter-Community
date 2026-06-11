import type { ArchivalSourceType, RecallOperationType } from "@superwriter/shared";

export interface StorySettings {
  title: string;
  genre: string;
  era: string;
  synopsis: string;
}

export interface CurrentSnapshot {
  currentChapter: number;
  currentBeat: string;
  totalWords: number;
  mainCharacters: { name: string; status: string }[];
  lastUpdated: string;
  recentDeviationSummary?: string;
}

export interface CreatorPreferences {
  writingStyle: string;
  tonePreference: string;
  avgSentenceLength: string;
  customNotes: string;
}

export interface CoreMemoryData {
  storySettings: StorySettings;
  currentSnapshot: CurrentSnapshot;
  creatorPreferences: CreatorPreferences;
  keyConstraints: string[];
}

export interface CoreMemory {
  id: string;
  storyId: string;
  storySettings: StorySettings;
  currentSnapshot: CurrentSnapshot;
  creatorPreferences: CreatorPreferences;
  keyConstraints: string[];
  tokenEstimate: number;
  createdAt: string;
  updatedAt: string;
}

export interface ArchivalMemory {
  id: string;
  storyId: string;
  sourceType: ArchivalSourceType;
  sourceId: string;
  segmentIndex: number;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface RecallMemory {
  id: string;
  storyId: string;
  operationType: RecallOperationType;
  summary: string;
  context: Record<string, unknown>;
  createdAt: string;
}

export interface MemoryContext {
  coreMemory: CoreMemoryData | null;
  archivalSnippets: {
    content: string;
    relevance: number;
    sourceType: string;
  }[];
  recentOperations: {
    operationType: string;
    summary: string;
    createdAt: string;
  }[];
  totalTokensUsed: number;
}
