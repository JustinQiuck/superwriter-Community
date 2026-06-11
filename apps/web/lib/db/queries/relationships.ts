import { createClient } from "@/lib/supabase/server";
import type { Relationship } from "@/types/entity";
import type { RelationshipType } from "@superwriter/shared";

export async function getRelationships(storyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("relationships")
    .select("*")
    .eq("story_id", storyId)
    .order("created_at", { ascending: true });

  return (data ?? []) as Relationship[];
}

export async function createRelationship(
  storyId: string,
  input: {
    from_entity_id: string;
    to_entity_id: string;
    type: RelationshipType;
    description?: string;
    bidirectional?: boolean;
    evolution?: { chapter_number?: number; state?: string; description?: string; [key: string]: unknown }[];
  },
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("relationships")
    .insert({ story_id: storyId, ...input })
    .select()
    .single();

  if (error) throw error;
  return data as Relationship;
}

export async function updateRelationship(
  storyId: string,
  relationshipId: string,
  input: Partial<{
    type: RelationshipType;
    description: string;
    bidirectional: boolean;
    evolution: { chapter_number: number; state: string; description: string }[];
  }>,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("relationships")
    .update(input)
    .eq("story_id", storyId)
    .eq("id", relationshipId)
    .select()
    .single();

  if (error) throw error;
  return data as Relationship;
}

export async function deleteRelationship(
  storyId: string,
  relationshipId: string,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("relationships")
    .delete()
    .eq("story_id", storyId)
    .eq("id", relationshipId);

  if (error) throw error;
}
