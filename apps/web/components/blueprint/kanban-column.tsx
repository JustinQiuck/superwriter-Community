"use client";

import type { BlueprintBeat } from "@/types/entity";
import type { BeatStatus } from "@superwriter/shared";
import { BeatCard } from "./beat-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface KanbanColumnProps {
  title: string;
  status: BeatStatus;
  beats: BlueprintBeat[];
  storyId: string;
  onBeatClick: (beatId: string) => void;
  onDragEnd: (beatId: string, newStatus: BeatStatus) => void;
}

export function KanbanColumn({
  title,
  status,
  beats,
  storyId,
  onBeatClick,
  onDragEnd,
}: KanbanColumnProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const beatId = e.dataTransfer.getData("text/plain");
    if (beatId) {
      onDragEnd(beatId, status);
    }
  };

  return (
    <div
      className="flex w-80 shrink-0 flex-col rounded-lg border border-workspace-border/70 bg-workspace-muted/55 dark:bg-workspace-surface"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          <Badge variant="secondary" className="text-xs">
            {beats.length}
          </Badge>
        </div>
      </div>
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {beats.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
              拖拽节拍到此处
            </div>
          ) : (
            beats
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((beat) => (
                <BeatCard
                  key={beat.id}
                  beat={beat}
                  storyId={storyId}
                  onClick={() => onBeatClick(beat.id)}
                />
              ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
