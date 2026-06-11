import type { ArchivalSourceType, RecallOperationType } from "@superwriter/shared";

export type DeviationType = "emotion" | "character_absence" | "pacing" | "setting_contradiction";
export type DeviationSeverity = "low" | "medium" | "high";
export type DeviationStatus = "pending" | "ignored" | "fixed";

export interface DeviationReport {
  id: string;
  storyId: string;
  beatId: string | null;
  deviationType: DeviationType;
  severity: DeviationSeverity;
  blueprintValue: string;
  actualValue: string;
  aiSuggestion: string | null;
  status: DeviationStatus;
  resolvedAt: string | null;
  createdAt: string;
}

export interface DeviationResult {
  beatId: string | null;
  deviationType: DeviationType;
  severity: DeviationSeverity;
  blueprintValue: string;
  actualValue: string;
}
