"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Play, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ImportSection, ImportSectionStatus } from "@/types/import";

interface SectionReviewProps {
  sessionId: string;
  sections: ImportSection[];
  onSectionsChange?: (sections: ImportSection[]) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

const STATUS_LABELS: Record<ImportSectionStatus, string> = {
  pending: "待处理",
  confirmed: "参与迁移",
  ignored: "排除",
};
const MIGRATABLE_SECTION_TYPES = new Set(["chapter", "prologue", "unknown"]);

export function SectionReview({
  sessionId,
  sections,
  onSectionsChange,
  onDirtyChange,
}: SectionReviewProps) {
  const router = useRouter();
  const [localItems, setLocalItems] = useState(sections);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const items = onSectionsChange ? sections : localItems;

  useEffect(() => {
    if (!onSectionsChange) setLocalItems(sections);
  }, [onSectionsChange, sections]);

  const confirmedCount = useMemo(
    () => items.filter((section) => isMigratableConfirmedSection(section)).length,
    [items],
  );

  function confirmAllSections() {
    onDirtyChange?.(true);
    setNextItems(
      items.map((section) =>
        MIGRATABLE_SECTION_TYPES.has(section.section_type)
          ? { ...section, status: "confirmed" }
          : section,
      ),
    );
  }

  async function saveSections() {
    setSaving(true);
    try {
      const response = await fetch(`/api/import-sessions/${sessionId}/sections`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections: items.map((section, index) => ({
            id: section.id,
            section_type: section.section_type,
            title: (section.title || `未命名片段 ${index + 1}`).trim(),
            volume_title: section.volume_title,
            content: section.content || " ",
            sort_order: index,
            status: section.status,
          })),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readErrorMessage(payload) || "保存章节失败");
      if (Array.isArray(payload?.data?.sections)) {
        setNextItems(payload.data.sections);
      }
      onDirtyChange?.(false);
      toast.success("章节已保存");
      router.refresh();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存章节失败");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function startAnalysis() {
    const saved = await saveSections();
    if (!saved) return;

    setAnalyzing(true);
    try {
      const response = await fetch(`/api/import-sessions/${sessionId}/analyze`, {
        method: "POST",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readErrorMessage(payload) || "启动分析失败");
      toast.success("已开始分析");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "启动分析失败");
    } finally {
      setAnalyzing(false);
    }
  }

  function updateSection(index: number, changes: Partial<ImportSection>) {
    onDirtyChange?.(true);
    setNextItems(
      items.map((section, sectionIndex) =>
        sectionIndex === index
          ? {
              ...section,
              ...changes,
              word_count: changes.content !== undefined ? countText(changes.content) : section.word_count,
            }
          : section,
      ),
    );
  }

  function mergeWithNext(index: number) {
    const next = items[index + 1];
    const section = items[index];
    if (!section || !next) return;

    onDirtyChange?.(true);
    setNextItems(
      items
        .map((item, itemIndex) => {
          if (itemIndex !== index) return item;
          const content = [section.content, next.content].filter(Boolean).join("\n\n");
          return {
            ...section,
            title: [section.title, next.title].filter(Boolean).join(" / "),
            content,
            word_count: countText(content),
          };
        })
        .filter((_, itemIndex) => itemIndex !== index + 1)
        .map((item, itemIndex) => ({ ...item, sort_order: itemIndex })),
    );
  }

  function setNextItems(nextItems: ImportSection[]) {
    if (onSectionsChange) {
      onSectionsChange(nextItems);
    } else {
      setLocalItems(nextItems);
    }
  }

  return (
    <section className="rounded-lg border bg-card">
      <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">章节整理</h2>
          <p className="text-sm text-muted-foreground">
            {items.length} 个片段，{confirmedCount} 个参与迁移
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={confirmAllSections}
            disabled={saving || analyzing || items.length === 0 || confirmedCount === migratableSectionCount(items)}
          >
            <CheckCircle2 className="h-4 w-4" />
            确认全部
          </Button>
          <Button type="button" variant="outline" onClick={saveSections} disabled={saving || analyzing}>
            <Save className="h-4 w-4" />
            {saving ? "保存中..." : "保存章节"}
          </Button>
          <Button type="button" onClick={startAnalysis} disabled={saving || analyzing || confirmedCount === 0}>
            <Play className="h-4 w-4" />
            {analyzing ? "分析中..." : "开始分析"}
          </Button>
        </div>
      </div>

      <div className="divide-y">
        {items.map((section, index) => {
          const title = section.title || `未命名片段 ${index + 1}`;
          return (
            <article key={section.id || index} className="grid gap-4 p-4 lg:grid-cols-[280px_minmax(0,1fr)]">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor={`section-title-${index}`}>章节标题 {title}</Label>
                  <Input
                    id={`section-title-${index}`}
                    value={section.title ?? ""}
                    onChange={(event) => updateSection(index, { title: event.target.value })}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(["pending", "confirmed", "ignored"] as const).map((status) => (
                    <Button
                      key={status}
                      type="button"
                      size="sm"
                      variant={section.status === status ? "default" : "outline"}
                      aria-pressed={section.status === status}
                      onClick={() => updateSection(index, { status })}
                    >
                      {STATUS_LABELS[status]}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{section.word_count.toLocaleString("zh-CN")} 字</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={index >= items.length - 1}
                    onClick={() => mergeWithNext(index)}
                  >
                    与下一片段合并
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`section-content-${index}`}>正文预览</Label>
                <Textarea
                  id={`section-content-${index}`}
                  className="min-h-40 resize-y leading-7"
                  value={section.content ?? ""}
                  onChange={(event) => updateSection(index, { content: event.target.value })}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function countText(text: string | null): number {
  return text ? text.replace(/\s/g, "").length : 0;
}

function isMigratableConfirmedSection(section: ImportSection): boolean {
  return section.status === "confirmed" && MIGRATABLE_SECTION_TYPES.has(section.section_type);
}

function migratableSectionCount(sections: ImportSection[]): number {
  return sections.filter((section) => MIGRATABLE_SECTION_TYPES.has(section.section_type)).length;
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
