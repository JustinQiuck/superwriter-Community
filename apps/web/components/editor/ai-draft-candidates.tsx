"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AIApplyMode, AIEditorDraft } from "@/types/ai";
import {
  BookmarkPlus,
  Clipboard,
  CornerDownRight,
  Lightbulb,
  Plus,
  Replace,
  Trash2,
} from "lucide-react";

interface AIDraftCandidatesProps {
  candidates: AIEditorDraft[];
  activeDraftId?: string | null;
  disabled?: boolean;
  rememberingDraftId?: string | null;
  onSelect?: (draft: AIEditorDraft) => void;
  onApply?: (mode: AIApplyMode, draft: AIEditorDraft) => void;
  onCopy?: (draft: AIEditorDraft) => void;
  onDiscard?: (draft: AIEditorDraft) => void;
  onMarkReference?: (draft: AIEditorDraft) => void;
  onRemember?: (draft: AIEditorDraft) => void;
}

const DECISION_LABELS: Record<NonNullable<AIEditorDraft["decision"]>, string> = {
  accepted: "已采用",
  rejected: "已放弃",
  reference: "灵感",
};

export function AIDraftCandidates({
  candidates,
  activeDraftId,
  disabled = false,
  rememberingDraftId,
  onSelect,
  onApply,
  onCopy,
  onDiscard,
  onMarkReference,
  onRemember,
}: AIDraftCandidatesProps) {
  if (candidates.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-xs font-medium text-muted-foreground">草稿候选</p>
        <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px]">
          {candidates.length}/5
        </Badge>
      </div>
      <div className="space-y-2">
        {candidates.map((candidate, index) => {
          const isActive = candidate.id === activeDraftId;
          const isRemembering = candidate.id === rememberingDraftId;

          return (
            <article
              key={candidate.id}
              className={cn(
                "rounded-xl border border-workspace-border/70 bg-workspace-paper/62 p-2 text-xs transition-colors dark:bg-workspace-surface",
                isActive &&
                  "border-[var(--workspace-ai)] bg-workspace-paper shadow-sm dark:bg-workspace-surface-strong",
              )}
            >
              <button
                type="button"
                className={cn(
                  "flex w-full min-w-0 items-start justify-between gap-2 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  disabled && "cursor-not-allowed opacity-70",
                )}
                onClick={() => onSelect?.(candidate)}
                disabled={disabled}
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-foreground">
                      候选 {index + 1}
                    </span>
                    {candidate.decision ? (
                      <Badge variant="secondary" className="h-5 rounded-full px-2 text-[10px]">
                        {DECISION_LABELS[candidate.decision]}
                      </Badge>
                    ) : null}
                  </span>
                  <span className="mt-1 line-clamp-2 block leading-5 text-muted-foreground">
                    {candidate.resultText}
                  </span>
                </span>
                <span
                  className={cn(
                    "mt-0.5 h-2 w-2 shrink-0 rounded-full bg-workspace-border",
                    isActive && "bg-[var(--workspace-ai)]",
                  )}
                />
              </button>

              {isActive ? (
                <div className="studio-glass studio-command-pill mt-2 grid grid-cols-4 gap-1 p-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1 rounded-full px-2 text-xs hover:bg-workspace-paper/80 dark:hover:bg-workspace-muted"
                    onClick={() => onApply?.("insert", candidate)}
                    disabled={disabled}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    插入
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1 rounded-full px-2 text-xs hover:bg-workspace-paper/80 dark:hover:bg-workspace-muted"
                    onClick={() => onApply?.("replace", candidate)}
                    disabled={disabled || !candidate.selection}
                    title={candidate.selection ? "替换原选区" : "此草稿没有可替换选区"}
                  >
                    <Replace className="h-3.5 w-3.5" />
                    替换
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1 rounded-full px-2 text-xs hover:bg-workspace-paper/80 dark:hover:bg-workspace-muted"
                    onClick={() => onApply?.("append", candidate)}
                    disabled={disabled || !candidate.selection}
                    title={candidate.selection ? "追加到原选区后" : "此草稿没有可追加选区"}
                  >
                    <CornerDownRight className="h-3.5 w-3.5" />
                    追加
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1 rounded-full px-2 text-xs hover:bg-workspace-paper/80 dark:hover:bg-workspace-muted"
                    onClick={() => onCopy?.(candidate)}
                    disabled={disabled}
                    title="复制候选稿"
                  >
                    <Clipboard className="h-3.5 w-3.5" />
                    复制
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1 rounded-full px-2 text-xs hover:bg-workspace-paper/80 dark:hover:bg-workspace-muted"
                    onClick={() => onMarkReference?.(candidate)}
                    disabled={disabled}
                    title="保留为灵感参考"
                  >
                    <Lightbulb className="h-3.5 w-3.5" />
                    收藏
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1 rounded-full px-2 text-xs hover:bg-workspace-paper/80 dark:hover:bg-workspace-muted"
                    onClick={() => onRemember?.(candidate)}
                    disabled={disabled || isRemembering}
                    title="保存到写作记忆"
                  >
                    <BookmarkPlus className="h-3.5 w-3.5" />
                    记住
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1 rounded-full px-2 text-xs text-destructive hover:bg-destructive/10"
                    onClick={() => onDiscard?.(candidate)}
                    disabled={disabled}
                    title="废弃候选稿"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    废弃
                  </Button>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
