import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storyId: string }> },
) {
  const { storyId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("timeline_events")
    .select("*")
    .eq("story_id", storyId)
    .order("start_date", { ascending: true });

  return Response.json({ data: data ?? [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storyId: string }> },
) {
  const { storyId } = await params;
  const body = await request.json();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("timeline_events")
    .insert({ story_id: storyId, ...body })
    .select()
    .single();

  if (error) {
    return Response.json(
      { error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return Response.json({ data }, { status: 201 });
}
