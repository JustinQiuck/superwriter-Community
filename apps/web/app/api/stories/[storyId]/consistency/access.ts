import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function assertStoryAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storyId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("stories")
    .select("id")
    .eq("id", storyId)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "故事不存在或无权访问" } },
      { status: 404 },
    );
  }

  return null;
}
