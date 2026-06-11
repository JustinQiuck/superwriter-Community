import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { AIArtifactAppliedTarget, AIArtifactStatus } from "@/types/ai";

const VALID_STATUSES = new Set<AIArtifactStatus>([
  "pending",
  "applied",
  "saved",
  "discarded",
]);

const VALID_APPLY_MODES = new Set(["insert", "replace", "append"]);

function isNoRowsError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string; details?: string };
  const text = `${candidate.message ?? ""} ${candidate.details ?? ""}`.toLowerCase();
  return (
    candidate.code === "PGRST116" ||
    text.includes("no rows") ||
    text.includes("0 rows") ||
    text.includes("single json object") ||
    text.includes("singular json object")
  );
}

function isAppliedTarget(value: unknown): value is AIArtifactAppliedTarget {
  if (!value || typeof value !== "object") return false;
  const target = value as Partial<AIArtifactAppliedTarget>;
  return (
    typeof target.chapterId === "string" &&
    typeof target.requestId === "string" &&
    typeof target.applyMode === "string" &&
    VALID_APPLY_MODES.has(target.applyMode)
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storyId: string; generationId: string }> },
) {
  const { storyId, generationId } = await params;
  const body = await request.json().catch(() => null);
  const status = body?.status as AIArtifactStatus | undefined;

  if (!status || !VALID_STATUSES.has(status)) {
    return NextResponse.json(
      { error: { code: "INVALID_STATUS", message: "无效的 AI 产物状态" } },
      { status: 400 },
    );
  }

  if (status === "applied" && !isAppliedTarget(body?.appliedTarget)) {
    return NextResponse.json(
      { error: { code: "INVALID_APPLIED_TARGET", message: "缺少正文采用目标" } },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "请先登录" } },
      { status: 401 },
    );
  }

  const { data: story } = await supabase
    .from("stories")
    .select("id")
    .eq("id", storyId)
    .eq("user_id", user.id)
    .single();

  if (!story) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "故事不存在或无权访问" } },
      { status: 404 },
    );
  }

  const appliedAt = status === "applied" ? new Date().toISOString() : null;
  const accepted =
    status === "applied" ? true : status === "discarded" ? false : null;

  const { data, error } = await supabase
    .from("ai_generations")
    .update({
      status,
      accepted,
      applied_target: status === "applied" ? body.appliedTarget : {},
      applied_at: appliedAt,
    })
    .eq("id", generationId)
    .eq("story_id", storyId)
    .eq("user_id", user.id)
    .select("id, status, accepted, applied_target, applied_at")
    .single();

  if (error) {
    if (isNoRowsError(error)) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "AI 产物不存在或无权访问" } },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "AI 产物不存在或无权访问" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data });
}
