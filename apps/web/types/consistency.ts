import type {
  ConsistencyFindingSeverity,
  ConsistencyFindingStatus,
  ConsistencyFindingType,
} from "@superwriter/shared";

export type ConsistencyFindingSourceType =
  | "ai_generation"
  | "chapter_scan"
  | "manual"
  | "memory_inbox";

export interface ConsistencyEvidence {
  kind: "memory" | "chapter" | "outline" | "manual";
  label: string;
  value: string;
  ref?: string;
}

export interface ConsistencyFinding {
  id: string;
  storyId: string;
  chapterId: string | null;
  sourceType: ConsistencyFindingSourceType;
  sourceId: string | null;
  sourceRouteKey: string | null;
  sourceRef: string | null;
  type: ConsistencyFindingType;
  severity: ConsistencyFindingSeverity;
  title: string;
  detail: string;
  evidence: ConsistencyEvidence[];
  suggestion: string | null;
  memoryKey: string | null;
  memoryValue: string | null;
  status: ConsistencyFindingStatus;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConsistencyFindingInput {
  storyId: string;
  chapterId?: string | null;
  sourceType: ConsistencyFindingSourceType;
  sourceId?: string | null;
  sourceRouteKey?: string | null;
  sourceRef?: string | null;
  type: ConsistencyFindingType;
  severity: ConsistencyFindingSeverity;
  title: string;
  detail: string;
  evidence: ConsistencyEvidence[];
  suggestion?: string | null;
  memoryKey?: string | null;
  memoryValue?: string | null;
}

export type ConsistencyCheckConfidence = "low" | "medium" | "high";

export interface RunConsistencyCheckInput {
  storyId: string;
  chapterId?: string | null;
  sourceType: ConsistencyFindingSourceType;
  sourceId?: string | null;
  sourceRouteKey?: string | null;
  sourceRef?: string | null;
  generatedText: string;
}
