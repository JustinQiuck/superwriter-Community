"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ApplyCardDialog } from "@/components/work-learning/apply-card-dialog";
import { SavedTechniqueCards } from "@/components/work-learning/saved-technique-cards";
import { SkillPicker } from "@/components/work-learning/skill-picker";
import { SourceInputPanel } from "@/components/work-learning/source-input-panel";
import { TechniqueCardList } from "@/components/work-learning/technique-card-list";
import type { TechniqueCard, WorkLearningSkillId } from "@/lib/work-learning/types";
import type { TechniqueCardRecord } from "@/types/work-learning";

interface StoryOption {
  id: string;
  title: string;
}

interface WorkLearningClientProps {
  stories: StoryOption[];
}

interface AnalysisState {
  summary: string;
  cards: TechniqueCard[];
  sourceHash: string;
  sourceLength: number;
}

type ApplyTechniqueCardPayload = {
  card: TechniqueCard;
  target:
    | { type: "blueprint"; storyId: string }
    | { type: "chapter"; storyId: string; chapterId: string };
};

export function WorkLearningClient({ stories }: WorkLearningClientProps) {
  const [skillId, setSkillId] = useState<WorkLearningSkillId>("chapter_hook");
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null);
  const [savedCards, setSavedCards] = useState<TechniqueCardRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [savingCardId, setSavingCardId] = useState<string | null>(null);
  const [applyCard, setApplyCard] = useState<TechniqueCard | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<string | null>(null);

  const savedCardIds = useMemo(
    () => new Set(savedCards.map((record) => record.card.id)),
    [savedCards],
  );

  useEffect(() => {
    void loadSavedCards();
  }, []);

  async function loadSavedCards() {
    setLoadingSaved(true);
    try {
      const response = await fetch("/api/work-learning/cards?limit=30");
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error?.message ?? "读取方法库失败");
      }
      setSavedCards(Array.isArray(body.data) ? body.data : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "读取方法库失败");
    } finally {
      setLoadingSaved(false);
    }
  }

  async function analyze() {
    setLoading(true);
    setAnalysis(null);
    try {
      const response = await fetch("/api/work-learning/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sourceText,
          skillId,
          sourceTitle: sourceTitle.trim() || undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error?.message ?? "拆解失败");
      }
      setAnalysis(body.data);
      toast.success("已生成技法卡");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "拆解失败");
    } finally {
      setLoading(false);
    }
  }

  async function saveCard(card: TechniqueCard) {
    if (!analysis) return;
    setSavingCardId(card.id);
    try {
      const response = await fetch("/api/work-learning/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cards: [card],
          sourceTitle: sourceTitle.trim() || undefined,
          sourceHash: analysis.sourceHash,
          sourceLength: analysis.sourceLength,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error?.message ?? "保存失败");
      }
      const rows = Array.isArray(body.data) ? body.data : [];
      setSavedCards((current) => [...rows, ...current]);
      toast.success("已保存到方法库");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSavingCardId(null);
    }
  }

  async function copyCard(card: TechniqueCard) {
    const text = [
      `【${card.title}】`,
      `抽象规则：${card.abstractRule}`,
      `迁移建议：${card.migrationSuggestion}`,
      `练习任务：${card.practiceTask}`,
    ].join("\n");

    await navigator.clipboard.writeText(text);
    toast.success("已复制技法卡");
  }

  async function applyTechniqueCard(payload: ApplyTechniqueCardPayload) {
    setApplying(true);
    setApplyResult(null);
    try {
      const response = await fetch("/api/work-learning/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error?.message ?? "应用失败");
      }
      const data = body.data as { title: string; guidance: string; tasks?: string[]; cautions?: string[] };
      setApplyResult(formatApplyResult(data));
      toast.success("已生成应用建议");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "应用失败");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="min-h-full bg-[var(--workspace-bg)] p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">作品学习</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              从你选择的参考文本里提炼套路，再迁移到自己的故事。
            </p>
          </div>
          <div className="rounded-full border border-workspace-border/70 bg-workspace-paper/70 px-3 py-1 text-xs text-muted-foreground">
            {loadingSaved ? "方法库同步中..." : `${savedCards.length} 张已保存`}
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <main className="space-y-6">
            <div className="rounded-xl border border-workspace-border/70 bg-background/74 p-4 shadow-sm">
              <SourceInputPanel
                sourceTitle={sourceTitle}
                text={sourceText}
                loading={loading}
                onSourceTitleChange={setSourceTitle}
                onTextChange={setSourceText}
                onAnalyze={analyze}
              />
            </div>

            <div className="rounded-xl border border-workspace-border/70 bg-background/74 p-4 shadow-sm">
              <SkillPicker value={skillId} onChange={setSkillId} />
            </div>

            <div className="rounded-xl border border-workspace-border/70 bg-background/74 p-4 shadow-sm">
              {analysis ? (
                <div className="mb-4 rounded-lg bg-workspace-paper/60 p-3 text-sm text-muted-foreground">
                  {analysis.summary}
                </div>
              ) : null}
              <TechniqueCardList
                cards={analysis?.cards ?? []}
                savedCardIds={savedCardIds}
                savingCardId={savingCardId}
                onSave={saveCard}
                onApply={(card) => {
                  setApplyCard(card);
                  setApplyResult(null);
                }}
                onCopy={copyCard}
              />
            </div>
          </main>

          <aside className="space-y-6">
            <div className="rounded-xl border border-workspace-border/70 bg-background/74 p-4 shadow-sm">
              <SavedTechniqueCards cards={savedCards} />
            </div>
          </aside>
        </div>
      </div>

      <ApplyCardDialog
        card={applyCard}
        stories={stories}
        open={Boolean(applyCard)}
        applying={applying}
        result={applyResult}
        onOpenChange={(open) => {
          if (!open) {
            setApplyCard(null);
            setApplyResult(null);
          }
        }}
        onApply={applyTechniqueCard}
      />
    </div>
  );
}

function formatApplyResult(data: {
  title: string;
  guidance: string;
  tasks?: string[];
  cautions?: string[];
}) {
  const tasks = data.tasks?.length ? `\n\n任务：\n${data.tasks.map((task) => `- ${task}`).join("\n")}` : "";
  const cautions = data.cautions?.length ? `\n\n注意：\n${data.cautions.map((item) => `- ${item}`).join("\n")}` : "";
  return `${data.title}\n\n${data.guidance}${tasks}${cautions}`;
}
