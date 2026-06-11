"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TechniqueCard } from "@/lib/work-learning/types";
import { BookmarkPlus, Clipboard, Send } from "lucide-react";

interface TechniqueCardListProps {
  cards: TechniqueCard[];
  savedCardIds: Set<string>;
  savingCardId?: string | null;
  onSave: (card: TechniqueCard) => void;
  onApply: (card: TechniqueCard) => void;
  onCopy: (card: TechniqueCard) => void;
}

const INTENT_LABELS: Record<string, string> = {
  blueprint: "蓝图",
  chapter: "章节",
  character: "人物",
  practice: "练习",
};

export function TechniqueCardList({
  cards,
  savedCardIds,
  savingCardId,
  onSave,
  onApply,
  onCopy,
}: TechniqueCardListProps) {
  if (cards.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-workspace-border/70 p-8 text-center text-sm text-muted-foreground">
        选择规则并粘贴文本后，技法卡会出现在这里。
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">技法卡</h2>
        <p className="text-sm text-muted-foreground">先挑选，再保存或应用。让 AI 分析变成你的判断。</p>
      </div>
      <div className="space-y-3">
        {cards.map((card) => {
          const saved = savedCardIds.has(card.id);
          return (
            <article
              key={card.id}
              className="rounded-lg border border-workspace-border/70 bg-workspace-paper/72 p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <h3 className="text-base font-semibold">{card.title}</h3>
                  <div className="flex flex-wrap gap-1">
                    {card.applicationIntents.map((intent) => (
                      <Badge key={intent} variant="outline" className="rounded-full text-[10px]">
                        {INTENT_LABELS[intent] ?? intent}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1 rounded-full px-2 text-xs"
                    onClick={() => onCopy(card)}
                  >
                    <Clipboard className="h-3.5 w-3.5" />
                    复制
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1 rounded-full px-2 text-xs"
                    onClick={() => onSave(card)}
                    disabled={saved || savingCardId === card.id}
                  >
                    <BookmarkPlus className="h-3.5 w-3.5" />
                    {saved ? "已保存" : savingCardId === card.id ? "保存中" : "保存"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 gap-1 rounded-full px-2 text-xs"
                    onClick={() => onApply(card)}
                  >
                    <Send className="h-3.5 w-3.5" />
                    应用
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                <CardField label="原文表现" value={card.sourceManifestation} />
                <CardField label="抽象规则" value={card.abstractRule} />
                <CardField label="为什么有效" value={card.whyItWorks} />
                <CardField label="迁移到我的故事" value={card.migrationSuggestion} />
              </div>
              <div className="mt-3 rounded-lg bg-workspace-paper/60 p-3 text-sm">
                <span className="font-medium">练习任务：</span>
                <span className="text-muted-foreground">{card.practiceTask}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CardField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background/60 p-3">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      <p className="leading-6">{value}</p>
    </div>
  );
}
