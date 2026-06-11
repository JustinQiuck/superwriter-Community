"use client";

import { useState } from "react";
import { useDeviationNotifications } from "@/hooks/use-deviation-notifications";
import type { DeviationReport, DeviationType } from "@/types/deviation";
import { AlertTriangle, Users, Clock, ShieldAlert, ChevronDown, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFocusPayload } from "@/stores/writing-focus-store";

const DEVIATION_ICONS: Record<DeviationType, typeof AlertTriangle> = {
  emotion: AlertTriangle,
  character_absence: Users,
  pacing: Clock,
  setting_contradiction: ShieldAlert,
};

const DEVIATION_LABELS: Record<DeviationType, string> = {
  emotion: "情绪偏差",
  character_absence: "角色缺席",
  pacing: "节奏偏差",
  setting_contradiction: "设定矛盾",
};

const SEVERITY_COLORS: Record<string, string> = {
  high: "border-red-400 bg-red-50 dark:bg-red-950/30",
  medium: "border-amber-400 bg-amber-50 dark:bg-amber-950/30",
  low: "border-blue-400 bg-blue-50 dark:bg-blue-950/30",
};

export function DeviationBubble({ storyId }: { storyId: string }) {
  const focusPayload = useFocusPayload();
  const { pendingDeviations, updateStatus, requestSuggestion } =
    useDeviationNotifications({
      storyId,
      beatId: focusPayload?.beatId,
      focusPayload,
    });
  const [expanded, setExpanded] = useState(false);
  const [activeReport, setActiveReport] = useState<DeviationReport | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  if (pendingDeviations.length === 0) return null;

  const latestDeviation = pendingDeviations[0];
  const Icon = DEVIATION_ICONS[latestDeviation.deviationType];

  const handleExpand = async (report: DeviationReport) => {
    setActiveReport(report);
    if (!report.aiSuggestion && !suggestion) {
      setLoadingSuggestion(true);
      const result = await requestSuggestion(report);
      setSuggestion(result);
      setLoadingSuggestion(false);
    }
  };

  return (
    <div className="absolute top-2 right-2 z-50 w-80">
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-lg transition-all hover:shadow-xl",
            SEVERITY_COLORS[latestDeviation.severity],
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {DEVIATION_LABELS[latestDeviation.deviationType]}：{latestDeviation.actualValue.slice(0, 30)}...
          </span>
          {pendingDeviations.length > 1 && (
            <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-xs text-white">
              +{pendingDeviations.length - 1}
            </span>
          )}
        </button>
      ) : (
        <div className="rounded-lg border bg-background shadow-xl">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-medium">
              偏差提醒（{pendingDeviations.length}）
            </span>
            <button onClick={() => setExpanded(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto p-2">
            {pendingDeviations.map((report) => {
              const ReportIcon = DEVIATION_ICONS[report.deviationType];
              const isActive = activeReport?.id === report.id;

              return (
                <div key={report.id} className="mb-1">
                  <button
                    onClick={() => handleExpand(report)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
                      isActive && "bg-accent",
                    )}
                  >
                    <ReportIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{DEVIATION_LABELS[report.deviationType]}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {report.actualValue.slice(0, 50)}
                      </div>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", isActive && "rotate-180")} />
                  </button>

                  {isActive && (
                    <div className="mt-1 space-y-2 rounded-md border bg-muted/50 p-3">
                      <div>
                        <div className="text-xs font-medium text-muted-foreground">蓝图目标</div>
                        <div className="text-sm">{report.blueprintValue}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground">实际情况</div>
                        <div className="text-sm">{report.actualValue}</div>
                      </div>

                      {(report.aiSuggestion || suggestion) && (
                        <div>
                          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                            <Sparkles className="h-3 w-3" /> AI 建议
                          </div>
                          <div className="mt-1 text-sm">{report.aiSuggestion ?? suggestion}</div>
                        </div>
                      )}

                      {loadingSuggestion && (
                        <div className="text-xs text-muted-foreground">正在生成建议...</div>
                      )}

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => updateStatus(report.id, "ignored")}
                          className="rounded-md border px-2 py-1 text-xs hover:bg-accent"
                        >
                          忽略
                        </button>
                        <button
                          onClick={() => updateStatus(report.id, "fixed")}
                          className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"
                        >
                          已修复
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
