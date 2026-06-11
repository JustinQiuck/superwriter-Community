"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ConsistencyFinding } from "@/types/consistency";
import {
  CONSISTENCY_FINDING_SEVERITY_LABELS,
  CONSISTENCY_FINDING_TYPE_LABELS,
} from "@superwriter/shared";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";

interface ConsistencyFindingsPanelProps {
  findings: ConsistencyFinding[];
  loading?: boolean;
  onRefresh?: () => void;
}

const SEVERITY_CLASS: Record<ConsistencyFinding["severity"], string> = {
  low: "border-workspace-border/70 text-muted-foreground",
  medium: "border-amber-500/35 bg-amber-500/8 text-amber-700 dark:text-amber-300",
  high: "border-destructive/35 bg-destructive/8 text-destructive",
};

export function ConsistencyFindingsPanel({
  findings,
  loading = false,
  onRefresh,
}: ConsistencyFindingsPanelProps) {
  if (!loading && findings.length === 0) return null;

  return (
    <section className="mt-3 rounded-xl border border-workspace-border/70 bg-workspace-paper/72 p-3 text-xs dark:bg-workspace-surface">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-300" />
          <p className="font-medium text-foreground">一致性发现</p>
          <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px]">
            {loading ? "检查中" : findings.length}
          </Badge>
        </div>
        {onRefresh ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 rounded-full"
            onClick={onRefresh}
            disabled={loading}
            title="刷新一致性发现"
          >
            <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
          </Button>
        ) : null}
      </div>

      {findings.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-workspace-border/70 px-3 py-2 text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5" />
          暂未发现需要处理的一致性问题
        </div>
      ) : (
        <div className="space-y-2">
          {findings.map((finding) => (
            <article
              key={finding.id}
              className="rounded-lg border border-workspace-border/70 bg-workspace-paper/85 p-2 dark:bg-workspace-surface-strong"
            >
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className={SEVERITY_CLASS[finding.severity]}>
                  {CONSISTENCY_FINDING_SEVERITY_LABELS[finding.severity]}
                </Badge>
                <Badge variant="secondary" className="rounded-full px-2 text-[10px]">
                  {CONSISTENCY_FINDING_TYPE_LABELS[finding.type]}
                </Badge>
              </div>
              <p className="font-medium text-foreground">{finding.title}</p>
              <p className="mt-1 leading-5 text-muted-foreground">{finding.detail}</p>
              {finding.suggestion ? (
                <p className="mt-1 leading-5 text-foreground">{finding.suggestion}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
