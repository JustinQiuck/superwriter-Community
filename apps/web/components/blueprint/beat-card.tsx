"use client";

import type { BlueprintBeat } from "@/types/entity";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BEAT_TYPE_LABELS } from "@superwriter/shared";

interface BeatCardProps {
  beat: BlueprintBeat;
  storyId: string;
  onClick: () => void;
}

export function BeatCard({ beat, onClick }: BeatCardProps) {
  const storyFunction =
    typeof beat.content.storyFunction === "string"
      ? beat.content.storyFunction
      : null;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", beat.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const emotionColor =
    beat.emotion_target > 3
      ? "text-green-500"
      : beat.emotion_target < -3
        ? "text-red-500"
        : "text-muted-foreground";

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-tight truncate">
              {beat.title}
            </p>
            {(beat.description || beat.synopsis) && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {beat.description || beat.synopsis}
              </p>
            )}
          </div>
          <span className={`text-xs font-mono shrink-0 ${emotionColor}`}>
            {beat.emotion_target > 0 ? "+" : ""}
            {beat.emotion_target}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {BEAT_TYPE_LABELS[beat.beat_type]}
          </Badge>
          {storyFunction && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {storyFunction}
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground">
            {beat.position_pct.toFixed(0)}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
