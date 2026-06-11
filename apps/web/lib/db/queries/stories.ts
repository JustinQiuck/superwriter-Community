import { createClient } from "@/lib/supabase/server";
import type { Story } from "@/types/entity";
import { STORY_STATUS_LABELS, type StoryStatus } from "@superwriter/shared";

export async function getStories() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("stories")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return (data ?? []) as Story[];
}

export async function getStoryById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("stories")
    .select("*")
    .eq("id", id)
    .single();

  return data as Story | null;
}

export async function createStory(input: {
  title: string;
  description?: string;
  genre?: string;
  era?: string;
  settings?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("stories")
    .insert({
      ...input,
      user_id: user.id,
      status: "draft",
      settings: input.settings ?? {},
    })
    .select()
    .single();

  if (error) throw error;
  return data as Story;
}

export async function updateStory(
  id: string,
  input: Partial<{
    title: string;
    description: string;
    genre: string;
    era: string;
    status: StoryStatus;
    cover_image_url: string;
    settings: Record<string, unknown>;
    word_count_goal: number;
    daily_word_goal: number;
  }>,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stories")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Story;
}

export async function deleteStory(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("stories").delete().eq("id", id);
  if (error) throw error;
}
