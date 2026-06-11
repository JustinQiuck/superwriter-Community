import { createClient } from "@/lib/supabase/server";

export async function getWritingStats(storyId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: story } = await supabase
    .from("stories")
    .select("id, title, word_count_goal, daily_word_goal, created_at")
    .eq("id", storyId)
    .eq("user_id", user.id)
    .single();

  if (!story) return null;

  const { data: chapters } = await supabase
    .from("entities")
    .select("name, content, position, created_at, updated_at")
    .eq("story_id", storyId)
    .eq("entity_type", "chapter")
    .order("position", { ascending: true });

  const { data: characters } = await supabase
    .from("entities")
    .select("id")
    .eq("story_id", storyId)
    .eq("entity_type", "character");

  const { data: locations } = await supabase
    .from("entities")
    .select("id")
    .eq("story_id", storyId)
    .eq("entity_type", "location");

  const { data: allEntities } = await supabase
    .from("entities")
    .select("entity_type")
    .eq("story_id", storyId);

  const chapterList = chapters ?? [];
  let totalWords = 0;
  const chapterStats = chapterList.map((ch) => {
    const words = countWords(ch.content ?? "");
    totalWords += words;
    return {
      name: ch.name,
      position: ch.position,
      wordCount: words,
      updatedAt: ch.updated_at,
    };
  });

  const goalProgress = story.word_count_goal
    ? Math.min(100, Math.round((totalWords / story.word_count_goal) * 100))
    : null;

  const entityTypeCounts: Record<string, number> = {};
  for (const e of allEntities ?? []) {
    entityTypeCounts[e.entity_type] = (entityTypeCounts[e.entity_type] ?? 0) + 1;
  }

  return {
    title: story.title,
    totalWords,
    totalChapters: chapterList.length,
    totalCharacters: characters?.length ?? 0,
    totalLocations: locations?.length ?? 0,
    totalEntities: allEntities?.length ?? 0,
    entityTypeCounts,
    wordCountGoal: story.word_count_goal,
    dailyWordGoal: story.daily_word_goal,
    goalProgress,
    chapterStats,
    createdAt: story.created_at,
  };
}

function countWords(html: string): number {
  const text = html.replace(/<[^>]*>/g, "").trim();
  if (!text) return 0;
  const chinese = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g)?.length ?? 0;
  const english = text
    .replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  return chinese + english;
}
