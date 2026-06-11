import type { AIEditorDraft } from "@/types/ai";

const MAX_DRAFT_CANDIDATES = 5;

export function addDraftCandidate(
  candidates: AIEditorDraft[],
  draft: AIEditorDraft,
): AIEditorDraft[] {
  return mergeDraftCandidates(candidates, [draft]);
}

export function mergeDraftCandidates(
  candidates: AIEditorDraft[],
  incoming: AIEditorDraft[],
): AIEditorDraft[] {
  const incomingIds = new Set(incoming.map((candidate) => candidate.id));
  const merged: AIEditorDraft[] = [];
  const seen = new Set<string>();

  for (const candidate of incoming) {
    if (seen.has(candidate.id)) continue;
    merged.push(candidate);
    seen.add(candidate.id);
  }

  for (const candidate of candidates) {
    if (incomingIds.has(candidate.id) || seen.has(candidate.id)) continue;
    merged.push(candidate);
    seen.add(candidate.id);
  }

  return merged.slice(0, MAX_DRAFT_CANDIDATES);
}

export function markDraftCandidateDecision(
  candidates: AIEditorDraft[],
  draftId: string,
  decision: NonNullable<AIEditorDraft["decision"]>,
): AIEditorDraft[] {
  return candidates.map((candidate) =>
    candidate.id === draftId ? { ...candidate, decision } : candidate,
  );
}

export function removeDraftCandidate(
  candidates: AIEditorDraft[],
  draftId: string,
): AIEditorDraft[] {
  return candidates.filter((candidate) => candidate.id !== draftId);
}
