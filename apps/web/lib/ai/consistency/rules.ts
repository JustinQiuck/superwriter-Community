import type { AIMode, ConsistencyFindingSeverity } from "@superwriter/shared";

import type { ConsistencyCheckConfidence } from "@/types/consistency";

const MANUSCRIPT_PRODUCING_ROUTES = new Set<string>([
  "chapter_continue",
  "chapter_rewrite",
  "conflict_intensify",
  "pacing_tighten",
  "hook_boost",
  "sensory_expand",
  "character_dialogue",
  "blueprint_expand",
  "beat_suggest",
  "story_outline_generate",
  "work_learning_apply",
]);

export function shouldRunBundledConsistencyCheck(routeKey: AIMode | string): boolean {
  return MANUSCRIPT_PRODUCING_ROUTES.has(routeKey);
}

export function resolveConsistencyDisplay({
  confidence,
  severity,
  hasMemoryCandidate = false,
}: {
  confidence: ConsistencyCheckConfidence;
  severity: ConsistencyFindingSeverity;
  hasMemoryCandidate?: boolean;
}): { shouldShowInline: boolean; shouldCreateMemoryCandidate: boolean } {
  if (confidence === "low") {
    return { shouldShowInline: false, shouldCreateMemoryCandidate: false };
  }

  if (severity === "high" && confidence === "high") {
    return {
      shouldShowInline: true,
      shouldCreateMemoryCandidate: hasMemoryCandidate,
    };
  }

  if (confidence === "medium" || hasMemoryCandidate) {
    return {
      shouldShowInline: false,
      shouldCreateMemoryCandidate: hasMemoryCandidate,
    };
  }

  return {
    shouldShowInline: false,
    shouldCreateMemoryCandidate: false,
  };
}
