"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ConsistencyFinding } from "@/types/consistency";
import { Check, Inbox, Loader2, X } from "lucide-react";

interface MemoryInboxPanelProps {
  items: ConsistencyFinding[];
  loading?: boolean;
  actingId?: string | null;
  onAccept?: (finding: ConsistencyFinding) => void;
  onDismiss?: (finding: ConsistencyFinding) => void;
}

export function MemoryInboxPanel({
  items,
  loading = false,
  actingId,
  onAccept,
  onDismiss,
}: MemoryInboxPanelProps) {
  if (!loading && items.length === 0) return null;

  return (
    <section className="rounded-xl border border-workspace-border/70 bg-workspace-paper/72 p-3 text-xs dark:bg-workspace-surface">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Inbox className="h-3.5 w-3.5 text-[var(--workspace-ai)]" />
          <p className="font-medium text-foreground">记忆收件箱</p>
        </div>
        <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px]">
          {loading ? "同步中" : items.length}
        </Badge>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-workspace-border/70 px-3 py-2 text-muted-foreground">
          暂无待确认记忆
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const acting = actingId === item.id;
            return (
              <article
                key={item.id}
                className="rounded-lg border border-workspace-border/70 bg-workspace-paper/85 p-2 dark:bg-workspace-surface-strong"
              >
                <p className="font-medium text-foreground">
                  {item.memoryKey ?? item.title}
                </p>
                <p className="mt-1 leading-5 text-muted-foreground">
                  {item.memoryValue ?? item.detail}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1 rounded-full text-xs hover:bg-workspace-paper/80 dark:hover:bg-workspace-muted"
                    onClick={() => onAccept?.(item)}
                    disabled={acting}
                  >
                    {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    采纳
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1 rounded-full text-xs text-muted-foreground hover:bg-workspace-paper/80 hover:text-foreground dark:hover:bg-workspace-muted"
                    onClick={() => onDismiss?.(item)}
                    disabled={acting}
                  >
                    <X className="h-3.5 w-3.5" />
                    忽略
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
