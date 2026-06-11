"use client";

import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  ImportCandidate,
  ImportCandidateStatus,
  ImportCandidateType,
  ImportSection,
} from "@/types/import";

interface CandidateReviewProps {
  sessionId: string;
  candidates: ImportCandidate[];
  sections?: ImportSection[];
  onCandidatesChange?: (candidates: ImportCandidate[]) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

type CandidateFilter =
  | "chapter"
  | "character"
  | "location"
  | "relationship"
  | "blueprint"
  | "blueprint_chapter";

const FILTERS: Array<{ value: CandidateFilter; label: string; types: ImportCandidateType[] }> = [
  { value: "chapter", label: "章节", types: ["story_summary"] },
  { value: "character", label: "角色", types: ["character"] },
  { value: "location", label: "地点", types: ["location"] },
  { value: "relationship", label: "关系", types: ["relationship"] },
  { value: "blueprint", label: "蓝图结构", types: ["blueprint", "blueprint_beat"] },
  { value: "blueprint_chapter", label: "章节规划", types: ["blueprint_chapter"] },
];

const STATUS_LABELS: Record<ImportCandidateStatus, string> = {
  pending: "待定",
  accepted: "接受",
  ignored: "忽略",
  merged: "合并",
  applied: "已应用",
};

const CANDIDATE_TYPE_LABELS: Record<ImportCandidateType, string> = {
  story_summary: "章节摘要",
  character: "角色",
  location: "地点",
  relationship: "关系",
  blueprint: "故事蓝图",
  blueprint_beat: "结构节拍",
  blueprint_chapter: "章节规划",
};

const MIGRATABLE_SECTION_TYPES: ImportSection["section_type"][] = [
  "chapter",
  "prologue",
  "unknown",
];

const PAGE_SIZE = 50;

export function CandidateReview({
  sessionId,
  candidates,
  sections,
  onCandidatesChange,
  onDirtyChange,
}: CandidateReviewProps) {
  const router = useRouter();
  const [localItems, setLocalItems] = useState(candidates);
  const [filter, setFilter] = useState<CandidateFilter>(() => initialFilter(candidates));
  const [page, setPage] = useState(0);
  const [saving, setSaving] = useState(false);
  const items = onCandidatesChange ? candidates : localItems;

  const activeTypes = FILTERS.find((item) => item.value === filter)?.types ?? [];
  const visibleCandidates = items.filter((candidate) => activeTypes.includes(candidate.candidate_type));
  const blueprintCoverage = useMemo(
    () => calculateBlueprintCoverage(items, sections),
    [items, sections],
  );
  const shouldShowBlueprintCoverage = filter === "blueprint" || filter === "blueprint_chapter";
  const pageCount = Math.max(1, Math.ceil(visibleCandidates.length / PAGE_SIZE));
  const pageStart = page * PAGE_SIZE;
  const pagedCandidates = visibleCandidates.slice(pageStart, pageStart + PAGE_SIZE);
  const mergeTargetsByType = useMemo(
    () => ({
      character: items.filter((candidate) =>
        candidate.candidate_type === "character" &&
        candidate.status !== "ignored" &&
        candidate.status !== "merged" &&
        candidate.status !== "applied",
      ),
      location: items.filter((candidate) =>
        candidate.candidate_type === "location" &&
        candidate.status !== "ignored" &&
        candidate.status !== "merged" &&
        candidate.status !== "applied",
      ),
    }),
    [items],
  );

  useEffect(() => {
    if (!onCandidatesChange) setLocalItems(candidates);
  }, [candidates, onCandidatesChange]);

  useEffect(() => {
    setPage(0);
  }, [filter]);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);

  async function saveCandidates() {
    setSaving(true);
    try {
      const response = await fetch(`/api/import-sessions/${sessionId}/candidates`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: items.map((candidate) => ({
            id: candidate.id,
            status: candidate.status === "applied" ? "accepted" : candidate.status,
            name: candidate.name || "未命名候选",
            summary: candidate.summary ?? "",
            merged_into_candidate_id: candidate.status === "merged"
              ? candidate.merged_into_candidate_id
              : null,
          })),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readErrorMessage(payload) || "保存候选项失败");
      if (Array.isArray(payload?.data?.candidates)) {
        setNextItems(payload.data.candidates);
      }
      onDirtyChange?.(false);
      toast.success("候选项已保存");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存候选项失败");
    } finally {
      setSaving(false);
    }
  }

  function updateCandidate(id: string, changes: Partial<ImportCandidate>) {
    onDirtyChange?.(true);
    setNextItems(
      items.map((candidate) =>
        candidate.id === id ? { ...candidate, ...changes } : candidate,
      ),
    );
  }

  function setNextItems(nextItems: ImportCandidate[]) {
    if (onCandidatesChange) {
      onCandidatesChange(nextItems);
    } else {
      setLocalItems(nextItems);
    }
  }

  return (
    <section className="rounded-lg border bg-card">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">候选审阅</h2>
          <p className="text-sm text-muted-foreground">
            接受、忽略或合并分析出的故事资产
          </p>
        </div>
        <Button type="button" onClick={saveCandidates} disabled={saving || items.length === 0}>
          <Save className="h-4 w-4" />
          {saving ? "保存中..." : "保存候选项"}
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b p-3">
        {FILTERS.map((item) => (
          <Button
            key={item.value}
            type="button"
            size="sm"
            variant={filter === item.value ? "default" : "outline"}
            aria-pressed={filter === item.value}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {shouldShowBlueprintCoverage && blueprintCoverage && (
        <div className="border-b bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          蓝图候选覆盖 {blueprintCoverage.covered} / {blueprintCoverage.total} 个正文片段
        </div>
      )}

      <div className="divide-y">
        {visibleCandidates.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">暂无候选项</p>
        ) : pagedCandidates.map((candidate) => (
          <article key={candidate.id} className="grid gap-4 p-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {CANDIDATE_TYPE_LABELS[candidate.candidate_type]}
              </p>
              <div className="space-y-2">
                <Label htmlFor={`candidate-name-${candidate.id}`}>名称</Label>
                <Input
                  id={`candidate-name-${candidate.id}`}
                  value={candidate.name ?? ""}
                  onChange={(event) => updateCandidate(candidate.id, { name: event.target.value })}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(["pending", "accepted", "ignored"] as const).map((status) => (
                  <Button
                    key={status}
                    type="button"
                    size="sm"
                    variant={candidate.status === status ? "default" : "outline"}
                    aria-pressed={candidate.status === status}
                    onClick={() =>
                      updateCandidate(candidate.id, {
                        status,
                        merged_into_candidate_id: null,
                      })
                    }
                  >
                    {STATUS_LABELS[status]}
                  </Button>
                ))}
              </div>
              {isMergeable(candidate) && (
                <div className="space-y-2">
                  <Label htmlFor={`candidate-merge-${candidate.id}`}>合并到</Label>
                  <select
                    id={`candidate-merge-${candidate.id}`}
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={candidate.merged_into_candidate_id ?? ""}
                    onChange={(event) =>
                      updateCandidate(candidate.id, {
                        status: event.target.value ? "merged" : "pending",
                        merged_into_candidate_id: event.target.value || null,
                      })
                    }
                  >
                    <option value="">不合并</option>
                    {(candidate.candidate_type === "character"
                      ? mergeTargetsByType.character
                      : mergeTargetsByType.location)
                      .filter((target) => target.id !== candidate.id)
                      .map((target) => (
                        <option key={target.id} value={target.id}>
                          {target.name || "未命名候选"}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                置信度 {Math.round(candidate.confidence * 100)}%
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`candidate-summary-${candidate.id}`}>摘要</Label>
              <Textarea
                id={`candidate-summary-${candidate.id}`}
                className="min-h-32 resize-y leading-7"
                value={candidate.summary ?? ""}
                onChange={(event) => updateCandidate(candidate.id, { summary: event.target.value })}
              />
            </div>
          </article>
        ))}
      </div>
      {visibleCandidates.length > PAGE_SIZE && (
        <div className="flex items-center justify-between border-t p-3 text-sm text-muted-foreground">
          <span>
            第 {page + 1} / {pageCount} 页，共 {visibleCandidates.length} 项
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              上一页
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page >= pageCount - 1}
              onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
            >
              下一页
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function isMergeable(candidate: ImportCandidate): boolean {
  return candidate.candidate_type === "character" || candidate.candidate_type === "location";
}

function initialFilter(candidates: ImportCandidate[]): CandidateFilter {
  return FILTERS.find((filter) =>
    candidates.some((candidate) => filter.types.includes(candidate.candidate_type)),
  )?.value ?? "character";
}

function calculateBlueprintCoverage(
  candidates: ImportCandidate[],
  sections?: ImportSection[],
): { covered: number; total: number } | null {
  if (!sections?.length) return null;

  const migratableSectionIds = new Set(
    sections
      .filter((section) => MIGRATABLE_SECTION_TYPES.includes(section.section_type))
      .map((section) => section.id),
  );
  if (migratableSectionIds.size === 0) return null;

  const coveredSectionIds = new Set(
    candidates
      .filter((candidate) =>
        candidate.candidate_type === "blueprint" ||
        candidate.candidate_type === "blueprint_beat" ||
        candidate.candidate_type === "blueprint_chapter",
      )
      .flatMap((candidate) => candidate.source_section_ids)
      .filter((sectionId) => migratableSectionIds.has(sectionId)),
  );

  return {
    covered: coveredSectionIds.size,
    total: migratableSectionIds.size,
  };
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
