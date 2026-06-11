import { NextResponse } from "next/server";
import { z } from "zod";

import { createImportSession, getImportSessions } from "@/lib/db/queries/imports";
import { createClient } from "@/lib/supabase/server";

const createImportSessionSchema = z.object({
  filename: z.string().min(1).max(255),
  fileType: z.enum(["txt", "md", "docx"]),
  fileSize: z.number().int().nonnegative(),
});

export async function GET(_request: Request) {
  try {
    const authorized = await requireAuthenticatedUser();
    if (!authorized) return unauthorizedResponse();

    const sessions = await getImportSessions();
    return NextResponse.json({ data: sessions });
  } catch {
    return internalErrorResponse("Failed to fetch import sessions");
  }
}

export async function POST(request: Request) {
  try {
    const authorized = await requireAuthenticatedUser();
    if (!authorized) return unauthorizedResponse();

    const body = await request.json().catch(() => null);
    if (!isRecord(body)) {
      return validationErrorResponse();
    }

    const parsed = createImportSessionSchema.safeParse(body);

    if (!parsed.success || !filenameMatchesFileType(body?.filename, body?.fileType)) {
      return validationErrorResponse(
        parsed.success ? undefined : parsed.error.flatten().fieldErrors,
      );
    }

    const session = await createImportSession({
      source_filename: parsed.data.filename,
      source_file_type: parsed.data.fileType,
      source_file_size: parsed.data.fileSize,
      metadata: { upload_source: "dashboard" },
    });

    return NextResponse.json({ data: session }, { status: 201 });
  } catch (error) {
    return internalErrorResponse(readErrorMessage(error) ?? "Failed to create import session");
  }
}

async function requireAuthenticatedUser(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return Boolean(user);
}

function filenameMatchesFileType(filename: unknown, fileType: unknown): boolean {
  if (typeof filename !== "string" || typeof fileType !== "string") return false;
  const extension = filename.split(".").pop()?.toLowerCase();
  return extension === fileType.toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readErrorMessage(error: unknown): string | null {
  if (error instanceof Error) return error.message;
  if (isRecord(error) && typeof error.message === "string") return error.message;
  return null;
}

function unauthorizedResponse() {
  return NextResponse.json(
    { error: { code: "UNAUTHORIZED", message: "请先登录" } },
    { status: 401 },
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

function internalErrorResponse(message: string) {
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message } },
    { status: 500 },
  );
}
