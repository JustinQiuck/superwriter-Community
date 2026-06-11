"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ImportSession, ImportSessionStatus } from "@/types/import";

interface ImportWorkbenchListProps {
  sessions: ImportSession[];
}

const STATUS_LABELS: Record<ImportSessionStatus, string> = {
  uploaded: "待上传",
  parsed: "待切章",
  sections_confirmed: "待分析",
  analyzing: "分析中",
  ready_for_review: "待审阅",
  applying: "应用中",
  completed: "已完成",
  failed: "失败",
  cancelled: "已取消",
};

export function ImportWorkbenchList({ sessions }: ImportWorkbenchListProps) {
  const router = useRouter();
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  async function deleteSession(session: ImportSession) {
    if (!canDeleteSession(session.status) || deletingSessionId) return;

    const title = session.inferred_title || session.source_filename;
    const confirmed = window.confirm(`确定删除迁移任务「${title}」吗？此操作不会删除已创建的作品。`);
    if (!confirmed) return;

    setDeletingSessionId(session.id);
    try {
      const response = await fetch(`/api/import-sessions/${session.id}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readErrorMessage(payload) || "删除迁移任务失败");

      toast.success("迁移任务已删除");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除迁移任务失败");
    } finally {
      setDeletingSessionId(null);
    }
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <Card key={session.id} className="transition-shadow hover:shadow-md">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href={`/dashboard/imports/${session.id}`}
              className="flex min-w-0 flex-1 items-start gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <div className="rounded-md border bg-muted p-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-base font-semibold">
                    {session.inferred_title || session.source_filename}
                  </h2>
                  <Badge variant={statusVariant(session.status)}>
                    {STATUS_LABELS[session.status]}
                  </Badge>
                </div>
                {session.inferred_title && (
                  <p className="truncate text-sm text-muted-foreground">
                    {session.source_filename}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {sessionProgressText(session)}
                </p>
                {session.status === "failed" && session.error_message && (
                  <p className="text-sm text-destructive">{session.error_message}</p>
                )}
              </div>
            </Link>

            <div className="flex shrink-0 items-center gap-2">
              {canDeleteSession(session.status) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={deletingSessionId === session.id}
                  onClick={() => deleteSession(session)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deletingSessionId === session.id ? "删除中..." : "删除任务"}
                </Button>
              )}
              {session.status === "completed" && session.created_story_id && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/stories/${session.created_story_id}/overview`}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    进入作品
                  </Link>
                </Button>
              )}
              <span className="inline-flex items-center text-sm text-muted-foreground">
                查看
                <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function canDeleteSession(status: ImportSessionStatus): boolean {
  return status !== "applying" && status !== "completed";
}

function statusVariant(status: ImportSessionStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "failed") return "destructive";
  if (status === "completed") return "default";
  if (status === "cancelled") return "outline";
  return "secondary";
}

function sessionProgressText(session: ImportSession): string {
  const progress = readProgress(session.metadata);
  if (progress !== null) return `进度 ${progress}%`;
  if (session.source_word_count > 0) {
    return `${session.source_word_count.toLocaleString("zh-CN")} 字`;
  }
  return `${formatFileSize(session.source_file_size)} · ${session.source_file_type.toUpperCase()}`;
}

function readProgress(metadata: Record<string, unknown>): number | null {
  const value = metadata.progress;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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
