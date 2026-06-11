import { createClient } from "@/lib/supabase/server";
import type {
  StoryBlueprint,
  BlueprintBeat,
  BlueprintVolume,
  BlueprintChapter,
  BlueprintHealthMetrics,
} from "@/types/entity";
import type { BeatType, BeatStatus } from "@superwriter/shared";

export async function getBlueprint(storyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("story_blueprints")
    .select("*")
    .eq("story_id", storyId)
    .single();

  return data as StoryBlueprint | null;
}

export async function getBlueprintWithBeats(storyId: string) {
  const supabase = await createClient();

  const [blueprintResult, beatsResult] = await Promise.all([
    supabase
      .from("story_blueprints")
      .select("*")
      .eq("story_id", storyId)
      .single(),
    supabase
      .from("blueprint_beats")
      .select("*")
      .eq("story_id", storyId)
      .order("sort_order", { ascending: true }),
  ]);

  if (blueprintResult.error || !blueprintResult.data) {
    return null;
  }

  return {
    blueprint: blueprintResult.data as StoryBlueprint,
    beats: (beatsResult.data ?? []) as BlueprintBeat[],
  };
}

export async function createBlueprint(
  storyId: string,
  input: {
    template_id?: string;
    title?: string;
    synopsis?: string;
    settings?: Record<string, unknown>;
  },
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("story_blueprints")
    .insert({
      story_id: storyId,
      title: input.title ?? "叙事蓝图",
      template_id: input.template_id,
      synopsis: input.synopsis,
      settings: input.settings ?? {},
    })
    .select()
    .single();

  if (error) throw error;
  return data as StoryBlueprint;
}

export async function updateBlueprint(
  storyId: string,
  input: Partial<{
    title: string;
    synopsis: string;
    health_metrics: BlueprintHealthMetrics;
    settings: Record<string, unknown>;
  }>,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("story_blueprints")
    .update(input)
    .eq("story_id", storyId)
    .select()
    .single();

  if (error) throw error;
  return data as StoryBlueprint;
}

export async function deleteBlueprint(storyId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("story_blueprints")
    .delete()
    .eq("story_id", storyId);

  if (error) throw error;
}

export async function getBeats(storyId: string, blueprintId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blueprint_beats")
    .select("*")
    .eq("story_id", storyId)
    .eq("blueprint_id", blueprintId)
    .order("sort_order", { ascending: true });

  return (data ?? []) as BlueprintBeat[];
}

export async function getBeatById(storyId: string, beatId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blueprint_beats")
    .select("*")
    .eq("story_id", storyId)
    .eq("id", beatId)
    .single();

  return data as BlueprintBeat | null;
}

export async function createBeat(
  storyId: string,
  blueprintId: string,
  input: {
    title: string;
    description?: string;
    beat_type?: BeatType;
    status?: BeatStatus;
    position_pct?: number;
    emotion_target?: number;
    suggested_character_ids?: string[];
    suggested_location_ids?: string[];
    synopsis?: string;
    content?: Record<string, unknown>;
    sort_order?: number;
  },
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blueprint_beats")
    .insert({
      story_id: storyId,
      blueprint_id: blueprintId,
      title: input.title,
      description: input.description,
      beat_type: input.beat_type ?? "custom",
      status: input.status ?? "planned",
      position_pct: input.position_pct ?? 0,
      emotion_target: input.emotion_target ?? 0,
      suggested_character_ids: input.suggested_character_ids ?? [],
      suggested_location_ids: input.suggested_location_ids ?? [],
      synopsis: input.synopsis,
      content: input.content ?? {},
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as BlueprintBeat;
}

export async function createBeats(
  storyId: string,
  blueprintId: string,
  beats: Array<{
    title: string;
    description?: string;
    beat_type?: BeatType;
    position_pct?: number;
    emotion_target?: number;
    suggested_character_ids?: string[];
    suggested_location_ids?: string[];
    synopsis?: string;
    content?: Record<string, unknown>;
    sort_order?: number;
  }>,
) {
  const supabase = await createClient();
  const rows = beats.map((beat, index) => ({
    story_id: storyId,
    blueprint_id: blueprintId,
    title: beat.title,
    description: beat.description,
    beat_type: beat.beat_type ?? "custom",
    status: "planned" as BeatStatus,
    position_pct: beat.position_pct ?? 0,
    emotion_target: beat.emotion_target ?? 0,
    suggested_character_ids: beat.suggested_character_ids ?? [],
    suggested_location_ids: beat.suggested_location_ids ?? [],
    synopsis: beat.synopsis,
    content: beat.content ?? {},
    sort_order: beat.sort_order ?? index,
  }));

  const { data, error } = await supabase
    .from("blueprint_beats")
    .insert(rows)
    .select();

  if (error) throw error;
  return (data ?? []) as BlueprintBeat[];
}

export async function updateBeat(
  storyId: string,
  beatId: string,
  input: Partial<{
    title: string;
    description: string;
    beat_type: BeatType;
    status: BeatStatus;
    position_pct: number;
    emotion_target: number;
    suggested_character_ids: string[];
    suggested_location_ids: string[];
    synopsis: string;
    content: Record<string, unknown>;
    sort_order: number;
  }>,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blueprint_beats")
    .update(input)
    .eq("story_id", storyId)
    .eq("id", beatId)
    .select()
    .single();

  if (error) throw error;
  return data as BlueprintBeat;
}

export async function deleteBeat(storyId: string, beatId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("blueprint_beats")
    .delete()
    .eq("story_id", storyId)
    .eq("id", beatId);

  if (error) throw error;
}

export async function reorderBeats(
  storyId: string,
  orderedIds: string[],
) {
  const supabase = await createClient();
  const updates = orderedIds.map((id, index) =>
    supabase
      .from("blueprint_beats")
      .update({ sort_order: index, position_pct: orderedIds.length > 1 ? Math.round((index / (orderedIds.length - 1)) * 100) : 0 })
      .eq("story_id", storyId)
      .eq("id", id),
  );
  await Promise.all(updates);
}

export async function getVolumes(storyId: string, blueprintId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blueprint_volumes")
    .select("*")
    .eq("story_id", storyId)
    .eq("blueprint_id", blueprintId)
    .order("sort_order", { ascending: true });

  return (data ?? []) as BlueprintVolume[];
}

export async function createVolume(
  storyId: string,
  blueprintId: string,
  input: { title: string; synopsis?: string; sort_order?: number },
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blueprint_volumes")
    .insert({
      story_id: storyId,
      blueprint_id: blueprintId,
      title: input.title,
      synopsis: input.synopsis,
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as BlueprintVolume;
}

export async function updateVolume(
  storyId: string,
  volumeId: string,
  input: Partial<{ title: string; synopsis: string; sort_order: number }>,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blueprint_volumes")
    .update(input)
    .eq("story_id", storyId)
    .eq("id", volumeId)
    .select()
    .single();

  if (error) throw error;
  return data as BlueprintVolume;
}

export async function deleteVolume(storyId: string, volumeId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("blueprint_volumes")
    .delete()
    .eq("story_id", storyId)
    .eq("id", volumeId);

  if (error) throw error;
}

export async function getBlueprintChapters(storyId: string, blueprintId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blueprint_chapters")
    .select("*")
    .eq("story_id", storyId)
    .eq("blueprint_id", blueprintId)
    .order("sort_order", { ascending: true });

  return (data ?? []) as BlueprintChapter[];
}

export async function createBlueprintChapter(
  storyId: string,
  blueprintId: string,
  input: {
    volume_id?: string;
    beat_id?: string;
    title: string;
    synopsis?: string;
    target_word_count?: number;
    target_emotion?: number;
    content_guidance?: Record<string, unknown>;
    sort_order?: number;
  },
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blueprint_chapters")
    .insert({
      story_id: storyId,
      blueprint_id: blueprintId,
      volume_id: input.volume_id,
      beat_id: input.beat_id,
      title: input.title,
      synopsis: input.synopsis,
      target_word_count: input.target_word_count,
      target_emotion: input.target_emotion ?? 0,
      content_guidance: input.content_guidance ?? {},
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as BlueprintChapter;
}

export async function updateBlueprintChapter(
  storyId: string,
  chapterId: string,
  input: Partial<{
    title: string;
    synopsis: string;
    beat_id: string;
    target_word_count: number;
    target_emotion: number;
    content_guidance: Record<string, unknown>;
    sort_order: number;
  }>,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blueprint_chapters")
    .update(input)
    .eq("story_id", storyId)
    .eq("id", chapterId)
    .select()
    .single();

  if (error) throw error;
  return data as BlueprintChapter;
}

export async function deleteBlueprintChapter(storyId: string, chapterId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("blueprint_chapters")
    .delete()
    .eq("story_id", storyId)
    .eq("id", chapterId);

  if (error) throw error;
}
