import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storyId: string; eventId: string }> }
) {
  const { storyId, eventId } = await params;
  const body = await request.json();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("timeline_events")
    .update(body)
    .eq("story_id", storyId)
    .eq("id", eventId)
    .select()
    .single();

  if (error) {
    return Response.json(
      { error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 }
    );
  }

  return Response.json({ data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ storyId: string; eventId: string }> }
) {
  const { storyId, eventId } = await params;
  const supabase = await createClient();

  const { error } = await supabase
    .from("timeline_events")
    .delete()
    .eq("story_id", storyId)
    .eq("id", eventId);

  if (error) {
    return Response.json(
      { error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 }
    );
  }

  return Response.json({ ok: true });
}
