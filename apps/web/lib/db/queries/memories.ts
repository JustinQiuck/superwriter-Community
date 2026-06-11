import { createClient } from "@/lib/supabase/server";
import type { ArchivalSourceType, RecallOperationType } from "@superwriter/shared";
import type {
  CoreMemory,
  CoreMemoryData,
  CreatorPreferences,
  RecallMemory,
} from "@/types/memory";

export async function getCoreMemory(
  storyId: string,
): Promise<CoreMemory | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("story_core_memories")
    .select("*")
    .eq("story_id", storyId)
    .single();
  if (error || !data) return null;
  return mapCoreMemory(data);
}

export async function upsertCoreMemory(
  storyId: string,
  data: Partial<CoreMemoryData>,
): Promise<CoreMemory | null> {
  const supabase = await createClient();

  const updateFields: Record<string, unknown> = {};
  if (data.storySettings !== undefined)
    updateFields.story_settings = data.storySettings;
  if (data.currentSnapshot !== undefined)
    updateFields.current_snapshot = data.currentSnapshot;
  if (data.creatorPreferences !== undefined)
    updateFields.creator_preferences = data.creatorPreferences;
  if (data.keyConstraints !== undefined)
    updateFields.key_constraints = data.keyConstraints;

  const allText = JSON.stringify({
    ...(data.storySettings ?? {}),
    ...(data.currentSnapshot ?? {}),
    ...(data.creatorPreferences ?? {}),
    constraints: data.keyConstraints ?? [],
  });
  updateFields.token_estimate = Math.ceil(allText.length * 0.7);

  const { data: upserted, error } = await supabase
    .from("story_core_memories")
    .upsert(
      { story_id: storyId, ...updateFields },
      { onConflict: "story_id" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return mapCoreMemory(upserted);
}

export async function updateCoreMemoryPreferences(
  storyId: string,
  preferences: Partial<CoreMemoryData["creatorPreferences"]>,
): Promise<CoreMemory | null> {
  const current = await getCoreMemory(storyId);
  const merged: CreatorPreferences = {
    writingStyle: preferences.writingStyle ?? current?.creatorPreferences.writingStyle ?? "",
    tonePreference: preferences.tonePreference ?? current?.creatorPreferences.tonePreference ?? "",
    avgSentenceLength: preferences.avgSentenceLength ?? current?.creatorPreferences.avgSentenceLength ?? "",
    customNotes: preferences.customNotes ?? current?.creatorPreferences.customNotes ?? "",
  };
  return upsertCoreMemory(storyId, {
    ...current,
    creatorPreferences: merged,
  });
}

export async function addKeyConstraint(
  storyId: string,
  constraint: string,
): Promise<CoreMemory | null> {
  const current = await getCoreMemory(storyId);
  const existingConstraints = current?.keyConstraints ?? [];
  const normalizedConstraint = normalizeConstraint(constraint);
  const constraints = existingConstraints.some((item) => normalizeConstraint(item) === normalizedConstraint)
    ? existingConstraints
    : [...existingConstraints, constraint];
  return upsertCoreMemory(storyId, {
    storySettings: current?.storySettings,
    currentSnapshot: current?.currentSnapshot,
    creatorPreferences: current?.creatorPreferences,
    keyConstraints: constraints,
  });
}

function normalizeConstraint(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export async function removeKeyConstraint(
  storyId: string,
  index: number,
): Promise<CoreMemory | null> {
  const current = await getCoreMemory(storyId);
  const constraints = [...(current?.keyConstraints ?? [])];
  constraints.splice(index, 1);
  return upsertCoreMemory(storyId, {
    storySettings: current?.storySettings,
    currentSnapshot: current?.currentSnapshot,
    creatorPreferences: current?.creatorPreferences,
    keyConstraints: constraints,
  });
}

export async function storeArchivalMemory(
  storyId: string,
  sourceType: ArchivalSourceType,
  sourceId: string,
  segments: { text: string; index: number; embedding: number[] }[],
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const supabase = await createClient();

  const rows = segments.map((seg) => ({
    story_id: storyId,
    source_type: sourceType,
    source_id: sourceId,
    segment_index: seg.index,
    content: seg.text,
    content_embedding: seg.embedding,
    metadata,
  }));

  const { error: deleteError } = await supabase
    .from("story_archival_memories")
    .delete()
    .eq("story_id", storyId)
    .eq("source_type", sourceType)
    .eq("source_id", sourceId);

  if (deleteError) throw deleteError;

  if (rows.length > 0) {
    const { error: insertError } = await supabase
      .from("story_archival_memories")
      .insert(rows);
    if (insertError) throw insertError;
  }
}

export async function searchArchivalMemory(
  storyId: string,
  queryEmbedding: number[],
  matchThreshold = 0.6,
  matchCount = 5,
): Promise<
  {
    content: string;
    relevance: number;
    sourceType: string;
    metadata: Record<string, unknown>;
  }[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("match_archival_memories", {
    p_story_id: storyId,
    p_query_embedding: queryEmbedding,
    p_match_threshold: matchThreshold,
    p_match_count: matchCount,
  });

  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => ({
    content: row.content as string,
    relevance: row.similarity as number,
    sourceType: row.source_type as string,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  }));
}

export async function getArchivalMemoryStats(
  storyId: string,
): Promise<{ count: number; lastUpdated: string | null }> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("story_archival_memories")
    .select("*", { count: "exact", head: true })
    .eq("story_id", storyId);
  const { data: latest } = await supabase
    .from("story_archival_memories")
    .select("created_at")
    .eq("story_id", storyId)
    .order("created_at", { ascending: false })
    .limit(1);
  return {
    count: count ?? 0,
    lastUpdated: latest?.[0]?.created_at ?? null,
  };
}

export async function addRecallMemory(
  storyId: string,
  operationType: RecallOperationType,
  summary: string,
  context: Record<string, unknown> = {},
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("story_recall_memories").insert({
    story_id: storyId,
    operation_type: operationType,
    summary: summary.slice(0, 200),
    context,
  });
  if (error) throw error;
}

export async function getRecentRecallMemories(
  storyId: string,
  limit = 10,
): Promise<RecallMemory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("story_recall_memories")
    .select("*")
    .eq("story_id", storyId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(mapRecallMemory);
}

function mapCoreMemory(data: Record<string, unknown>): CoreMemory {
  return {
    id: data.id as string,
    storyId: data.story_id as string,
    storySettings: (data.story_settings ?? {}) as CoreMemory["storySettings"],
    currentSnapshot: (data.current_snapshot ?? {}) as CoreMemory["currentSnapshot"],
    creatorPreferences: (data.creator_preferences ?? {}) as CoreMemory["creatorPreferences"],
    keyConstraints: (data.key_constraints ?? []) as string[],
    tokenEstimate: (data.token_estimate ?? 0) as number,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function mapRecallMemory(data: Record<string, unknown>): RecallMemory {
  return {
    id: data.id as string,
    storyId: data.story_id as string,
    operationType: data.operation_type as RecallOperationType,
    summary: data.summary as string,
    context: (data.context ?? {}) as Record<string, unknown>,
    createdAt: data.created_at as string,
  };
}
