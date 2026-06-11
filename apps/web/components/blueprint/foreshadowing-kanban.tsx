"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Sparkles, Eye, EyeOff } from "lucide-react";

interface ForeshadowingEntity {
  id: string;
  name: string;
  data: {
    foreshadowing_type: "setup" | "payoff";
    paired_entity_id: string | null;
    content_description: string;
    chapter_id: string | null;
    text_reference: string;
    status: "planted" | "resolved" | "abandoned";
    importance: number;
  };
  createdAt: string;
}

const STATUS_COLUMNS: Array<{ key: string; label: string; filter: string }> = [
  { key: "planted", label: "已埋设待回收", filter: "planted" },
  { key: "resolved", label: "已回收", filter: "resolved" },
  { key: "abandoned", label: "已放弃", filter: "abandoned" },
];

const IMPORTANCE_LABELS: Record<number, string> = {
  1: "★",
  2: "★★",
  3: "★★★",
  4: "★★★★",
  5: "★★★★★",
};

export function ForeshadowingKanban({ storyId }: { storyId: string }) {
  const [foreshadowings, setForeshadowings] = useState<ForeshadowingEntity[]>([]);

  const fetchForeshadowings = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/stories/${storyId}/entities?type=foreshadowing`,
      );
      if (res.ok) {
        const { data } = await res.json();
        setForeshadowings(
          (data ?? []).map((e: Record<string, unknown>) => ({
            id: e.id as string,
            name: e.name as string,
            data: e.data as ForeshadowingEntity["data"],
            createdAt: e.created_at as string,
          })),
        );
      }
    } catch {
      // retry on next render
    }
  }, [storyId]);

  useEffect(() => {
    fetchForeshadowings();
  }, [fetchForeshadowings]);

  const totalPlanted = foreshadowings.filter(
    (f) => f.data.status === "planted",
  ).length;
  const totalResolved = foreshadowings.filter(
    (f) => f.data.status === "resolved",
  ).length;
  const closureRate =
    foreshadowings.length > 0
      ? Math.round((totalResolved / foreshadowings.length) * 100)
      : 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">伏笔管理</h2>
        <Badge variant={closureRate >= 80 ? "outline" : "default"}>
          闭合率 {closureRate}%
        </Badge>
        {closureRate < 80 && totalPlanted > 0 && (
          <span className="text-xs text-[var(--module-timeline)]">
            ⚠ 有 {totalPlanted} 个伏笔待回收
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {STATUS_COLUMNS.map((col) => {
          const items = foreshadowings.filter(
            (f) => f.data.status === col.filter,
          );
          return (
            <div key={col.key} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-medium">{col.label}</span>
                <Badge variant="secondary" className="text-xs">
                  {items.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-workspace-border/70 bg-workspace-paper/80 p-3 text-sm dark:bg-workspace-surface-strong"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-xs text-[var(--module-timeline)]">
                        {IMPORTANCE_LABELS[item.data.importance] ?? ""}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {item.data.content_description}
                    </p>
                    {item.data.text_reference && (
                      <p className="mt-1 text-xs italic text-muted-foreground line-clamp-1">
                        「{item.data.text_reference.slice(0, 50)}」
                      </p>
                    )}
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                    暂无
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
