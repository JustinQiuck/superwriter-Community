"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Check, X, Pencil } from "lucide-react";
import { BEAT_TYPE_LABELS } from "@superwriter/shared";

interface GeneratedBeat {
  title: string;
  description: string;
  beat_type: string;
  position_pct: number;
  default_emotion: number;
  synopsis?: string;
}

interface ReviewModeProps {
  beats: GeneratedBeat[];
  onAcceptAll: () => void;
  onReject: () => void;
}

export function ReviewMode({ beats, onAcceptAll, onReject }: ReviewModeProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedBeats, setEditedBeats] = useState(beats);

  const handleEdit = (index: number) => {
    setEditingIndex(index);
  };

  const handleSave = (index: number, title: string) => {
    const updated = [...editedBeats];
    updated[index] = { ...updated[index], title };
    setEditedBeats(updated);
    setEditingIndex(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">审核 AI 生成的节拍</h3>
          <p className="text-sm text-muted-foreground">
            共 {editedBeats.length} 个节拍，检查后点击&ldquo;全部接受&rdquo;创建蓝图
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onReject}>
            <X className="mr-1.5 h-4 w-4" />
            全部拒绝
          </Button>
          <Button onClick={onAcceptAll}>
            <Check className="mr-1.5 h-4 w-4" />
            全部接受
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {editedBeats.map((beat, i) => (
          <Card key={i} className="group">
            <CardContent className="flex items-start gap-3 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                {editingIndex === i ? (
                  <Input
                    defaultValue={beat.title}
                    autoFocus
                    onBlur={(e) => handleSave(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSave(i, (e.target as HTMLInputElement).value);
                      }
                    }}
                    className="h-7 text-sm"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{beat.title}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100"
                      onClick={() => handleEdit(i)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                  {beat.description}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {BEAT_TYPE_LABELS[beat.beat_type as keyof typeof BEAT_TYPE_LABELS] ?? beat.beat_type}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {beat.position_pct.toFixed(0)}%
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    情绪 {beat.default_emotion > 0 ? "+" : ""}{beat.default_emotion}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
