"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  CoreMemory,
  CreatorPreferences,
} from "@/types/memory";
import { Plus, Trash2, RefreshCw, Database, Clock, Zap } from "lucide-react";

interface MemoryTabProps {
  storyId: string;
}

export function MemoryTab({ storyId }: MemoryTabProps) {
  const [coreMemory, setCoreMemory] = useState<CoreMemory | null>(null);
  const [archivalStats, setArchivalStats] = useState<{
    count: number;
    lastUpdated: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  const [preferences, setPreferences] = useState<CreatorPreferences>({
    writingStyle: "",
    tonePreference: "",
    avgSentenceLength: "",
    customNotes: "",
  });
  const [constraints, setConstraints] = useState<string[]>([]);
  const [newConstraint, setNewConstraint] = useState("");

  const fetchMemory = useCallback(async () => {
    try {
      const res = await fetch(`/api/stories/${storyId}/memory`);
      if (!res.ok) throw new Error("Failed");
      const { data } = await res.json();
      setCoreMemory(data.coreMemory);
      setArchivalStats(data.archivalStats);
      if (data.coreMemory) {
        setPreferences(data.coreMemory.creatorPreferences);
        setConstraints(data.coreMemory.keyConstraints);
      }
    } catch {
      toast.error("加载记忆数据失败");
    } finally {
      setLoading(false);
    }
  }, [storyId]);

  useEffect(() => {
    fetchMemory();
  }, [fetchMemory]);

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/stories/${storyId}/memory`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorPreferences: preferences,
          keyConstraints: constraints,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const { data } = await res.json();
      setCoreMemory(data);
      toast.success("记忆偏好已保存");
    } catch {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleAddConstraint = async () => {
    if (!newConstraint.trim()) return;
    const updated = [...constraints, newConstraint.trim()];
    setConstraints(updated);
    setNewConstraint("");
  };

  const handleRemoveConstraint = async (index: number) => {
    const updated = constraints.filter((_, i) => i !== index);
    setConstraints(updated);
  };

  const handleBackfill = async () => {
    setBackfilling(true);
    try {
      const res = await fetch(`/api/ai/embed/backfill?storyId=${storyId}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed");
      const { data } = await res.json();
      toast.success(`已处理 ${data.processed}/${data.totalChapters} 个章节`);
      fetchMemory();
    } catch {
      toast.error("回填失败，请确认 OpenAI API Key 已配置");
    } finally {
      setBackfilling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const cm = coreMemory;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Zap className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-sm text-muted-foreground">核心记忆</p>
              <p className="text-lg font-semibold">
                {cm ? "已激活" : "未初始化"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Database className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">归档记忆条目</p>
              <p className="text-lg font-semibold">{archivalStats?.count ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Clock className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">最近更新</p>
              <p className="text-sm font-medium">
                {archivalStats?.lastUpdated
                  ? new Date(archivalStats.lastUpdated).toLocaleString("zh-CN")
                  : "暂无"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {cm && (
        <Card>
          <CardHeader>
            <CardTitle>故事基本设定</CardTitle>
            <CardDescription>由系统自动维护，只读</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">标题：</span>
                <span className="font-medium">{cm.storySettings.title}</span>
              </div>
              <div>
                <span className="text-muted-foreground">类型：</span>
                <span className="font-medium">{cm.storySettings.genre}</span>
              </div>
              <div>
                <span className="text-muted-foreground">时代：</span>
                <span className="font-medium">{cm.storySettings.era}</span>
              </div>
              <div>
                <span className="text-muted-foreground">进度：</span>
                <span className="font-medium">
                  第{cm.currentSnapshot.currentChapter}章 · {cm.currentSnapshot.totalWords}字
                </span>
              </div>
            </div>
            {cm.storySettings.synopsis && (
              <p className="text-sm text-muted-foreground">
                {cm.storySettings.synopsis.slice(0, 300)}
              </p>
            )}
            {cm.currentSnapshot.mainCharacters.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {cm.currentSnapshot.mainCharacters.map((c) => (
                  <Badge key={c.name} variant="secondary">
                    {c.name}（{c.status}）
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>创作者偏好</CardTitle>
          <CardDescription>设定你的写作风格偏好，AI 会参考这些信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>写作风格</Label>
              <Input
                value={preferences.writingStyle}
                onChange={(e) =>
                  setPreferences({ ...preferences, writingStyle: e.target.value })
                }
                placeholder="如：自然流畅、诗意优美"
              />
            </div>
            <div className="space-y-2">
              <Label>语气偏好</Label>
              <Input
                value={preferences.tonePreference}
                onChange={(e) =>
                  setPreferences({ ...preferences, tonePreference: e.target.value })
                }
                placeholder="如：偏严肃、轻松幽默"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>句式偏好</Label>
              <Input
                value={preferences.avgSentenceLength}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    avgSentenceLength: e.target.value,
                  })
                }
                placeholder="如：中长句为主、短句快节奏"
              />
            </div>
            <div className="space-y-2">
              <Label>自定义备注</Label>
              <Input
                value={preferences.customNotes}
                onChange={(e) =>
                  setPreferences({ ...preferences, customNotes: e.target.value })
                }
                placeholder="其他想让 AI 知道的偏好"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>关键约束</CardTitle>
          <CardDescription>
            添加必须遵守的设定约束，AI 在所有对话中都会遵守
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {constraints.length > 0 && (
            <div className="space-y-2">
              {constraints.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <span>{c}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveConstraint(i)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={newConstraint}
              onChange={(e) => setNewConstraint(e.target.value)}
              placeholder="如：主角的左手在第1章被烫伤，留下疤痕"
              onKeyDown={(e) => e.key === "Enter" && handleAddConstraint()}
            />
            <Button
              variant="outline"
              onClick={handleAddConstraint}
              disabled={!newConstraint.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handleBackfill} disabled={backfilling}>
          {backfilling ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              回填中...
            </>
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              回填已有章节 Embedding
            </>
          )}
        </Button>
        <Button onClick={handleSavePreferences} disabled={saving}>
          {saving ? "保存中..." : "保存记忆设置"}
        </Button>
      </div>
    </div>
  );
}
