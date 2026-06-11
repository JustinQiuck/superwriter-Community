"use client";

import { useState, useEffect, useCallback } from "react";
import type { DeviationReport, DeviationType, DeviationStatus } from "@/types/deviation";
import { AlertTriangle, Users, Clock, ShieldAlert, Sparkles, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const DEVIATION_ICONS: Record<DeviationType, typeof AlertTriangle> = {
  emotion: AlertTriangle,
  character_absence: Users,
  pacing: Clock,
  setting_contradiction: ShieldAlert,
};

const TYPE_LABELS: Record<DeviationType, string> = {
  emotion: "情绪偏差",
  character_absence: "角色缺席",
  pacing: "节奏偏差",
  setting_contradiction: "设定矛盾",
};

const STATUS_LABELS: Record<DeviationStatus, string> = {
  pending: "未处理",
  ignored: "已忽略",
  fixed: "已修复",
};

const STATUS_VARIANTS: Record<DeviationStatus, "default" | "secondary" | "outline"> = {
  pending: "default",
  ignored: "secondary",
  fixed: "outline",
};

export function DeviationReportList({ storyId }: { storyId: string }) {
  const [reports, setReports] = useState<DeviationReport[]>([]);
  const [statusFilter, setStatusFilter] = useState<DeviationStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<DeviationType | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, string>>({});

  const fetchReports = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);
      const res = await fetch(`/api/stories/${storyId}/deviations?${params}`);
      if (res.ok) {
        const { data } = await res.json();
        setReports(data ?? []);
      }
    } catch {
      // retry on next render
    }
  }, [storyId, statusFilter, typeFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleStatusUpdate = async (reportId: string, status: DeviationStatus) => {
    try {
      const res = await fetch(`/api/stories/${storyId}/deviations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, status }),
      });
      if (res.ok) {
        fetchReports();
      }
    } catch {
      // retry on next render
    }
  };

  const handleRequestSuggestion = async (report: DeviationReport) => {
    if (suggestions[report.id] || report.aiSuggestion) return;
    try {
      const res = await fetch("/api/ai/deviation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId,
          reportId: report.id,
          deviationType: report.deviationType,
          blueprintValue: report.blueprintValue,
          actualValue: report.actualValue,
        }),
      });
      if (res.ok) {
        const { data } = await res.json();
        if (data?.suggestion) {
          setSuggestions((prev) => ({ ...prev, [report.id]: data.suggestion }));
        }
      }
    } catch {
      // retry on next render
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">偏差报告</h2>
        <div className="flex gap-2">
          {(["all", "pending", "ignored", "fixed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-md px-2 py-1 text-xs",
                statusFilter === s ? "bg-primary text-primary-foreground" : "border hover:bg-accent",
              )}
            >
              {s === "all" ? "全部" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {(["all", "emotion", "character_absence", "pacing", "setting_contradiction"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                "rounded-md px-2 py-1 text-xs",
                typeFilter === t ? "bg-primary text-primary-foreground" : "border hover:bg-accent",
              )}
            >
              {t === "all" ? "全部类型" : TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          暂无偏差报告
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((report) => {
            const Icon = DEVIATION_ICONS[report.deviationType];
            const isExpanded = expandedId === report.id;

            return (
              <div key={report.id} className="rounded-lg border">
                <button
                  onClick={() => {
                    setExpandedId(isExpanded ? null : report.id);
                    handleRequestSuggestion(report);
                  }}
                  className="flex w-full items-center gap-3 p-3 text-left hover:bg-accent"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {TYPE_LABELS[report.deviationType]}
                      </span>
                      <Badge variant={STATUS_VARIANTS[report.status]} className="text-xs">
                        {STATUS_LABELS[report.status]}
                      </Badge>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {report.actualValue.slice(0, 60)}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(report.createdAt).toLocaleDateString("zh-CN")}
                  </span>
                </button>

                {isExpanded && (
                  <div className="space-y-3 border-t p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">蓝图目标</div>
                        <div className="text-sm">{report.blueprintValue}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">实际情况</div>
                        <div className="text-sm">{report.actualValue}</div>
                      </div>
                    </div>

                    {(report.aiSuggestion || suggestions[report.id]) && (
                      <div>
                        <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                          <Sparkles className="h-3 w-3" /> AI 建议
                        </div>
                        <div className="rounded-md bg-muted p-3 text-sm">
                          {report.aiSuggestion ?? suggestions[report.id]}
                        </div>
                      </div>
                    )}

                    {report.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStatusUpdate(report.id, "ignored")}
                          className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
                        >
                          <EyeOff className="h-3 w-3" /> 忽略
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(report.id, "fixed")}
                          className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90"
                        >
                          <Eye className="h-3 w-3" /> 已修复
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
