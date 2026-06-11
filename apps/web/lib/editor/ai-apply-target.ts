import type { AIApplyMode, EditorSelectionSnapshot } from "@/types/ai";

interface ResolveAIApplyTargetInput {
  mode: AIApplyMode;
  selection?: EditorSelectionSnapshot;
  contentSize: number;
  getTextBetween: (from: number, to: number) => string;
}

export type AIApplyTargetResult =
  | { ok: true; bounds?: { from: number; to: number } }
  | { ok: false; reason: "missing_selection" | "stale_selection" };

export function resolveAIApplyTarget({
  mode,
  selection,
  contentSize,
  getTextBetween,
}: ResolveAIApplyTargetInput): AIApplyTargetResult {
  if (mode === "insert") {
    return { ok: true };
  }

  if (!selection) {
    return { ok: false, reason: "missing_selection" };
  }

  const from = clampPosition(selection.from, contentSize);
  const to = clampPosition(selection.to, contentSize);
  const bounds = {
    from: Math.min(from, to),
    to: Math.max(from, to),
  };

  const currentText = getTextBetween(bounds.from, bounds.to);
  if (currentText !== selection.text) {
    return { ok: false, reason: "stale_selection" };
  }

  return { ok: true, bounds };
}

function clampPosition(position: number, contentSize: number): number {
  return Math.max(0, Math.min(position, contentSize));
}
