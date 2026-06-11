"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FileText, GripVertical, Trash2 } from "lucide-react";
import type { Entity } from "@/types/entity";

interface SortableChapterItemProps {
  chapter: Entity;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SortableChapterItem({
  chapter,
  isSelected,
  onSelect,
  onDelete,
}: SortableChapterItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chapter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex w-full items-center gap-1 rounded-xl px-1.5 py-1.5 text-sm transition-all ${
        isSelected
          ? "bg-workspace-paper text-foreground shadow-[0_8px_18px_rgb(60_49_38_/_0.06)] dark:bg-workspace-surface-strong dark:shadow-[0_10px_22px_rgb(0_0_0_/_0.22)]"
          : "text-foreground/76 hover:bg-workspace-paper/70 hover:text-foreground dark:hover:bg-workspace-muted"
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab rounded-lg p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>
      <button
        className="flex min-w-0 flex-1 items-center gap-2 truncate rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-accent)]/35"
        onClick={() => onSelect(chapter.id)}
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
            isSelected ? "bg-[var(--module-editor)]/12 text-[var(--module-editor)]" : "bg-workspace-muted text-muted-foreground"
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 truncate">{chapter.name}</span>
      </button>
      <button
        className="rounded-lg p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30 group-hover:opacity-100"
        onClick={(event) => {
          event.stopPropagation();
          onDelete(chapter.id);
        }}
        title="删除章节"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
