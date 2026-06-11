import { createClient } from "@/lib/supabase/server";
import type { Entity } from "@/types/entity";
import type { EntityType } from "@superwriter/shared";

export async function getEntities(storyId: string, type?: EntityType) {
  const supabase = await createClient();

  let query = supabase
    .from("entities")
    .select("*")
    .eq("story_id", storyId)
    .order("sort_order", { ascending: true });

  if (type) {
    query = query.eq("type", type);
  }

  const { data } = await query;
  return (data ?? []) as Entity[];
}

export async function getEntityById(storyId: string, entityId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("entities")
    .select("*")
    .eq("story_id", storyId)
    .eq("id", entityId)
    .single();

  return data as Entity | null;
}

export async function createEntity(
  storyId: string,
  input: {
    type: EntityType;
    name: string;
    data?: Record<string, unknown>;
    content?: string;
    tags?: string[];
    color?: string;
    sort_order?: number;
    status?: string;
    timeline_date?: string;
  },
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("entities")
    .insert({
      story_id: storyId,
      ...input,
      data: input.data ?? {},
      tags: input.tags ?? [],
    })
    .select()
    .single();

  if (error) throw error;
  return data as Entity;
}

export async function updateEntity(
  storyId: string,
  entityId: string,
  input: Partial<{
    name: string;
    data: Record<string, unknown>;
    content: string;
    tags: string[];
    color: string;
    sort_order: number;
    status: string;
    timeline_date: string;
    cover_image_url: string;
    ai_context: string;
  }>,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entities")
    .update(input)
    .eq("story_id", storyId)
    .eq("id", entityId)
    .select()
    .single();

  if (error) throw error;
  return data as Entity;
}

export async function deleteEntity(storyId: string, entityId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("entities")
    .delete()
    .eq("story_id", storyId)
    .eq("id", entityId);

  if (error) throw error;
}

export async function reorderEntities(
  storyId: string,
  type: EntityType,
  orderedIds: string[],
) {
  const supabase = await createClient();

  const updates = orderedIds.map((id, index) =>
    supabase
      .from("entities")
      .update({ sort_order: index })
      .eq("story_id", storyId)
      .eq("id", id),
  );

  await Promise.all(updates);
}
