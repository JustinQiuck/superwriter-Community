"use client";

import { useState, useEffect } from "react";
import type { BlueprintBeat } from "@/types/entity";
import type { BeatType, BeatStatus } from "@superwriter/shared";
import { BEAT_TYPE_LABELS, BEAT_STATUS_LABELS } from "@superwriter/shared";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Trash2 } from "lucide-react";

interface BeatDetailSheetProps {
  storyId: string;
  beatId: string | null;
  open: boolean;
  onClose: () => void;
  beats: BlueprintBeat[];
}

export function BeatDetailSheet({
  storyId,
  beatId,
  open,
  onClose,
  beats,
}: BeatDetailSheetProps) {
  const beat = beats.find((b) => b.id === beatId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [emotionTarget, setEmotionTarget] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (beat) {
      setTitle(beat.title);
      setDescription(beat.description ?? "");
      setSynopsis(beat.synopsis ?? "");
      setEmotionTarget(beat.emotion_target);
    }
  }, [beat]);

  if (!beat) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/stories/${storyId}/blueprint/beats`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beat_id: beat.id,
          title,
          description,
          synopsis,
          emotion_target: emotionTarget,
        }),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("确认删除此节拍？")) return;
    await fetch(
      `/api/stories/${storyId}/blueprint/beats?beat_id=${beat.id}`,
      { method: "DELETE" },
    );
    onClose();
  };

  const handleStatusChange = async (newStatus: BeatStatus) => {
    await fetch(`/api/stories/${storyId}/blueprint/beats`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ beat_id: beat.id, status: newStatus }),
    });
  };

  const prevBeat = beats.find((b) => b.sort_order === beat.sort_order - 1);
  const nextBeat = beats.find((b) => b.sort_order === beat.sort_order + 1);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Badge variant="outline">{BEAT_TYPE_LABELS[beat.beat_type]}</Badge>
            节拍详情
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="flex gap-2">
            {(["planned", "writing", "completed"] as BeatStatus[]).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={beat.status === s ? "default" : "outline"}
                onClick={() => handleStatusChange(s)}
              >
                {BEAT_STATUS_LABELS[s]}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Label>标题</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={handleSave} />
          </div>

          <div className="space-y-2">
            <Label>描述</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleSave}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>情绪目标</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={-10}
                  max={10}
                  value={emotionTarget}
                  onChange={(e) => setEmotionTarget(Number(e.target.value))}
                  onBlur={handleSave}
                  className="w-20"
                />
                <span className="text-xs text-muted-foreground">(-10 ~ +10)</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>位置</Label>
              <div className="text-sm">{beat.position_pct.toFixed(0)}%</div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>节拍摘要</Label>
            <Textarea
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              onBlur={handleSave}
              rows={4}
              placeholder="描述这个节拍的关键情节..."
            />
          </div>

          {(prevBeat || nextBeat) && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">上下文</Label>
                {prevBeat && (
                  <div className="rounded-md bg-muted p-2 text-xs">
                    <span className="text-muted-foreground">上一节拍: </span>
                    {prevBeat.title}
                  </div>
                )}
                {nextBeat && (
                  <div className="rounded-md bg-muted p-2 text-xs">
                    <span className="text-muted-foreground">下一节拍: </span>
                    {nextBeat.title}
                  </div>
                )}
              </div>
            </>
          )}

          <Separator />

          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={handleDelete}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            删除节拍
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
