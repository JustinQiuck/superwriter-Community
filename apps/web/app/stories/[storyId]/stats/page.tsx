"use client";

import { use, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Type, MapPin, Users, FileText, Target } from "lucide-react";

interface StoryStats {
  title: string;
  totalWords: number;
  totalChapters: number;
  totalCharacters: number;
  totalLocations: number;
  totalEntities: number;
  entityTypeCounts: Record<string, number>;
  wordCountGoal: number | null;
  dailyWordGoal: number | null;
  goalProgress: number | null;
  chapterStats: { name: string; position: number; wordCount: number; updatedAt: string }[];
  createdAt: string;
}

export default function StoryStatsPage({
  params,
}: {
  params: Promise<{ storyId: string }>;
}) {
  const { storyId } = use(params);
  const [stats, setStats] = useState<StoryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/stories/${storyId}/stats`)
      .then((r) => r.json())
      .then((d) => setStats(d.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [storyId]);

  if (loading) {
    return <div className="p-6 text-muted-foreground">加载中...</div>;
  }

  if (!stats) {
    return <div className="p-6 text-muted-foreground">无法加载统计数据</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">写作统计</h1>
        <span className="text-sm text-muted-foreground">{stats.title}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Type className="h-5 w-5" />} label="总字数" value={stats.totalWords.toLocaleString()} />
        <StatCard icon={<FileText className="h-5 w-5" />} label="章节数" value={stats.totalChapters} />
        <StatCard icon={<Users className="h-5 w-5" />} label="角色数" value={stats.totalCharacters} />
        <StatCard icon={<MapPin className="h-5 w-5" />} label="地点数" value={stats.totalLocations} />
      </div>

      {stats.wordCountGoal && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              目标进度
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{stats.totalWords.toLocaleString()} 字</span>
                <span className="text-muted-foreground">目标 {stats.wordCountGoal.toLocaleString()} 字</span>
              </div>
              <div className="h-3 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${stats.goalProgress ?? 0}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground text-right">
                {stats.goalProgress}% 完成
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            章节字数分布
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.chapterStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无章节</p>
          ) : (
            <div className="space-y-3">
              {stats.chapterStats.map((ch) => {
                const maxWords = Math.max(...stats.chapterStats.map((c) => c.wordCount), 1);
                const pct = Math.round((ch.wordCount / maxWords) * 100);
                return (
                  <div key={ch.position} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="truncate max-w-[60%]">{ch.name}</span>
                      <span className="text-muted-foreground">{ch.wordCount.toLocaleString()} 字</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full bg-primary/70" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">实体统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(stats.entityTypeCounts).map(([type, count]) => (
              <div key={type} className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground mt-1">{type}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-sm">{label}</span>
        </div>
        <p className="mt-2 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
