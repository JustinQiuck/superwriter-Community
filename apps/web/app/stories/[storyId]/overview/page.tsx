import { getStoryById } from "@/lib/db/queries/stories";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STORY_STATUS_LABELS, type StoryStatus } from "@superwriter/shared";
import { BookOpen, Target, Calendar, PenLine, Route, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function StoryOverviewPage({
  params,
}: {
  params: Promise<{ storyId: string }>;
}) {
  const { storyId } = await params;
  const story = await getStoryById(storyId);

  if (!story) notFound();

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">{story.title}</h1>
          <Badge variant="secondary">
            {STORY_STATUS_LABELS[story.status as StoryStatus] ?? story.status}
          </Badge>
        </div>
        {story.description && (
          <p className="mt-2 text-muted-foreground">{story.description}</p>
        )}
        <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
          {story.genre && (
            <span className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              {story.genre}
            </span>
          )}
          {story.era && <span>时代: {story.era}</span>}
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            创建于 {new Date(story.created_at).toLocaleDateString("zh-CN")}
          </span>
        </div>
      </div>

      <section className="studio-soft-panel mb-6 rounded-lg p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold">下一步</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              可以先建立蓝图，也可以直接写第一章；后续系统会把正文和蓝图互相同步。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/stories/${storyId}/blueprint`}>
                <Route className="h-4 w-4" />
                开始规划蓝图
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/stories/${storyId}/editor`}>
                <PenLine className="h-4 w-4" />
                直接写第一章
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href={`/stories/${storyId}/entities/characters`}>
                <UserRound className="h-4 w-4" />
                创建主角
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">目标字数</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {story.word_count_goal.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">字</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">每日目标</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {story.daily_word_goal.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">字/天</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">语言</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {story.language === "zh" ? "中文" : "English"}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
