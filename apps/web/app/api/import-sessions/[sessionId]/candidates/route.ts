import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getImportCandidates,
  getImportSessionById,
  updateImportCandidates,
} from "@/lib/db/queries/imports";
import { createClient } from "@/lib/supabase/server";
import type { ImportCandidate, ImportCandidateStatus } from "@/types/import";

const updateCandidatesSchema = z.object({
  updates: z.array(z.object({
    id: z.string().uuid(),
    status: z.enum(["pending", "accepted", "ignored", "merged"]).optional(),
    name: z.string().trim().min(1).max(300).optional(),
    summary: z.string().max(4000).optional(),
    merged_into_candidate_id: z.string().uuid().nullable().optional(),
  })).min(1),
});

type CandidateUpdate = z.infer<typeof updateCandidatesSchema>["updates"][number];

const LOCKED_SESSION_STATUSES = new Set([
  "applying",
  "completed",
  "cancelled",
]);

const MERGEABLE_CANDIDATE_TYPES = new Set(["character", "location"]);
const INVALID_MERGE_TARGET_STATUSES = new Set<ImportCandidateStatus>([
  "merged",
  "ignored",
  "applied",
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const authorized = await requireAuthenticatedUser();
    if (!authorized) return unauthorizedResponse();

    const { sessionId } = await params;
    const session = await getImportSessionById(sessionId);
    if (!session) return notFoundResponse();

    if (LOCKED_SESSION_STATUSES.has(session.status)) {
      return sessionLockedResponse();
    }

    const body = await request.json().catch(() => null);
    const parsed = updateCandidatesSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.flatten().fieldErrors);
    }

    if (hasDuplicateCandidateId(parsed.data.updates)) {
      return duplicateCandidateUpdateResponse();
    }

    const currentCandidates = await getImportCandidates(sessionId);
    const candidatesById = new Map(
      currentCandidates.map((candidate) => [candidate.id, candidate]),
    );

    if (hasUnknownCandidateId(parsed.data.updates, candidatesById)) {
      return candidateMismatchResponse();
    }

    if (!hasValidCandidateFinalStates(parsed.data.updates, candidatesById)) {
      return invalidMergeResponse();
    }

    const candidates = await updateImportCandidates(sessionId, parsed.data.updates);

    return NextResponse.json({ data: { candidates } });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update import candidates" } },
      { status: 500 },
    );
  }
}

async function requireAuthenticatedUser(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return Boolean(user);
}

function hasUnknownCandidateId(
  updates: Array<{ id: string }>,
  candidatesById: Map<string, ImportCandidate>,
): boolean {
  return updates.some((update) => !candidatesById.has(update.id));
}

function hasDuplicateCandidateId(updates: Array<{ id: string }>): boolean {
  const seen = new Set<string>();
  for (const update of updates) {
    if (seen.has(update.id)) return true;
    seen.add(update.id);
  }
  return false;
}

function hasValidCandidateFinalStates(
  updates: CandidateUpdate[],
  candidatesById: Map<string, ImportCandidate>,
): boolean {
  const finalCandidatesById = buildFinalCandidateStateMap(updates, candidatesById);

  return updates.every((update) => {
    const source = finalCandidatesById.get(update.id);
    if (!source) return false;

    if (source.status !== "merged") {
      return source.merged_into_candidate_id === null;
    }

    if (!source.merged_into_candidate_id) return false;
    if (source.id === source.merged_into_candidate_id) return false;

    const target = finalCandidatesById.get(source.merged_into_candidate_id);
    if (!source || !target) return false;

    return (
      MERGEABLE_CANDIDATE_TYPES.has(source.candidate_type) &&
      source.candidate_type === target.candidate_type &&
      !INVALID_MERGE_TARGET_STATUSES.has(target.status)
    );
  });
}

function buildFinalCandidateStateMap(
  updates: CandidateUpdate[],
  candidatesById: Map<string, ImportCandidate>,
): Map<string, ImportCandidate> {
  const finalCandidatesById = new Map(
    Array.from(candidatesById, ([id, candidate]) => [id, { ...candidate }]),
  );

  for (const update of updates) {
    const candidate = finalCandidatesById.get(update.id);
    if (!candidate) continue;

    if (update.status !== undefined) {
      candidate.status = update.status;
    }
    if (update.name !== undefined) {
      candidate.name = update.name;
    }
    if (update.summary !== undefined) {
      candidate.summary = update.summary;
    }
    if (update.merged_into_candidate_id !== undefined) {
      candidate.merged_into_candidate_id = update.merged_into_candidate_id;
    }
  }

  return finalCandidatesById;
}

function unauthorizedResponse() {
  return NextResponse.json(
    { error: { code: "UNAUTHORIZED", message: "请先登录" } },
    { status: 401 },
  );
}

function notFoundResponse() {
  return NextResponse.json(
    { error: { code: "NOT_FOUND", message: "导入会话不存在" } },
    { status: 404 },
  );
}

function sessionLockedResponse() {
  return NextResponse.json(
    { error: { code: "SESSION_LOCKED", message: "导入会话已锁定" } },
    { status: 409 },
  );
}

function candidateMismatchResponse() {
  return NextResponse.json(
    { error: { code: "CANDIDATE_MISMATCH", message: "候选项不属于当前导入会话" } },
    { status: 409 },
  );
}

function duplicateCandidateUpdateResponse() {
  return NextResponse.json(
    { error: { code: "DUPLICATE_CANDIDATE_UPDATE", message: "候选项更新重复" } },
    { status: 400 },
  );
}

function invalidMergeResponse() {
  return NextResponse.json(
    { error: { code: "INVALID_MERGE", message: "候选项合并类型不匹配" } },
    { status: 400 },
  );
}

function validationErrorResponse(details?: unknown) {
  return NextResponse.json(
    {
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        ...(details ? { details } : {}),
      },
    },
    { status: 400 },
  );
}
