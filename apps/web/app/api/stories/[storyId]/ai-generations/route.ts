import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storyId: string }> },
) {
  const { storyId } = await params;
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  const chapterId = searchParams.get("chapterId");
  const status = searchParams.get("status");
  const contentType = searchParams.get("contentType");
  const requestedLimit = Number(searchParams.get("limit") ?? 20);
  const limit = Math.min(50, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 20));
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

  let query = supabase
    .from("ai_generations")
    .select("id, story_id, mode, prompt, result, model, created_at, context_entity_ids, chapter_id, source, content_type, status, applied_target, applied_at")
    .eq("story_id", storyId)
    .eq("user_id", user.id);

  if (mode) {
    query = query.eq("mode", mode);
  }

  if (chapterId) {
    query = query.eq("chapter_id", chapterId);
  }

  if (status) {
    query = query.eq("status", status);
  }

  if (contentType) {
    query = query.eq("content_type", contentType);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (isMissingArtifactSchema(error)) {
      return NextResponse.json({ data: [] });
    }

    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: data ?? [] });
}

function isMissingArtifactSchema(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: unknown; message?: unknown };
  const message = typeof maybeError.message === "string" ? maybeError.message : "";

  return maybeError.code === "PGRST204" && message.includes("ai_generations");
}
