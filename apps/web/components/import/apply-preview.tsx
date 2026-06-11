"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, GitBranch } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { ImportCandidate, ImportCandidateType, ImportSection, ImportSession } from "@/types/import";

interface ApplyPreviewProps {
  session: ImportSession;
  sections: ImportSection[];
  candidates: ImportCandidate[];
  reviewDirty?: boolean;
}

const TYPE_LABELS: Partial<Record<ImportCandidateType, string>> = {
  character: "角色",
  location: "地点",
  relationship: "关系",
  blueprint: "蓝图",
  blueprint_beat: "蓝图节点",
  blueprint_chapter: "蓝图章节",
};
const MIGRATABLE_SECTION_TYPES = new Set(["chapter", "prologue", "unknown"]);
const DIRECTLY_APPLIED_CANDIDATE_TYPES = new Set<ImportCandidateType>([
  "character",
  "location",
  "relationship",
  "blueprint",
]);

export function ApplyPreview({ session, sections, candidates, reviewDirty = false }: ApplyPreviewProps) {
  const router = useRouter();
  const [applying, setApplying] = useState(false);
  const [storyId, setStoryId] = useState<string | null>(session.created_story_id);
  const acceptedCandidates = candidates.filter((candidate) => candidate.status === "accepted");
  const storySummary = acceptedCandidates.find((candidate) => candidate.candidate_type === "story_summary");
  const acceptedCounts = useMemo(() => {
    const counts = new Map<ImportCandidateType, number>();
    for (const candidate of acceptedCandidates) {
      counts.set(candidate.candidate_type, (counts.get(candidate.candidate_type) ?? 0) + 1);
    }
    return counts;
  }, [acceptedCandidates]);

  const storyTitle = storySummary?.name || session.inferred_title || session.source_filename;
  const synopsis = storySummary?.summary || "将确认片段与已接受候选项写入新作品。";
  const confirmedSections = sections.filter((section) =>
    section.status === "confirmed" && MIGRATABLE_SECTION_TYPES.has(section.section_type)
  );
  const hasUnappliedAssets = candidates.some((candidate) =>
    DIRECTLY_APPLIED_CANDIDATE_TYPES.has(candidate.candidate_type) &&
    (candidate.status === "pending" || candidate.status === "accepted")
  );
  const canApply = !applying && !reviewDirty && (!storyId || hasUnappliedAssets);
  const buttonText = applying
    ? "应用中..."
    : storyId
      ? hasUnappliedAssets ? "补全资产" : "已应用"
      : "应用到作品";

  async function applyImport() {
    if (reviewDirty) {
      toast.error("请先保存章节和候选项修改");
      return;
    }

    setApplying(true);
    try {
      const response = await fetch(`/api/import-sessions/${session.id}/apply`, {
        method: "POST",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readErrorMessage(payload) || "应用迁移失败");
      const nextStoryId = payload?.data?.storyId;
      if (typeof nextStoryId !== "string") throw new Error("应用结果缺少作品 ID");
      setStoryId(nextStoryId);
      toast.success("迁移已应用");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "应用迁移失败");
    } finally {
      setApplying(false);
    }
  }

  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">应用预览</p>
          <h2 className="truncate text-lg font-semibold">{storyTitle}</h2>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{synopsis}</p>
        </div>
        <Button type="button" onClick={applyImport} disabled={!canApply}>
          <ArrowRight className="h-4 w-4" />
          {buttonText}
        </Button>
      </div>

      {reviewDirty && (
        <p className="mt-3 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          有未保存的章节或候选项修改，保存后才能应用到作品。
        </p>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md bg-muted p-3">
          <p className="text-xs text-muted-foreground">章节</p>
          <p className="mt-1 text-sm font-semibold">{confirmedSections.length} 章</p>
        </div>
        {Array.from(acceptedCounts.entries())
          .filter(([type]) => type !== "story_summary")
          .map(([type, count]) => (
            <div key={type} className="rounded-md bg-muted p-3">
              <p className="text-xs text-muted-foreground">{TYPE_LABELS[type] ?? type}</p>
              <p className="mt-1 text-sm font-semibold">
                {TYPE_LABELS[type] ?? type} {count}
              </p>
            </div>
          ))}
      </div>

      {storyId && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/stories/${storyId}/editor`}>
              <BookOpen className="h-4 w-4" />
              打开编辑器
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/stories/${storyId}/blueprint`}>
              <GitBranch className="h-4 w-4" />
              查看蓝图
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
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
