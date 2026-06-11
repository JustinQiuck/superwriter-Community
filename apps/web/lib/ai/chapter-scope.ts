import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type ScopedChapterResult =
  | { ok: true; chapterId: string | null }
  | { ok: false };

export type ScopedEntityIdsResult =
  | { ok: true; entityIds: string[] }
  | { ok: false };

export async function resolveScopedChapterId(
  supabase: SupabaseServerClient,
  storyId: string,
  chapterId?: string | null,
): Promise<ScopedChapterResult> {
  if (!chapterId) {
    return { ok: true, chapterId: null };
  }

  const { data, error } = await supabase
    .from("entities")
    .select("id")
    .eq("id", chapterId)
    .eq("story_id", storyId)
    .eq("type", "chapter")
    .single();

  if (error || !data?.id) {
    return { ok: false };
  }

  return { ok: true, chapterId: data.id };
}

export async function resolveScopedEntityIds(
  supabase: SupabaseServerClient,
  storyId: string,
  entityIds: string[] | undefined,
  entityType: "character" | "location",
): Promise<ScopedEntityIdsResult> {
  const requestedIds = [...new Set(entityIds ?? [])].filter(Boolean);
  if (requestedIds.length === 0) {
    return { ok: true, entityIds: [] };
  }

  const { data, error } = await supabase
    .from("entities")
    .select("id")
    .eq("story_id", storyId)
    .in("id", requestedIds)
    .in("type", [entityType]);

  if (error) {
    return { ok: false };
  }

  const scopedIds = new Set((data ?? []).map((row) => row.id));
  if (scopedIds.size !== requestedIds.length) {
    return { ok: false };
  }

  return {
    ok: true,
    entityIds: requestedIds.filter((id) => scopedIds.has(id)),
  };
}
