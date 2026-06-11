"use client";

import Link from "next/link";
import { use, useState, useCallback, useEffect, useRef } from "react";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, Download, Upload, Sparkles, PanelRightClose, Printer, LayoutGrid } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { Entity } from "@/types/entity";
import { toast } from "sonner";
import { htmlToMarkdown, markdownToHtml } from "@/lib/utils/markdown";
import { SortableChapterItem } from "@/components/editor/sortable-chapter-item";
import { DeviationBubble } from "@/components/editor/deviation-bubble";
import { AIAssistantPanel } from "@/components/ai/ai-assistant-panel";
import { useWritingBrief } from "@/hooks/use-writing-brief";
import {
  addDraftCandidate,
  markDraftCandidateDecision,
  mergeDraftCandidates,
  removeDraftCandidate,
} from "@/lib/editor/ai-draft-candidates";
import {
  mapGenerationRowToDraft,
  type AIGenerationArtifactRow,
} from "@/lib/ai/ai-generation-artifacts";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useWritingFocus } from "@/stores/writing-focus-store";
import type { AIApplyMode, AIApplyRequest, AIEditorDraft } from "@/types/ai";
import type { AIProvider } from "@superwriter/shared";

export default function EditorPage({
  params,
}: {
  params: Promise<{ storyId: string }>;
}) {
  const { storyId } = use(params);
  const [chapters, setChapters] = useState<Entity[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [aiPrefs, setAiPrefs] = useState<{
    provider: string;
    billingProvider: AIProvider;
    model: string;
  }>({
    provider: "anthropic",
    billingProvider: "sw-free",
    model: "",
  });
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [mobileAiPanelOpen, setMobileAiPanelOpen] = useState(false);
  const [aiDraft, setAiDraft] = useState<AIEditorDraft | null>(null);
  const [aiDraftCandidates, setAiDraftCandidates] = useState<AIEditorDraft[]>([]);
  const [aiApplyRequest, setAiApplyRequest] = useState<AIApplyRequest | null>(
    null,
  );
  const [applyingDraftId, setApplyingDraftId] = useState<string | null>(null);
  const applyingDraftIdRef = useRef<string | null>(null);
  const pendingApplyDraftsRef = useRef(new Map<string, AIEditorDraft>());
  const [liveChapterContent, setLiveChapterContent] = useState<{
    chapterId: string | null;
    html: string;
  }>({ chapterId: null, html: "" });
  const setStoryFocus = useWritingFocus((state) => state.setStoryFocus);
  const setEditorFocus = useWritingFocus((state) => state.setEditorFocus);
  const setDerivedBeatFocus = useWritingFocus((state) => state.setDerivedBeatFocus);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setStoryFocus(storyId);

    fetch(`/api/stories/${storyId}/entities?type=chapter`)
      .then((r) => r.json())
      .then((json) => {
        const data = (json.data ?? []).sort(
          (a: Entity, b: Entity) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
        );
        setChapters(data);
        if (data.length > 0) {
          setSelectedChapterId(data[0].id);
          setLiveChapterContent({
            chapterId: data[0].id,
            html: data[0].content ?? "",
          });
        }
      })
      .finally(() => setLoading(false));

    fetch("/api/profile/preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setAiPrefs({
            provider: data.ai_provider_preference ?? "sw-free",
            billingProvider: data.ai_billing_provider ?? "sw-free",
            model: data.ai_model_preference ?? "",
          });
        }
      })
      .catch(() => {});
  }, [setStoryFocus, storyId]);

  useEffect(() => {
    if (selectedChapterId) {
      setEditorFocus(selectedChapterId);
    }
  }, [selectedChapterId, setEditorFocus]);

  const selectedChapter = chapters.find((c) => c.id === selectedChapterId);
  const currentChapterText =
    liveChapterContent.chapterId === selectedChapter?.id
      ? liveChapterContent.html
      : selectedChapter?.content ?? "";

  useEffect(() => {
    if (!selectedChapter?.id) return;

    let cancelled = false;

    setAiDraft((current) =>
      current?.chapterId && current.chapterId !== selectedChapter.id
        ? null
        : current,
    );
    setAiDraftCandidates((current) =>
      current.filter((draft) => draft.chapterId === selectedChapter.id),
    );

    fetch(
      `/api/stories/${storyId}/ai-generations?chapterId=${selectedChapter.id}&status=pending&contentType=draft&limit=20`,
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (cancelled) return;
        const rows = Array.isArray(body?.data)
          ? body.data as AIGenerationArtifactRow[]
          : [];
        const drafts = rows
          .map(mapGenerationRowToDraft)
          .filter((draft): draft is AIEditorDraft => Boolean(draft));
        setAiDraftCandidates((current) =>
          mergeDraftCandidates(
            drafts,
            current.filter((draft) => draft.chapterId === selectedChapter.id),
          ),
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [selectedChapter?.id, storyId]);

  const { brief: writingBrief, loading: writingBriefLoading } = useWritingBrief(
    storyId,
    selectedChapter?.id,
  );

  useEffect(() => {
    setDerivedBeatFocus(writingBrief?.beatId ?? null);
  }, [setDerivedBeatFocus, writingBrief?.beatId]);

  const isMobileAIWorkbench = useCallback(() => {
    if (typeof window === "undefined") return false;
    return !window.matchMedia("(min-width: 1280px)").matches;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(min-width: 1280px)");
    const closeMobilePanelOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setMobileAiPanelOpen(false);
      }
    };

    if (mediaQuery.matches) {
      setMobileAiPanelOpen(false);
    }
    mediaQuery.addEventListener("change", closeMobilePanelOnDesktop);

    return () =>
      mediaQuery.removeEventListener("change", closeMobilePanelOnDesktop);
  }, []);

  const handleAIDraftGenerated = useCallback((draft: AIEditorDraft) => {
    setAiDraft(draft);
    setAiDraftCandidates((current) => addDraftCandidate(current, draft));
    setAiPanelOpen(true);
    if (isMobileAIWorkbench()) {
      setMobileAiPanelOpen(true);
    }
  }, [isMobileAIWorkbench]);

  const handleSelectDraft = useCallback((draft: AIEditorDraft) => {
    setAiDraft(draft);
    setAiPanelOpen(true);
  }, []);

  const updateGenerationStatus = useCallback(
    async (
      draft: AIEditorDraft,
      status: "applied" | "saved" | "discarded",
      appliedTarget?: { chapterId: string; applyMode: AIApplyMode; requestId: string },
    ) => {
      if (!draft.generationId) return true;

      try {
        const res = await fetch(
          `/api/stories/${storyId}/ai-generations/${draft.generationId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status, appliedTarget }),
          },
        );

        return res.ok;
      } catch {
        return false;
      }
    },
    [storyId],
  );

  const handleCopyDraft = useCallback(async (draft: AIEditorDraft) => {
    try {
      await navigator.clipboard.writeText(draft.resultText);
      toast.success("已复制候选稿");
    } catch {
      toast.error("复制失败，请手动选择文本");
    }
  }, []);

  const handleDiscardDraft = useCallback(
    async (draft: AIEditorDraft) => {
      const saved = await updateGenerationStatus(draft, "discarded");
      if (!saved) {
        toast.error("废弃状态保存失败");
        return;
      }
      setAiDraftCandidates((current) =>
        removeDraftCandidate(
          markDraftCandidateDecision(current, draft.id, "rejected"),
          draft.id,
        ),
      );
      setAiDraft((current) => (current?.id === draft.id ? null : current));
      toast.success("已废弃候选稿");
    },
    [updateGenerationStatus],
  );

  const handleMarkDraftReference = useCallback(async (draft: AIEditorDraft) => {
    const saved = await updateGenerationStatus(draft, "saved");
    if (!saved) {
      toast.error("灵感状态保存失败");
      return;
    }
    setAiDraftCandidates((current) =>
      markDraftCandidateDecision(current, draft.id, "reference"),
    );
    setAiDraft((current) =>
      current?.id === draft.id ? { ...current, decision: "reference" } : current,
    );
    toast.success("已保留为灵感参考");
  }, [updateGenerationStatus]);

  const handleApplyDraft = useCallback(
    (mode: AIApplyMode, draft: AIEditorDraft) => {
      if (applyingDraftIdRef.current) {
        toast.error("正在应用上一条候选稿");
        return;
      }

      if (!selectedChapterId) {
        toast.error("请先选择一个章节再应用候选稿");
        return;
      }

      if (draft.chapterId && draft.chapterId !== selectedChapterId) {
        toast.error("请先切回生成该草稿的章节再应用");
        return;
      }

      const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${mode}`;
      pendingApplyDraftsRef.current.set(requestId, draft);
      applyingDraftIdRef.current = draft.id;
      setApplyingDraftId(draft.id);

      setAiApplyRequest({
        id: requestId,
        draftId: draft.id,
        chapterId: draft.chapterId,
        mode,
        text: draft.resultText,
        selection: draft.selection,
      });
    },
    [selectedChapterId],
  );

  const handleAIApplyHandled = useCallback(async (requestId: string, applied: boolean) => {
    const handledRequest = aiApplyRequest?.id === requestId ? aiApplyRequest : null;
    const handledDraft = pendingApplyDraftsRef.current.get(requestId) ?? null;
    pendingApplyDraftsRef.current.delete(requestId);

    setAiApplyRequest((current) =>
      current?.id === requestId ? null : current,
    );

    try {
      if (!applied || !handledDraft || !handledRequest) return;

      const targetChapterId = selectedChapterId ?? handledDraft.chapterId;
      if (!targetChapterId) {
        toast.error("采用来源缺少章节，正文已更新");
        return;
      }

      const saved = await updateGenerationStatus(handledDraft, "applied", {
        chapterId: targetChapterId,
        applyMode: handledRequest.mode,
        requestId,
      });

      if (!saved) {
        toast.error("采用来源保存失败，正文已更新");
        return;
      }

      setAiDraftCandidates((current) =>
        removeDraftCandidate(
          markDraftCandidateDecision(current, handledDraft.id, "accepted"),
          handledDraft.id,
        ),
      );
      setAiDraft((current) =>
        current?.id === handledDraft.id ? null : current,
      );
    } finally {
      applyingDraftIdRef.current = null;
      setApplyingDraftId(null);
    }
  }, [aiApplyRequest, selectedChapterId, updateGenerationStatus]);

  const handleCreateChapter = async () => {
    const chapterNumber = chapters.length + 1;
    const res = await fetch(`/api/stories/${storyId}/entities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "chapter",
        name: `第${chapterNumber}章`,
        sort_order: chapterNumber,
        data: { chapter_number: chapterNumber, word_count: 0, writing_status: "outline" },
      }),
    });

    if (!res.ok) {
      toast.error("创建章节失败");
      return;
    }

    const { data: chapter } = await res.json();
    setChapters((prev) => [...prev, chapter]);
    setSelectedChapterId(chapter.id);
    setLiveChapterContent({
      chapterId: chapter.id,
      html: chapter.content ?? "",
    });
    setEditorFocus(chapter.id);
    toast.success(`已创建第${chapterNumber}章`);
  };

  const handleDeleteChapter = useCallback(
    async (chapterId: string) => {
      const chapter = chapters.find((item) => item.id === chapterId);
      if (!chapter) return;

      const confirmed = window.confirm(`确定要删除「${chapter.name}」吗？此操作不可撤销。`);
      if (!confirmed) return;

      const res = await fetch(`/api/stories/${storyId}/entities/${chapterId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        toast.error("删除章节失败");
        return;
      }

      const deletedIndex = chapters.findIndex((item) => item.id === chapterId);
      const nextChapters = chapters.filter((item) => item.id !== chapterId);
      setChapters(nextChapters);

      if (selectedChapterId === chapterId) {
        const fallbackChapter =
          nextChapters[Math.min(deletedIndex, nextChapters.length - 1)] ?? null;

        setSelectedChapterId(fallbackChapter?.id ?? null);
        setLiveChapterContent({
          chapterId: fallbackChapter?.id ?? null,
          html: fallbackChapter?.content ?? "",
        });
        if (fallbackChapter) {
          setEditorFocus(fallbackChapter.id);
        }
      }
      toast.success("章节已删除");
    },
    [chapters, selectedChapterId, setEditorFocus, storyId],
  );

  const handleSave = useCallback(
    async (html: string) => {
      if (!selectedChapterId) return;

      await fetch(`/api/stories/${storyId}/entities/${selectedChapterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: html }),
      });
      
      setChapters((prev) =>
        prev.map((c) =>
          c.id === selectedChapterId ? { ...c, content: html } : c
        )
      );
    },
    [storyId, selectedChapterId],
  );

  const handleEditorUpdate = useCallback((html: string) => {
    setLiveChapterContent({
      chapterId: selectedChapterId,
      html,
    });
  }, [selectedChapterId]);

  const handleExportMarkdown = () => {
    if (!selectedChapter || !selectedChapter.content) {
      toast.error("没有内容可导出");
      return;
    }
    const markdown = htmlToMarkdown(selectedChapter.content);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedChapter.name}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("已导出 Markdown");
  };

  const handleExportPDF = () => {
    if (!selectedChapter) {
      toast.error("没有内容可导出");
      return;
    }
    window.print();
  };

  const handleImportMarkdown = () => {
    if (!selectedChapter) {
      toast.error("请先选择或创建一个章节");
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".md";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const text = await file.text();
      const html = await markdownToHtml(text);
      await handleSave(html);
      toast.success("已导入 Markdown，内容已覆盖当前章节");
    };
    input.click();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setChapters((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // 异步更新后端
        Promise.all(
          newItems.map((item, index) =>
            fetch(`/api/stories/${storyId}/entities/${item.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sort_order: index + 1 }),
            })
          )
        ).catch(() => toast.error("排序保存失败"));

        return newItems;
      });
    }
  };

  return (
    <div className="flex h-full min-w-0 gap-3 print:block print:h-auto print:p-0">
      <aside className="studio-soft-panel flex w-64 shrink-0 flex-col overflow-hidden rounded-[1.35rem] print:hidden">
        <div className="flex items-center justify-between border-b border-workspace-border/60 px-3.5 py-3">
          <div>
            <h2 className="text-sm font-semibold">章节</h2>
            <p className="text-[11px] text-muted-foreground">
              {chapters.length} 个章节
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="studio-command-button h-8 w-8 rounded-full border-0 shadow-none" onClick={handleImportMarkdown} title="导入 Markdown">
              <Upload className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="studio-command-button h-8 w-8 rounded-full border-0 shadow-none" onClick={handleExportMarkdown} title="导出 Markdown">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="studio-command-button h-8 w-8 rounded-full border-0 shadow-none" onClick={handleExportPDF} title="导出 PDF (打印)">
              <Printer className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="studio-command-button h-8 w-8 rounded-full border-0 text-[var(--module-editor)] shadow-none" onClick={handleCreateChapter} title="新建章节">
              <PlusCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Link
          href={`/stories/${storyId}/blueprint`}
          className="m-2 mb-0 flex items-center gap-2 rounded-xl border border-workspace-border/70 bg-workspace-paper/60 px-3 py-2 text-sm text-foreground/82 transition-colors hover:bg-workspace-paper hover:text-foreground"
          title="查看故事蓝图和整体大纲"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--module-blueprint)]/12 text-[var(--module-blueprint)]">
            <LayoutGrid className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block font-medium leading-4">故事蓝图</span>
            <span className="block truncate text-[11px] text-muted-foreground">
              查看整体大纲、节拍和章节规划
            </span>
          </span>
        </Link>
        <ScrollArea className="min-h-0 flex-1">
          {loading ? (
            <div className="p-3 text-sm text-muted-foreground">加载中...</div>
          ) : chapters.length === 0 ? (
            <div className="m-2 rounded-xl border border-dashed border-workspace-border/80 bg-workspace-paper/60 p-3 text-sm text-muted-foreground dark:bg-workspace-surface">
              暂无章节，点击 + 创建。
            </div>
          ) : (
            <div className="space-y-1.5 p-2">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={chapters.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {chapters.map((chapter) => (
                    <SortableChapterItem
                      key={chapter.id}
                      chapter={chapter}
                      isSelected={chapter.id === selectedChapterId}
                      onSelect={(chapterId) => {
                        const chapter = chapters.find((item) => item.id === chapterId);
                        setSelectedChapterId(chapterId);
                        setLiveChapterContent({
                          chapterId,
                          html: chapter?.content ?? "",
                        });
                        setEditorFocus(chapterId);
                      }}
                      onDelete={handleDeleteChapter}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          )}
        </ScrollArea>
      </aside>

      <div className="studio-paper relative min-w-0 flex-1 overflow-hidden rounded-[1.6rem]">
        <DeviationBubble storyId={storyId} />
        {selectedChapter ? (
          <TiptapEditor
            key={selectedChapter.id}
            content={selectedChapter.content ?? ""}
            onUpdate={handleEditorUpdate}
            onSave={handleSave}
            placeholder="开始写作这一章..."
            storyId={storyId}
            chapterId={selectedChapter.id}
            aiProvider={aiPrefs.provider}
            aiModel={aiPrefs.model}
            onAIDraftGenerated={handleAIDraftGenerated}
            aiApplyRequest={aiApplyRequest}
            onAIApplyHandled={handleAIApplyHandled}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="studio-soft-panel rounded-[1.25rem] border-dashed p-8 text-center">
              <p className="text-lg font-medium text-foreground">选择或创建一个章节开始写作</p>
              <Button className="mt-4 rounded-full" onClick={handleCreateChapter}>
                <PlusCircle className="mr-2 h-4 w-4" />
                新建第一章
              </Button>
            </div>
          </div>
        )}
      </div>

      {aiPanelOpen ? (
        <aside className="studio-ai-tray hidden w-[22.5rem] shrink-0 flex-col overflow-hidden rounded-[1.35rem] print:hidden xl:flex">
          <div className="flex items-center justify-between border-b border-workspace-border/60 px-3 py-2.5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 liquid-spectrum-text" />
              上下文智能
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="studio-command-button h-8 w-8 rounded-full border-0 shadow-none"
              onClick={() => setAiPanelOpen(false)}
              title="收起 AI 面板"
            >
              <PanelRightClose className="h-4 w-4" />
            </Button>
          </div>
          <AIAssistantPanel
            storyId={storyId}
            aiProvider={aiPrefs.provider}
            aiBillingProvider={aiPrefs.billingProvider}
            aiModel={aiPrefs.model}
            draft={aiDraft}
            currentChapterId={selectedChapter?.id ?? null}
            currentChapterName={selectedChapter?.name}
            currentChapterText={currentChapterText}
            writingBrief={writingBrief}
            writingBriefLoading={writingBriefLoading}
            draftCandidates={aiDraftCandidates}
            applyingDraftId={applyingDraftId}
            onSelectDraft={handleSelectDraft}
            onApplyDraft={handleApplyDraft}
            onCopyDraft={handleCopyDraft}
            onDiscardDraft={handleDiscardDraft}
            onMarkDraftReference={handleMarkDraftReference}
            onDraftGenerated={handleAIDraftGenerated}
            onDraftUpdated={handleAIDraftGenerated}
            onClearDraft={() => setAiDraft(null)}
          />
        </aside>
      ) : (
        <aside className="studio-ai-tray hidden w-12 shrink-0 justify-center rounded-[1.35rem] pt-2 print:hidden xl:flex">
          <Button
            variant="ghost"
            size="icon"
            className="studio-command-button h-8 w-8 rounded-full border-0 text-[var(--workspace-ai)] shadow-none"
            onClick={() => setAiPanelOpen(true)}
            title="打开 AI 面板"
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        </aside>
      )}

      <Button
        variant="secondary"
        size="icon"
        className="studio-command-button liquid-ai-glow fixed right-4 bottom-4 z-40 h-12 w-12 rounded-full text-[var(--workspace-ai)] print:hidden xl:hidden"
        onClick={() => setMobileAiPanelOpen(true)}
        title="打开 AI 面板"
      >
        <Sparkles className="h-4 w-4" />
      </Button>

      <Sheet open={mobileAiPanelOpen} onOpenChange={setMobileAiPanelOpen}>
        <SheetContent className="studio-ai-tray w-[92vw] max-w-md gap-0 border-l p-0 sm:rounded-l-[1.75rem]" showCloseButton>
          <SheetTitle className="sr-only">AI 助手</SheetTitle>
          <AIAssistantPanel
            storyId={storyId}
            aiProvider={aiPrefs.provider}
            aiBillingProvider={aiPrefs.billingProvider}
            aiModel={aiPrefs.model}
            draft={aiDraft}
            currentChapterId={selectedChapter?.id ?? null}
            currentChapterName={selectedChapter?.name}
            currentChapterText={currentChapterText}
            writingBrief={writingBrief}
            writingBriefLoading={writingBriefLoading}
            draftCandidates={aiDraftCandidates}
            applyingDraftId={applyingDraftId}
            onSelectDraft={handleSelectDraft}
            onApplyDraft={handleApplyDraft}
            onCopyDraft={handleCopyDraft}
            onDiscardDraft={handleDiscardDraft}
            onMarkDraftReference={handleMarkDraftReference}
            onDraftGenerated={handleAIDraftGenerated}
            onDraftUpdated={handleAIDraftGenerated}
            onClearDraft={() => setAiDraft(null)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
