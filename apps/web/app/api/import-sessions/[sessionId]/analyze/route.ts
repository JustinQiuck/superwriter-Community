import { NextResponse } from "next/server";

import {
  getImportSections,
  getImportJobs,
  getImportSessionById,
  rebuildImportAnalysis,
  resetFailedImportJobsForRetry,
  updateImportSession,
} from "@/lib/db/queries/imports";
import {
  ensureImportAnalysisJobs,
  processImportAnalysisBatch,
} from "@/lib/import/analysis-pipeline";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_SESSION_STATUSES = new Set([
  "sections_confirmed",
  "analyzing",
  "ready_for_review",
]);
const REBUILD_SESSION_STATUSES = new Set([
  "parsed",
  "sections_confirmed",
  "analyzing",
  "ready_for_review",
  "failed",
]);
const LOCKED_SESSION_STATUSES = new Set(["applying", "completed", "cancelled"]);
const MIGRATABLE_SECTION_TYPES = new Set(["chapter", "prologue", "unknown"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const authorized = await requireAuthenticatedUser();
    if (!authorized) return unauthorizedResponse();

    const body = await request.json().catch(() => null);
    const shouldRebuild = isRebuildRequest(body);
    const { sessionId } = await params;
    const existingSession = await getImportSessionById(sessionId);
    if (!existingSession) return notFoundResponse();

    if (LOCKED_SESSION_STATUSES.has(existingSession.status)) {
      return sessionLockedResponse();
    }
    if (shouldRebuild) {
      if (!REBUILD_SESSION_STATUSES.has(existingSession.status)) {
        return sessionNotReadyResponse();
      }
    } else if (!ALLOWED_SESSION_STATUSES.has(existingSession.status)) {
      return sessionNotReadyResponse();
    }

    let sections = await getImportSections(sessionId);
    if (shouldRebuild) {
      if (!hasCompleteRebuildableSourceText(sections)) {
        return hasMigratableSection(sections)
          ? sourceTextMissingResponse()
          : noConfirmedSectionsResponse();
      }
      sections = await rebuildImportAnalysis(sessionId);
    }

    const hasConfirmedSection = sections.some((section) =>
      section.status === "confirmed" && MIGRATABLE_SECTION_TYPES.has(section.section_type)
    );
    if (!hasConfirmedSection) return noConfirmedSectionsResponse();

    await ensureImportAnalysisJobs(sessionId);
    const jobs = await getImportJobs(sessionId);
    const hasFailedJobs = !shouldRebuild && jobs.some((job) => job.status === "failed");
    if (hasFailedJobs) {
      await resetFailedImportJobsForRetry(sessionId);
    }

    let session = existingSession;
    if (
      shouldRebuild ||
      (hasFailedJobs && session.status === "ready_for_review") ||
      session.status === "sections_confirmed" ||
      session.status === "analyzing"
    ) {
      session = await updateImportSession(sessionId, {
        status: "analyzing",
        current_step: "analysis",
      });
    }

    const result = await processImportAnalysisBatch({
      sessionId,
      workerId: crypto.randomUUID(),
      limit: 1,
    });

    if (result.readyForReview) {
      session = await updateImportSession(sessionId, {
        status: "ready_for_review",
        current_step: "review",
      });
    }

    return NextResponse.json({
      data: {
        session,
        progress: result.progress,
        processed: result.processed,
        readyForReview: result.readyForReview,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: readAnalyzeErrorMessage(error) } },
      { status: 500 },
    );
  }
}

function isRebuildRequest(body: unknown): boolean {
  return (
    typeof body === "object" &&
    body !== null &&
    "rebuild" in body &&
    body.rebuild === true
  );
}

function hasMigratableSection(
  sections: Array<{ section_type: string; status: string }>,
): boolean {
  return sections.some((section) =>
    section.status !== "ignored" && MIGRATABLE_SECTION_TYPES.has(section.section_type)
  );
}

function hasCompleteRebuildableSourceText(
  sections: Array<{ section_type: string; status: string; content: string | null }>,
): boolean {
  const migratableSections = sections.filter((section) =>
    section.status !== "ignored" && MIGRATABLE_SECTION_TYPES.has(section.section_type)
  );
  return migratableSections.length > 0 && migratableSections.every((section) =>
    typeof section.content === "string" && section.content.trim().length > 0
  );
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

function sessionNotReadyResponse() {
  return NextResponse.json(
    { error: { code: "SESSION_NOT_READY", message: "导入会话尚未进入分析阶段" } },
    { status: 409 },
  );
}

function noConfirmedSectionsResponse() {
  return NextResponse.json(
    { error: { code: "NO_CONFIRMED_CHAPTERS", message: "请先确认至少一个片段" } },
    { status: 400 },
  );
}

function sourceTextMissingResponse() {
  return NextResponse.json(
    {
      error: {
        code: "SOURCE_TEXT_MISSING",
        message: "源文本已清理，无法重新分析；请重新上传文件创建迁移任务",
      },
    },
    { status: 409 },
  );
}

function readAnalyzeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (
    message.includes("next_attempt_at") ||
    message.includes("rebuild_import_analysis") ||
    message.includes("complete_import_analysis_job")
  ) {
    return "数据库迁移未应用，请先执行 Supabase migration 后再继续分析";
  }
  return "Failed to analyze import session";
}
