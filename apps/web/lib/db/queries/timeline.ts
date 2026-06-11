import { createClient } from "@/lib/supabase/server";
import type { TimelineEvent } from "@/types/entity";

export async function getTimelineEvents(storyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("timeline_events")
    .select("*")
    .eq("story_id", storyId)
    .order("start_date", { ascending: true });
  return (data ?? []) as TimelineEvent[];
}

export async function createTimelineEvent(
  storyId: string,
  input: {
    title: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    start_time?: string;
    color?: string;
    track?: string;
    information_node?: boolean;
    entity_id?: string;
    chapter_id?: string;
  }
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timeline_events")
    .insert({ story_id: storyId, track: "main", ...input })
    .select()
    .single();
  if (error) throw error;
  return data as TimelineEvent;
}

export async function updateTimelineEvent(
  storyId: string,
  eventId: string,
  input: Partial<{
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    start_time: string;
    color: string;
    track: string;
    information_node: boolean;
  }>
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timeline_events")
    .update(input)
    .eq("story_id", storyId)
    .eq("id", eventId)
    .select()
    .single();
  if (error) throw error;
  return data as TimelineEvent;
}

export async function deleteTimelineEvent(storyId: string, eventId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("timeline_events")
    .delete()
    .eq("story_id", storyId)
    .eq("id", eventId);
  if (error) throw error;
}
