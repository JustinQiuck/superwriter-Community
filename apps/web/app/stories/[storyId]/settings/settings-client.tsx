"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { STORY_STATUS_LABELS, type StoryStatus } from "@superwriter/shared";
import { MemoryTab } from "./memory-tab";

export function StorySettingsClient({
  storyId,
  title: initialTitle,
  description: initialDescription,
  genre: initialGenre,
  era: initialEra,
  status: initialStatus,
  language: initialLanguage,
  wordCountGoal: initialWordCountGoal,
  dailyWordGoal: initialDailyWordGoal,
}: {
  storyId: string;
  title: string;
  description: string;
  genre: string;
  era: string;
  status: string;
  language: string;
  wordCountGoal: number;
  dailyWordGoal: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [genre, setGenre] = useState(initialGenre);
  const [era, setEra] = useState(initialEra);
  const [status, setStatus] = useState(initialStatus);
  const [language, setLanguage] = useState(initialLanguage);
  const [wordCountGoal, setWordCountGoal] = useState(initialWordCountGoal);
  const [dailyWordGoal, setDailyWordGoal] = useState(initialDailyWordGoal);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stories/${storyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          genre: genre || undefined,
          era: era || undefined,
          status,
          word_count_goal: wordCountGoal,
          daily_word_goal: dailyWordGoal,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("设置已保存");
      router.refresh();
    } catch {
      toast.error("保存失败");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("确定要删除这个故事吗？此操作不可撤销。")) return;
    try {
      const res = await fetch(`/api/stories/${storyId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("故事已删除");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("删除失败");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">故事设置</h1>
        <p className="text-muted-foreground">修改故事的基本信息和写作目标</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general">基本设置</TabsTrigger>
          <TabsTrigger value="memory">AI 记忆</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4 space-y-6">
          <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
          <CardDescription>故事的标题、简介和分类</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">标题 *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="故事标题"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">简介</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简要描述你的故事"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="genre">类型</Label>
              <Input
                id="genre"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="如：悬疑、科幻"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="era">时代背景</Label>
              <Input
                id="era"
                value={era}
                onChange={(e) => setEra(e.target.value)}
                placeholder="如：1950s美国"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>状态</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STORY_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>语言</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh">中文</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ja">日本語</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>写作目标</CardTitle>
          <CardDescription>设定每日和总目标字数</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wordCountGoal">总目标字数</Label>
              <Input
                id="wordCountGoal"
                type="number"
                value={wordCountGoal}
                onChange={(e) => setWordCountGoal(Number(e.target.value))}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dailyWordGoal">每日目标字数</Label>
              <Input
                id="dailyWordGoal"
                type="number"
                value={dailyWordGoal}
                onChange={(e) => setDailyWordGoal(Number(e.target.value))}
                min={0}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex items-center justify-between">
        <Button variant="destructive" onClick={handleDelete}>
          删除故事
        </Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "保存中..." : "保存设置"}
        </Button>
      </div>
        </TabsContent>

        <TabsContent value="memory" className="mt-4">
          <MemoryTab storyId={storyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
