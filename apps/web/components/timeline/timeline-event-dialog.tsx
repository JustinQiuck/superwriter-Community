"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { TimelineEvent } from "@/types/entity";

interface TimelineEventDialogProps {
  storyId: string;
  event?: TimelineEvent;
  open: boolean;
  onClose: () => void;
  onSave: (event: TimelineEvent) => void;
}

export function TimelineEventDialog({
  storyId,
  event,
  open,
  onClose,
  onSave,
}: TimelineEventDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [track, setTrack] = useState("main");
  const [color, setColor] = useState("#6366f1");
  const [saving, setSaving] = useState(false);

  // 编辑模式：回填现有事件数据
  useEffect(() => {
    if (event) {
      setTitle(event.title ?? "");
      setDescription(event.description ?? "");
      setStartDate(event.start_date ?? "");
      setTrack(event.track ?? "main");
      setColor(event.color ?? "#6366f1");
    } else {
      setTitle("");
      setDescription("");
      setStartDate("");
      setTrack("main");
      setColor("#6366f1");
    }
  }, [event, open]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const url = event
        ? `/api/stories/${storyId}/timeline/${event.id}`
        : `/api/stories/${storyId}/timeline`;
      const res = await fetch(url, {
        method: event ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          start_date: startDate.trim() || undefined,
          track: track.trim() || "main",
          color,
        }),
      });
      if (res.ok) {
        const { data } = await res.json();
        onSave(data as TimelineEvent);
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{event ? "编辑事件" : "新建时间线事件"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="event-title">标题 *</Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="事件标题"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="event-date">故事内日期（选填）</Label>
              <Input
                id="event-date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="如：第3年春天"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="event-track">轨道</Label>
              <Input
                id="event-track"
                value={track}
                onChange={(e) => setTrack(e.target.value)}
                placeholder="main"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="event-color">颜色</Label>
            <div className="flex items-center gap-2">
              <input
                id="event-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-14 cursor-pointer rounded border"
              />
              <span className="text-xs text-muted-foreground">{color}</span>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="event-desc">描述（选填）</Label>
            <Textarea
              id="event-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="事件描述..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
