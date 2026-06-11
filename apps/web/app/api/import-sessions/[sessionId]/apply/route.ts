import { NextResponse } from "next/server";

import { getImportSessionById } from "@/lib/db/queries/imports";
import {
  ImportApplyError,
  applyImportSession,
  ImportNoConfirmedChaptersError,
  ImportSessionNotFoundError,
  ImportSessionNotReadyError,
} from "@/lib/import/apply-session";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const authorized = await requireAuthenticatedUser();
    if (!authorized) return unauthorizedResponse();

    const { sessionId } = await params;
    const session = await getImportSessionById(sessionId);
    if (!session) return notFoundResponse();

    const result = await applyImportSession(sessionId);
    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof ImportSessionNotFoundError) return notFoundResponse();
    if (error instanceof ImportSessionNotReadyError) return sessionNotReadyResponse();
    if (error instanceof ImportNoConfirmedChaptersError) return noConfirmedChaptersResponse();
    if (error instanceof ImportApplyError) return applyConflictResponse(error);

    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to apply import session" } },
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

function notFoundResponse() {
  return NextResponse.json(
    { error: { code: "NOT_FOUND", message: "导入会话不存在" } },
    { status: 404 },
  );
}

function sessionNotReadyResponse() {
  return NextResponse.json(
    { error: { code: "SESSION_NOT_READY", message: "导入会话尚未进入应用阶段" } },
    { status: 409 },
  );
}

function noConfirmedChaptersResponse() {
  return NextResponse.json(
    { error: { code: "NO_CONFIRMED_CHAPTERS", message: "请先确认至少一个片段" } },
    { status: 409 },
  );
}

function applyConflictResponse(error: ImportApplyError) {
  return NextResponse.json(
    { error: { code: error.code, message: error.message } },
    { status: 409 },
  );
}
