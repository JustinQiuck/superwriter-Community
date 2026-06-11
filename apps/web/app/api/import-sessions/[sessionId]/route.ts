import { NextResponse } from "next/server";

import {
  calculateImportProgress,
  deleteImportSession,
  getImportCandidates,
  getImportJobs,
  getImportSections,
  getImportSessionById,
} from "@/lib/db/queries/imports";
import { createClient } from "@/lib/supabase/server";
import type { ImportSessionStatus } from "@/types/import";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const authorized = await requireAuthenticatedUser();
    if (!authorized) return unauthorizedResponse();

    const { sessionId } = await params;
    const session = await getImportSessionById(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "导入会话不存在" } },
        { status: 404 },
      );
    }

    const [sections, candidates, jobs] = await Promise.all([
      getImportSections(sessionId),
      getImportCandidates(sessionId),
      getImportJobs(sessionId),
    ]);
    const progress = calculateImportProgress(jobs);

    return NextResponse.json({
      data: { session, sections, candidates, jobs, progress },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch import session" } },
      { status: 500 },
    );
  }
}

const DELETABLE_STATUSES = new Set<ImportSessionStatus>([
  "uploaded",
  "parsed",
  "sections_confirmed",
  "analyzing",
  "ready_for_review",
  "failed",
  "cancelled",
]);

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const authorized = await requireAuthenticatedUser();
    if (!authorized) return unauthorizedResponse();

    const { sessionId } = await params;
    const session = await getImportSessionById(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "导入会话不存在" } },
        { status: 404 },
      );
    }

    if (!DELETABLE_STATUSES.has(session.status)) {
      return NextResponse.json(
        { error: { code: "SESSION_LOCKED", message: "当前迁移状态不能删除" } },
        { status: 409 },
      );
    }

    await deleteImportSession(sessionId);

    return NextResponse.json({ data: { deleted: true } });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete import session" } },
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

function unauthorizedResponse() {
  return NextResponse.json(
    { error: { code: "UNAUTHORIZED", message: "请先登录" } },
    { status: 401 },
  );
}
