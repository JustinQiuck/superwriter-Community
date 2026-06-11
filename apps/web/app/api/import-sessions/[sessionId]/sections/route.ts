import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getImportSections,
  getImportSessionById,
  updateImportSections,
  updateImportSession,
} from "@/lib/db/queries/imports";
import { createClient } from "@/lib/supabase/server";

const updateSectionsSchema = z.object({
  sections: z.array(z.object({
    id: z.string().uuid().optional(),
    section_type: z.enum(["chapter", "prologue", "note", "appendix", "unknown"]),
    title: z.string().trim().min(1).max(300),
    volume_title: z.string().max(300).nullable().optional(),
    content: z.string().min(1),
    sort_order: z.number().int().nonnegative(),
    status: z.enum(["pending", "confirmed", "ignored"]),
  })).min(1),
});

const LOCKED_SESSION_STATUSES = new Set([
  "analyzing",
  "ready_for_review",
  "applying",
  "completed",
]);
const MIGRATABLE_SECTION_TYPES = new Set(["chapter", "prologue", "unknown"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const authorized = await requireAuthenticatedUser();
    if (!authorized) return unauthorizedResponse();

    const { sessionId } = await params;
    const existingSession = await getImportSessionById(sessionId);
    if (!existingSession) {
      return notFoundResponse();
    }

    if (LOCKED_SESSION_STATUSES.has(existingSession.status)) {
      return sessionLockedResponse();
    }

    const body = await request.json().catch(() => null);
    const parsed = updateSectionsSchema.safeParse(body);
    if (!parsed.success || hasEmptyConfirmedSectionTitle(parsed.data.sections)) {
      return validationErrorResponse(
        parsed.success ? undefined : parsed.error.flatten().fieldErrors,
      );
    }

    const currentSections = await getImportSections(sessionId);
    if (hasUnknownSubmittedSectionId(parsed.data.sections, currentSections)) {
      return sectionMismatchResponse();
    }

    const sections = await updateImportSections(sessionId, parsed.data.sections);
    const hasConfirmedSection = sections.some((section) =>
      section.status === "confirmed" && MIGRATABLE_SECTION_TYPES.has(section.section_type)
    );
    let session = existingSession;

    if (hasConfirmedSection) {
      session = await updateImportSession(sessionId, {
        status: "sections_confirmed",
        current_step: "analysis",
      });
    } else if (existingSession.status === "sections_confirmed") {
      session = await updateImportSession(sessionId, {
        status: "parsed",
        current_step: "sections",
      });
    }

    return NextResponse.json({ data: { session, sections } });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update import sections" } },
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

function hasEmptyConfirmedSectionTitle(
  sections: Array<{ section_type: string; status: string; title: string }>,
): boolean {
  return sections.some((section) =>
    section.status === "confirmed" &&
    section.title.trim().length === 0,
  );
}

function hasUnknownSubmittedSectionId(
  submittedSections: Array<{ id?: string }>,
  currentSections: Array<{ id: string }>,
): boolean {
  const currentIds = new Set(currentSections.map((section) => section.id));
  return submittedSections.some((section) =>
    section.id ? !currentIds.has(section.id) : false,
  );
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

function sectionMismatchResponse() {
  return NextResponse.json(
    { error: { code: "SECTION_MISMATCH", message: "章节不属于当前导入会话" } },
    { status: 409 },
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
