"use client";

import { AlertTriangle, CheckCircle2, Loader2, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { WritingBrief } from "@/lib/writing/daily-writing-brief";

interface WritingTargetCardProps {
  brief?: WritingBrief | null;
  loading?: boolean;
}

export function WritingTargetCard({ brief, loading = false }: WritingTargetCardProps) {
  if (loading) {
    return (
      <div className="studio-soft-panel rounded-xl p-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--workspace-ai)]" />
          正在整理本章写作目标...
        </div>
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="studio-soft-panel rounded-xl border-dashed p-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Target className="h-3.5 w-3.5 text-[var(--module-editor)]" />
          选择章节后显示今日写作目标。
        </div>
      </div>
    );
  }

  const firstRisk = brief.risks[0];
  const mustIncludePreview = brief.mustInclude.slice(0, 2);

  return (
    <div className="studio-soft-panel rounded-xl p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{brief.chapterName}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {brief.beatTitle ?? "暂无匹配节拍"}
          </p>
        </div>
        {brief.emotionalTarget !== null || brief.targetWordCount !== null ? (
          <div className="flex shrink-0 flex-col items-end gap-1">
            {brief.emotionalTarget !== null ? (
              <Badge
                variant="outline"
                className="border-workspace-border/70 bg-workspace-paper/70 text-[10px]"
              >
                情绪 {brief.emotionalTarget}
              </Badge>
            ) : null}
            {brief.targetWordCount !== null ? (
              <Badge
                variant="outline"
                className="border-workspace-border/70 bg-workspace-paper/70 text-[10px]"
              >
                目标 {brief.targetWordCount} 字
              </Badge>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-workspace-border/70 bg-workspace-paper/72 px-3 py-2">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <Target className="h-3 w-3 text-[var(--module-editor)]" />
          本章目标
        </div>
        <p className="text-sm leading-5">{brief.primaryGoal}</p>
      </div>

      <div className="mt-2 space-y-1.5">
        {mustIncludePreview.length > 0 ? (
          mustIncludePreview.map((item) => (
            <div key={item} className="flex gap-1.5 text-xs leading-5 text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--module-location)]" />
              <span className="line-clamp-2">{item}</span>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">暂无明确必写项。</p>
        )}
      </div>

      {firstRisk ? (
        <div className="mt-2 flex gap-2 rounded-lg border border-[color-mix(in_oklch,var(--module-timeline)_42%,var(--workspace-border))] bg-[color-mix(in_oklch,var(--module-timeline)_9%,var(--workspace-paper))] px-2.5 py-2 text-xs leading-5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--module-timeline)]" />
          <div className="min-w-0">
            <p className="font-medium text-foreground">
              {firstRisk.label} · {firstRisk.severity}
            </p>
            <p className="line-clamp-2 text-muted-foreground">{firstRisk.message}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
