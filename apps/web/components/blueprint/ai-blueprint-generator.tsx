"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AICreditBadge } from "@/components/ai/ai-credit-badge";
import { useAICreditPreview } from "@/hooks/use-ai-credit-preview";
import { Sparkles, Loader2 } from "lucide-react";
import { ReviewMode } from "./review-mode";
import { readTextFromDataStream } from "@/lib/ai/read-data-stream";
import {
  AIJsonParseError,
  parseGeneratedBlueprintBeats,
  type GeneratedBlueprintBeat,
} from "@/lib/ai/parse-ai-json";

interface AIBlueprintGeneratorProps {
  storyId: string;
  onBlueprintCreated: () => void;
}

export function AIBlueprintGenerator({ storyId, onBlueprintCreated }: AIBlueprintGeneratorProps) {
  const [synopsis, setSynopsis] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedBeats, setGeneratedBeats] = useState<GeneratedBlueprintBeat[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const creditItems = useMemo(
    () => [{ clientKey: "blueprint:generate", routeKey: "blueprint_generate" }],
    [],
  );
  const { previews, loading: creditPreviewLoading } = useAICreditPreview(creditItems);

  const handleGenerate = async () => {
    if (!synopsis.trim()) return;
    setGenerating(true);
    setGeneratedBeats(null);
    setError(null);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "blueprint_generate",
          storyId,
          prompt: synopsis,
          templateStructure: "三幕式结构（14个节拍）",
        }),
      });

      if (!res.ok || !res.body) {
        setError("蓝图生成失败，请稍后重试");
        return;
      }

      const fullText = await readTextFromDataStream(res.body);
      const beats = parseGeneratedBlueprintBeats(fullText);
      setGeneratedBeats(beats);
    } catch (err) {
      console.error("Blueprint generation failed:", err);
      setError(
        err instanceof AIJsonParseError
          ? err.message
          : "蓝图生成失败，请稍后重试",
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleAcceptAll = async (beats: GeneratedBlueprintBeat[]) => {
    setError(null);
    const bpRes = await fetch(`/api/stories/${storyId}/blueprint`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "叙事蓝图", synopsis }),
    });

    if (!bpRes.ok) {
      setError("创建蓝图失败，请重试");
      return;
    }

    const beatsRes = await fetch(`/api/stories/${storyId}/blueprint/beats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ beats }),
    });

    if (!beatsRes.ok) {
      setError("创建节拍失败，蓝图已创建但节拍未保存");
      return;
    }

    setGeneratedBeats(null);
    onBlueprintCreated();
  };

  const handleReject = () => {
    setGeneratedBeats(null);
  };

  if (generatedBeats) {
    return (
      <ReviewMode
        beats={generatedBeats}
        onAcceptAll={() => handleAcceptAll(generatedBeats)}
        onReject={handleReject}
      />
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">AI 蓝图生成</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          输入故事概要，AI 将为你生成一套完整的叙事节拍方案。
          你可以在审核模式中逐个调整或重新生成。
        </p>
        <div className="space-y-2">
          <Label>故事概要</Label>
          <Textarea
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            rows={4}
            placeholder="描述你的故事核心概念、主要冲突和角色..."
          />
        </div>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <Button
          onClick={handleGenerate}
          disabled={generating || !synopsis.trim() || previews["blueprint:generate"]?.isDisabled}
          className="gap-2"
        >
          {generating ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              生成中...
            </>
          ) : (
            <>
	              <Sparkles className="mr-1.5 h-4 w-4" />
	              生成蓝图
	            </>
	          )}
	          <AICreditBadge
	            preview={previews["blueprint:generate"]}
	            loading={creditPreviewLoading}
	          />
	        </Button>
      </CardContent>
    </Card>
  );
}
