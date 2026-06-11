import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, FileText, Users, MapPin } from "lucide-react";

export default async function WritingStatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: stories } = await supabase
    .from("stories")
    .select("id, title, word_count_goal, daily_word_goal")
    .eq("user_id", user.id);

  const { data: allChapters } = await supabase
    .from("entities")
    .select("story_id, content, entity_type")
    .eq("entity_type", "chapter")
    .in(
      "story_id",
      (stories ?? []).map((s) => s.id),
    );

  const { data: allEntities } = await supabase
    .from("entities")
    .select("entity_type, story_id")
    .in(
      "story_id",
      (stories ?? []).map((s) => s.id),
    );

  const storyList = stories ?? [];

  const totalStories = storyList.length;
  let totalWords = 0;
  let totalChapters = 0;
  let totalCharacters = 0;
  let totalLocations = 0;

  const storyStats = storyList.map((story) => {
    const chapters = (allChapters ?? []).filter(
      (c) => c.story_id === story.id,
    );
    const entities = (allEntities ?? []).filter(
      (e) => e.story_id === story.id,
    );
    const chars = entities.filter((e) => e.entity_type === "character").length;
    const locs = entities.filter((e) => e.entity_type === "location").length;

    const words = chapters.reduce((sum, ch) => {
      const text = (ch.content ?? "").replace(/<[^>]*>/g, "").trim();
      const chinese =
        text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g)?.length ?? 0;
      const english = text
        .replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, " ")
        .split(/\s+/)
        .filter((w: string) => w.length > 0).length;
      return sum + chinese + english;
    }, 0);

    totalWords += words;
    totalChapters += chapters.length;
    totalCharacters += chars;
    totalLocations += locs;

    const goalProgress = story.word_count_goal
      ? Math.min(100, Math.round((words / story.word_count_goal) * 100))
      : null;

    return {
      ...story,
      words,
      chapterCount: chapters.length,
      characterCount: chars,
      locationCount: locs,
      goalProgress,
    };
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">全局写作统计</h1>
        <p className="text-muted-foreground">所有故事的写作概览</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总故事数</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStories}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总字数</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWords.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总角色数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCharacters}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总地点数</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLocations}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">各故事统计</h2>
        {storyStats.length === 0 ? (
          <p className="text-muted-foreground">还没有故事数据</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {storyStats.map((story) => (
              <Card key={story.id}>
                <CardHeader>
                  <CardTitle className="text-base">{story.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">字数</span>
                      <span className="font-medium">{story.words.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">章节</span>
                      <span className="font-medium">{story.chapterCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">角色</span>
                      <span className="font-medium">{story.characterCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">地点</span>
                      <span className="font-medium">{story.locationCount}</span>
                    </div>
                    {story.goalProgress !== null && (
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">目标进度</span>
                          <span className="font-medium">{story.goalProgress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${story.goalProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
