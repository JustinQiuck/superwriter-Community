import { createClient } from "@/lib/supabase/server";
import {
  upsertCoreMemory,
  getCoreMemory,
} from "@/lib/db/queries/memories";
import { getDeviationStats } from "@/lib/db/queries/deviations";
import type {
  CurrentSnapshot,
  StorySettings,
  CreatorPreferences,
} from "@/types/memory";

export async function rebuildCoreMemory(storyId: string): Promise<void> {
  const supabase = await createClient();

  const [storyRes, blueprintRes, chaptersRes, charactersRes] =
    await Promise.all([
      supabase
        .from("stories")
        .select("title, genre, era, description")
        .eq("id", storyId)
        .single(),
      supabase
        .from("story_blueprints")
        .select("synopsis")
        .eq("story_id", storyId)
        .single(),
      supabase
        .from("entities")
        .select("data, name, content, ai_context")
        .eq("story_id", storyId)
        .eq("type", "chapter")
        .order("sort_order"),
      supabase
        .from("entities")
        .select("id, name, data, ai_context")
        .eq("story_id", storyId)
        .eq("type", "character")
        .order("sort_order")
        .limit(8),
    ]);

  const story = storyRes.data;
  const blueprint = blueprintRes.data;
  const chapters = chaptersRes.data ?? [];
  const characters = charactersRes.data ?? [];

  const storySettings: StorySettings = {
    title: story?.title ?? "",
    genre: story?.genre ?? "未指定",
    era: story?.era ?? "未指定",
    synopsis: blueprint?.synopsis ?? story?.description ?? "",
  };

  const latestChapter = chapters[chapters.length - 1];

  const { data: activeBeat } = await supabase
    .from("blueprint_beats")
    .select("title")
    .eq("story_id", storyId)
    .eq("status", "writing")
    .order("sort_order")
    .limit(1)
    .single();

  const totalWords = chapters.reduce(
    (sum, ch) => sum + ((ch.data as Record<string, unknown>)?.word_count as number ?? 0),
    0,
  );

  let deviationSummary: string | undefined;
  try {
    const deviationStats = await getDeviationStats(storyId);
    if (deviationStats.pending > 0) {
      const parts: string[] = [];
      if (deviationStats.byType.emotion) parts.push(`${deviationStats.byType.emotion}个情绪偏差`);
      if (deviationStats.byType.character_absence) parts.push(`${deviationStats.byType.character_absence}个角色缺席`);
      if (deviationStats.byType.pacing) parts.push(`${deviationStats.byType.pacing}个节奏偏差`);
      if (deviationStats.byType.setting_contradiction) parts.push(`${deviationStats.byType.setting_contradiction}个设定矛盾`);
      deviationSummary = `${deviationStats.pending}个偏差待处理：${parts.join("、")}`;
    }
  } catch {
    // deviation stats are optional enrichment
  }

  const currentSnapshot: CurrentSnapshot = {
    currentChapter:
      (latestChapter?.data as Record<string, unknown>)?.chapter_number as number ??
      chapters.length,
    currentBeat: activeBeat?.title ?? "未开始",
    totalWords,
    mainCharacters: characters.map((c) => ({
      name: c.name,
      status:
        ((c.data as Record<string, unknown>)?.arc as Record<string, unknown>)
          ?.starting_state as string ??
        (c.ai_context as string) ??
        "正常",
    })),
    lastUpdated: new Date().toISOString(),
    recentDeviationSummary: deviationSummary,
  };

  const existing = await getCoreMemory(storyId);
  const defaultPreferences: CreatorPreferences = {
    writingStyle: "自然流畅",
    tonePreference: "",
    avgSentenceLength: "",
    customNotes: "",
  };

  await upsertCoreMemory(storyId, {
    storySettings,
    currentSnapshot,
    creatorPreferences: existing?.creatorPreferences ?? defaultPreferences,
    keyConstraints: existing?.keyConstraints ?? [],
  });
}
