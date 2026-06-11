"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  ImportAnalysisJob,
  ImportJobType,
  ImportSection,
  ImportSessionStatus,
} from "@/types/import";

const RUNNING_JOB_STALE_AFTER_MS = 5 * 60 * 1000;
const REBUILDABLE_SESSION_STATUSES = new Set<ImportSessionStatus>([
  "parsed",
  "sections_confirmed",
  "analyzing",
  "ready_for_review",
  "failed",
]);

const JOB_TYPE_LABELS: Record<ImportJobType, string> = {
  chapter_summary: "章节摘要",
  asset_extraction: "资产提取",
  relationship_extraction: "关系提取",
  aggregate_summary: "总览摘要",
  blueprint_inference: "蓝图推断",
};

interface ImportProgress {
  completed: number;
  total: number;
  percent: number;
}

interface AnalysisProgressProps {
  sessionId: string;
  sessionStatus: ImportSessionStatus;
  sections?: ImportSection[];
  jobs: ImportAnalysisJob[];
  progress: ImportProgress;
}

export function AnalysisProgress({
  sessionId,
  sessionStatus,
  sections = [],
  jobs,
  progress,
}: AnalysisProgressProps) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const autoRunKeyRef = useRef<string | null>(null);
  const failedCount = jobs.filter((job) => job.status === "failed").length;
  const staleRunningCount = useMemo(() => countStaleRunningJobs(jobs), [jobs]);
  const runningCount = jobs.filter((job) => job.status === "running").length;
  const activeRunningCount = Math.max(0, runningCount - staleRunningCount);
  const delayedRetryCount = useMemo(() => countDelayedRetryJobs(jobs), [jobs]);
  const nextDelayedRetryDelayMs = useMemo(() => nextDelayedRetryMs(jobs), [jobs]);
  const pendingCount = jobs.filter((job) => job.status === "pending").length;
  const runnablePendingCount = Math.max(0, pendingCount - delayedRetryCount);
  const failedJobs = jobs.filter((job) => job.status === "failed");
  const sectionsById = useMemo(
    () => new Map(sections.map((section) => [section.id, section])),
    [sections],
  );
  const analysisActive = sessionStatus === "analyzing" || runnablePendingCount > 0 || activeRunningCount > 0 || staleRunningCount > 0;
  const completedCleanly = progress.percent === 100 && failedCount === 0 && jobs.length > 0;
  const buttonLabel = failedCount > 0 ? "重试分析" : "继续分析";
  const canRebuild = REBUILDABLE_SESSION_STATUSES.has(sessionStatus);
  const canContinue = (
    sessionStatus === "sections_confirmed" ||
    sessionStatus === "analyzing" ||
    failedCount > 0
  );

  const continueAnalysis = useCallback(async ({
    rebuild = false,
    silent = false,
  }: {
    rebuild?: boolean;
    silent?: boolean;
  } = {}) => {
    setRunning(true);
    try {
      const response = await fetch(`/api/import-sessions/${sessionId}/analyze`, {
        method: "POST",
        ...(rebuild
          ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rebuild: true }),
          }
          : {}),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readErrorMessage(payload) || "分析请求失败");
      if (!silent) toast.success(rebuild ? "已开始重建候选" : "分析已推进");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "分析请求失败");
    } finally {
      setRunning(false);
    }
  }, [router, sessionId]);

  function rebuildAnalysis() {
    const confirmed = window.confirm("重建会清空当前候选项，并重新分析未排除的正文片段。确定继续吗？");
    if (!confirmed) return;
    void continueAnalysis({ rebuild: true });
  }

  useEffect(() => {
    if (sessionStatus !== "analyzing") return;
    if (running || failedCount > 0 || activeRunningCount > 0) return;
    if (runnablePendingCount === 0 && staleRunningCount === 0) return;

    const autoRunKey = `${progress.completed}:${runnablePendingCount}:${staleRunningCount}`;
    if (autoRunKeyRef.current === autoRunKey) return;
    autoRunKeyRef.current = autoRunKey;
    void continueAnalysis({ silent: true });
  }, [
    activeRunningCount,
    continueAnalysis,
    failedCount,
    progress.completed,
    runnablePendingCount,
    running,
    sessionStatus,
    staleRunningCount,
  ]);

  useEffect(() => {
    if (sessionStatus !== "analyzing") return;
    if (running || failedCount > 0 || activeRunningCount > 0) return;
    if (runnablePendingCount > 0 || staleRunningCount > 0) return;
    if (nextDelayedRetryDelayMs === null) return;

    const timeoutId = window.setTimeout(() => {
      void continueAnalysis({ silent: true });
    }, Math.max(250, nextDelayedRetryDelayMs + 100));

    return () => window.clearTimeout(timeoutId);
  }, [
    activeRunningCount,
    continueAnalysis,
    failedCount,
    nextDelayedRetryDelayMs,
    runnablePendingCount,
    running,
    sessionStatus,
    staleRunningCount,
  ]);

  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">分析进度</h2>
          <p className="text-sm text-muted-foreground">
            {progress.completed} / {progress.total} 已完成
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canRebuild && (
            <Button type="button" variant="outline" onClick={rebuildAnalysis} disabled={running || activeRunningCount > 0}>
              <RefreshCw className={running ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              {running ? "重建中..." : "重建候选"}
            </Button>
          )}
          {canContinue && (
            <Button type="button" variant="outline" onClick={() => continueAnalysis()} disabled={running || activeRunningCount > 0}>
              <RefreshCw className={running ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              {running || activeRunningCount > 0 ? "处理中..." : buttonLabel}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <p className="rounded-md bg-muted/60 px-3 py-2 text-sm leading-6 text-muted-foreground">
          {failedCount > 0
            ? "已完成任务不会重复执行，失败任务可从断点继续。"
            : delayedRetryCount > 0
              ? "模型服务繁忙，系统会稍后从断点自动继续分析。"
              : canRebuild
                ? "分析按任务断点推进，重建候选会清空当前候选并重新分析。"
                : "分析按任务断点推进，已完成任务不会重复执行。"}
        </p>
        <div className="flex items-end justify-between">
          <span className="text-3xl font-semibold tabular-nums">{progress.percent}%</span>
          <span className="text-sm text-muted-foreground">
            {completedCleanly ? "分析完成" : sessionStatus === "analyzing" ? "分析中" : "等待分析"}
          </span>
        </div>
        <div
          className={cn(
            "relative h-2 overflow-hidden rounded-full bg-muted",
            failedCount > 0 && "bg-amber-500/20",
            completedCleanly && "bg-emerald-500/20",
          )}
          role="progressbar"
          aria-label="分析进度"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.max(0, Math.min(100, progress.percent))}
        >
          <div
            className={cn(
              "relative h-full overflow-hidden transition-all",
              failedCount > 0 ? "bg-amber-500" : completedCleanly ? "bg-emerald-500" : "bg-primary",
            )}
            style={{ width: `${Math.max(0, Math.min(100, progress.percent))}%` }}
          >
            {analysisActive && (
              <span className="absolute inset-0 -translate-x-full animate-[import-energy_1.4s_linear_infinite] bg-gradient-to-r from-transparent via-white/45 to-transparent" />
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded-md bg-muted px-2 py-1">待处理 {runnablePendingCount} 个</span>
          {delayedRetryCount > 0 && (
            <span className="rounded-md bg-muted px-2 py-1">等待重试 {delayedRetryCount} 个</span>
          )}
          <span className="rounded-md bg-muted px-2 py-1">运行 {activeRunningCount} 个</span>
          {staleRunningCount > 0 && (
            <span className="rounded-md bg-muted px-2 py-1">待恢复 {staleRunningCount} 个</span>
          )}
          <span className="rounded-md bg-muted px-2 py-1">失败 {failedCount} 个</span>
          <span className="rounded-md bg-muted px-2 py-1">已完成 {progress.completed} / {progress.total}</span>
          <span className="rounded-md bg-muted px-2 py-1">任务 {jobs.length} 个</span>
        </div>
        {failedJobs.length > 0 && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
            <h3 className="text-sm font-semibold text-foreground">失败详情</h3>
            <div className="mt-3 space-y-2">
              {failedJobs.map((job) => (
                <div key={job.id} className="rounded-md bg-background/80 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">
                      {JOB_TYPE_LABELS[job.job_type]} · {jobTargetLabel(job, sectionsById)}
                    </p>
                    <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                      尝试 {job.attempts} / {job.max_attempts}
                    </span>
                  </div>
                  <p className="mt-2 leading-6 text-muted-foreground">
                    {job.error_message || "分析任务失败，请重试分析"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function jobTargetLabel(
  job: ImportAnalysisJob,
  sectionsById: Map<string, ImportSection>,
): string {
  if (!job.section_id) return "全局任务";
  const section = sectionsById.get(job.section_id);
  return section?.title?.trim() || "未命名片段";
}

function countStaleRunningJobs(jobs: ImportAnalysisJob[]): number {
  const now = Date.now();
  return jobs.filter((job) => {
    if (job.status !== "running" || !job.locked_at) return false;
    const lockedAtMs = Date.parse(job.locked_at);
    return Number.isFinite(lockedAtMs) && now - lockedAtMs >= RUNNING_JOB_STALE_AFTER_MS;
  }).length;
}

function countDelayedRetryJobs(jobs: ImportAnalysisJob[]): number {
  const now = Date.now();
  return jobs.filter((job) => {
    if (job.status !== "pending" || !job.next_attempt_at) return false;
    const nextAttemptAtMs = Date.parse(job.next_attempt_at);
    return Number.isFinite(nextAttemptAtMs) && nextAttemptAtMs > now;
  }).length;
}

function nextDelayedRetryMs(jobs: ImportAnalysisJob[]): number | null {
  const now = Date.now();
  const retryTimes = jobs
    .filter((job) => job.status === "pending" && job.next_attempt_at)
    .map((job) => Date.parse(job.next_attempt_at as string))
    .filter((time) => Number.isFinite(time));

  if (retryTimes.length === 0) return null;
  return Math.max(0, Math.min(...retryTimes) - now);
}

function readErrorMessage(payload: unknown): string | null {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "object" &&
    payload.error !== null &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message;
  }
  return null;
}
