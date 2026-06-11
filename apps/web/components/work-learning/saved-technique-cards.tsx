"use client";

import { Badge } from "@/components/ui/badge";
import type { TechniqueCardRecord } from "@/types/work-learning";

interface SavedTechniqueCardsProps {
  cards: TechniqueCardRecord[];
}

export function SavedTechniqueCards({ cards }: SavedTechniqueCardsProps) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">我的方法库</h2>
        <p className="text-sm text-muted-foreground">已保存的技法卡会在这里沉淀。</p>
      </div>
      {cards.length === 0 ? (
        <div className="rounded-lg border border-dashed border-workspace-border/70 p-6 text-sm text-muted-foreground">
          暂无保存卡片。完成一次拆解后，挑选真正想练的卡保存。
        </div>
      ) : (
        <div className="space-y-2">
          {cards.map((record) => (
            <article
              key={record.id}
              className="rounded-lg border border-workspace-border/70 bg-workspace-paper/72 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{record.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {record.card.abstractRule}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 rounded-full text-[10px]">
                  {record.card.applicationIntents[0] ?? "练习"}
                </Badge>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
