import { createHash } from "crypto";

export function hashWorkLearningSource(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function summarizeWorkLearningPrompt(input: {
  skillId: string;
  sourceTitle?: string | null;
  sourceHash: string;
  sourceLength: number;
}): string {
  return JSON.stringify({
    kind: "work_learning_source_summary",
    skillId: input.skillId,
    sourceTitle: input.sourceTitle ?? null,
    sourceHash: input.sourceHash,
    sourceLength: input.sourceLength,
  });
}

export function summarizeWorkLearningResult(input: {
  summary: string;
  cardCount: number;
  cardTitles: string[];
}): string {
  return JSON.stringify({
    kind: "work_learning_analysis_summary",
    summary: input.summary,
    cardCount: input.cardCount,
    cardTitles: input.cardTitles,
  });
}
