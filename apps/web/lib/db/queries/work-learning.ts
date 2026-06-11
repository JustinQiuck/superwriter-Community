import { createClient } from "@/lib/supabase/server";
import type { TechniqueCard } from "@/lib/work-learning/types";
import type { TechniqueCardRecord } from "@/types/work-learning";

export interface SaveTechniqueCardInput {
  card: TechniqueCard;
  sourceTitle?: string | null;
  sourceHash: string;
  sourceLength: number;
  targetStoryId?: string | null;
  tags?: string[];
}

export async function listTechniqueCards(
  userId: string,
  options: {
    skillId?: string | null;
    targetStoryId?: string | null;
    limit?: number;
  } = {},
): Promise<TechniqueCardRecord[]> {
  const supabase = await createClient();
  const limit = Math.min(100, Math.max(1, options.limit ?? 50));

  let query = supabase
    .from("technique_cards")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options.skillId) {
    query = query.eq("skill_id", options.skillId);
  }

  if (options.targetStoryId) {
    query = query.eq("target_story_id", options.targetStoryId);
  }

  const { data, error } = await query;
  if (error) throwDbError("读取方法库失败", error);
  return (data ?? []).map(mapTechniqueCardRecord);
}

export async function saveTechniqueCards(
  userId: string,
  inputs: SaveTechniqueCardInput[],
): Promise<TechniqueCardRecord[]> {
  if (inputs.length === 0) return [];

  const supabase = await createClient();
  const rows = inputs.map((input) => ({
    user_id: userId,
    skill_id: input.card.skillId,
    title: input.card.title,
    source_title: input.sourceTitle ?? null,
    source_hash: input.sourceHash,
    source_length: input.sourceLength,
    target_story_id: input.targetStoryId ?? null,
    card: input.card,
    application_intents: input.card.applicationIntents,
    tags: input.tags ?? [],
  }));

  const { data, error } = await supabase
    .from("technique_cards")
    .insert(rows)
    .select("*");

  if (error) throwDbError("保存技法卡失败", error);
  return (data ?? []).map(mapTechniqueCardRecord);
}

export async function getTechniqueCardById(
  userId: string,
  cardId: string,
): Promise<TechniqueCardRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("technique_cards")
    .select("*")
    .eq("id", cardId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throwDbError("读取技法卡失败", error);
  return data ? mapTechniqueCardRecord(data) : null;
}

function throwDbError(label: string, error: unknown): never {
  const message = typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
    ? error.message
    : String(error);
  throw new Error(`${label}：${message}`);
}

function mapTechniqueCardRecord(row: Record<string, unknown>): TechniqueCardRecord {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    skillId: row.skill_id as TechniqueCardRecord["skillId"],
    title: row.title as string,
    sourceTitle: (row.source_title ?? null) as string | null,
    sourceHash: row.source_hash as string,
    sourceLength: (row.source_length ?? 0) as number,
    targetStoryId: (row.target_story_id ?? null) as string | null,
    card: row.card as TechniqueCard,
    applicationIntents: (row.application_intents ?? []) as TechniqueCardRecord["applicationIntents"],
    tags: (row.tags ?? []) as string[],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
