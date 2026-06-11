import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

import {
  createImportDocument,
  getImportSessionById,
  replaceImportSections,
  updateImportSession,
} from "@/lib/db/queries/imports";
import {
  ImportDocumentParseError,
  parseImportDocument,
  UnsupportedImportFileTypeError,
} from "@/lib/import/parse-document";
import { splitManuscriptIntoSections } from "@/lib/import/chapter-splitter";
import { createClient } from "@/lib/supabase/server";

const UPLOADABLE_SESSION_STATUSES = new Set(["uploaded"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const authorized = await requireAuthenticatedUser();
    if (!authorized) return unauthorizedResponse();

    const { sessionId } = await params;
    const existingSession = await getImportSessionById(sessionId);
    if (!existingSession) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "导入会话不存在" } },
        { status: 404 },
      );
    }
    if (!UPLOADABLE_SESSION_STATUSES.has(existingSession.status)) {
      return sessionLockedResponse();
    }

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return validationErrorResponse("请上传文件");
    }

    const file = formData.get("file");
    if (!isNonEmptyFile(file)) {
      return validationErrorResponse("请上传文件");
    }

    const parsed = await parseImportDocument(file);
    const draftSections = splitManuscriptIntoSections(parsed.text);
    const fileHash = await hashText(parsed.text);
    const document = await createImportDocument({
      session_id: sessionId,
      filename: parsed.filename,
      file_type: parsed.fileType,
      file_hash: fileHash,
      raw_text: parsed.text,
      metadata: parsed.metadata,
    });
    const sections = await replaceImportSections(sessionId, draftSections);
    const inferredTitle = inferTitle(draftSections, parsed.filename);
    const session = await updateImportSession(sessionId, {
      status: "parsed",
      current_step: "sections",
      source_word_count: parsed.wordCount,
      inferred_title: inferredTitle,
    });

    return NextResponse.json({ data: { session, document, sections } });
  } catch (error) {
    if (error instanceof UnsupportedImportFileTypeError) {
      return validationErrorResponse(error.message);
    }

    if (error instanceof ImportDocumentParseError) {
      return NextResponse.json(
        { error: { code: "PARSE_ERROR", message: error.message } },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to upload import file" } },
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

function isNonEmptyFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "name" in value &&
    "size" in value &&
    typeof value.size === "number" &&
    value.size > 0
  );
}

async function hashText(text: string): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(text),
    );
    return [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  return createHash("sha256").update(text).digest("hex");
}

function inferTitle(
  sections: Array<{ section_type: string; title: string | null }>,
  filename: string,
): string {
  const firstChapter = sections.find((section) =>
    section.section_type === "chapter" && section.title,
  );
  if (firstChapter?.title) return firstChapter.title;

  return filename.replace(/\.[^.]+$/, "");
}

function unauthorizedResponse() {
  return NextResponse.json(
    { error: { code: "UNAUTHORIZED", message: "请先登录" } },
    { status: 401 },
  );
}

function validationErrorResponse(message: string) {
  return NextResponse.json(
    { error: { code: "VALIDATION_ERROR", message } },
    { status: 400 },
  );
}

function sessionLockedResponse() {
  return NextResponse.json(
    { error: { code: "SESSION_LOCKED", message: "当前迁移状态不能重新上传文件" } },
    { status: 409 },
  );
}
