// apps/web/app/api/stories/[storyId]/sessions/route.ts
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const { storyId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    action: "start" | "end";
    sessionId?: string;
    wordsWritten?: number;
    wordsDeleted?: number;
  };
  const { action, sessionId, wordsWritten, wordsDeleted } = body;

  if (action === "start") {
    const { data, error } = await supabase
      .from("writing_sessions")
      .insert({
        story_id: storyId,
        user_id: user.id,
        start_time: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ data });
  }

  if (action === "end" && sessionId) {
    const { error } = await supabase
      .from("writing_sessions")
      .update({
        end_time: new Date().toISOString(),
        words_written: wordsWritten ?? 0,
        words_deleted: wordsDeleted ?? 0,
      })
      .eq("id", sessionId)
      .eq("user_id", user.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
}
