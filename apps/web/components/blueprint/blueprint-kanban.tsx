"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Story, StoryBlueprint, BlueprintBeat, BlueprintChapter } from "@/types/entity";
import { useBlueprintStore } from "@/stores/blueprint-store";
import { useWritingFocus } from "@/stores/writing-focus-store";
import { KanbanColumn } from "./kanban-column";
import { BeatDetailSheet } from "./beat-detail-sheet";
import { BlueprintEmptyState } from "./blueprint-empty-state";
import { HealthDashboard } from "./health-dashboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LayoutGrid, List, Plus, ChevronDown, ChevronRight, ShieldAlert, TrendingUp, BookOpen } from "lucide-react";
import { BEAT_STATUS_LABELS, BEAT_TYPE_LABELS } from "@superwriter/shared";
import type { BeatStatus, BeatType } from "@superwriter/shared";
import { DeviationReportList } from "./deviation-report-list";
import { ForeshadowingKanban } from "./foreshadowing-kanban";
import { getBlueprintWorkflowState } from "@/lib/blueprint/workflow-state";
import { flattenOutlineLeaves } from "@/lib/blueprint/outline-utils";
import type { SceneExecutionCard } from "@/lib/blueprint/workflow-types";
import { BlueprintWorkflowShell } from "./workflow/blueprint-workflow-shell";
import { StoryContractPanel } from "./workflow/story-contract-panel";
import { SynopsisCandidatePanel } from "./workflow/synopsis-candidate-panel";
import { StructureTemplatePanel } from "./workflow/structure-template-panel";
import { OutlineOverviewPanel } from "./workflow/outline-overview-panel";
import { StoryAssetsPanel } from "./workflow/story-assets-panel";
import { ChapterScenePlanPanel } from "./workflow/chapter-scene-plan-panel";
import { ReverseSyncPanel } from "./workflow/reverse-sync-panel";
import { WORKFLOW_STEPS } from "./workflow/workflow-stepper";

const BEAT_TYPE_OPTIONS: BeatType[] = [
  "setup",
  "inciting_incident",
  "rising_action",
  "midpoint",
  "crisis",
  "climax",
  "falling_action",
  "resolution",
  "turning_point",
  "reveal",
  "custom",
];

function CollapsibleSection({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b px-6">
      <button
        className="flex w-full items-center gap-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {title}
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

function getWorkflowSceneCards(
  contentGuidance: Record<string, unknown>,
): SceneExecutionCard[] {
  const sceneCards = contentGuidance.scene_cards;
  if (!Array.isArray(sceneCards)) return [];

  return sceneCards
    .filter((card): card is Record<string, unknown> =>
      Boolean(card && typeof card === "object" && !Array.isArray(card)),
    )
    .map((card, index) => ({
      id: getWorkflowString(card.id) || `scene-card-${index + 1}`,
      title: getWorkflowString(card.title),
      pov: getWorkflowString(card.pov),
      location: getWorkflowString(card.location),
      time: getWorkflowString(card.time),
      goal: getWorkflowString(card.goal),
      conflict: getWorkflowString(card.conflict),
      turn: getWorkflowString(card.turn),
      outcome: getWorkflowString(card.outcome),
      openingHook: getWorkflowString(card.openingHook),
      endingHook: getWorkflowString(card.endingHook),
      payoff: getWorkflowString(card.payoff),
      serialPacingNote: getWorkflowString(card.serialPacingNote),
    }));
}

function getWorkflowString(value: unknown) {
  return typeof value === "string" ? value : "";
}

interface BlueprintKanbanProps {
  storyId: string;
  story: Story | null;
  blueprint: StoryBlueprint | null;
  beats: BlueprintBeat[];
  blueprintChapters: BlueprintChapter[];
}

export function BlueprintKanban({
  storyId,
  story,
  blueprint,
  beats: initialBeats,
  blueprintChapters,
}: BlueprintKanbanProps) {
  const router = useRouter();
  const viewMode = useBlueprintStore((state) => state.viewMode);
  const selectedBeatId = useBlueprintStore((state) => state.selectedBeatId);
  const isDetailOpen = useBlueprintStore((state) => state.isDetailOpen);
  const selectBeat = useBlueprintStore((state) => state.selectBeat);
  const setViewMode = useBlueprintStore((state) => state.setViewMode);
  const setDetailOpen = useBlueprintStore((state) => state.setDetailOpen);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newBeatTitle, setNewBeatTitle] = useState("");
  const [newBeatType, setNewBeatType] = useState<BeatType>("custom");
  const [newBeatPosition, setNewBeatPosition] = useState("0");
  const [newBeatEmotion, setNewBeatEmotion] = useState("0");
  const [newBeatSynopsis, setNewBeatSynopsis] = useState("");
  const [newBeatDescription, setNewBeatDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreatingBeat, setIsCreatingBeat] = useState(false);
  const [beatBoardError, setBeatBoardError] = useState<string | null>(null);
  const [isConvertingOutline, setIsConvertingOutline] = useState(false);
  const [isAdvancingToChapters, setIsAdvancingToChapters] = useState(false);
  const chapterId = useWritingFocus((state) => state.chapterId);
  const focusSource = useWritingFocus((state) => state.focusSource);
  const setBlueprintFocus = useWritingFocus((state) => state.setBlueprintFocus);
  const setDerivedBeatFocus = useWritingFocus((state) => state.setDerivedBeatFocus);
  const sortedBeats = useMemo(
    () => [...initialBeats].sort((a, b) => a.sort_order - b.sort_order),
    [initialBeats],
  );

  useEffect(() => {
    if (!blueprint || !chapterId || focusSource !== "editor") return;

    const mappedChapter = blueprintChapters.find(
      (chapter) => chapter.content_guidance?.linked_entity_chapter_id === chapterId,
    );
    if (!mappedChapter?.beat_id) return;

    selectBeat(mappedChapter.beat_id);
    setDerivedBeatFocus(mappedChapter.beat_id);
  }, [blueprint, blueprintChapters, chapterId, focusSource, selectBeat, setDerivedBeatFocus]);

  if (!blueprint) {
    return <BlueprintEmptyState storyId={storyId} />;
  }

  const workflow = getBlueprintWorkflowState(blueprint);
  const outlineLeaves = flattenOutlineLeaves(workflow.outline);
  const beatsByStatus: Record<BeatStatus, BlueprintBeat[]> = {
    planned: initialBeats.filter((b) => b.status === "planned"),
    writing: initialBeats.filter((b) => b.status === "writing"),
    completed: initialBeats.filter((b) => b.status === "completed"),
  };

  const handleBeatClick = (beatId: string) => {
    selectBeat(beatId);
    setBlueprintFocus(beatId);
  };

  const handleDragEnd = async (beatId: string, newStatus: BeatStatus) => {
    await fetch(`/api/stories/${storyId}/blueprint/beats`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ beat_id: beatId, status: newStatus }),
    });
  };

  const openCreateBeatDialog = () => {
    setNewBeatPosition(
      initialBeats.length > 0
        ? String(Math.min(100, Math.round((initialBeats.length + 1) * 8)))
        : "0",
    );
    setShowCreateDialog(true);
  };

  const handleCreateBeatsFromOutline = async () => {
    if (outlineLeaves.length === 0) {
      setBeatBoardError("整体大纲中还没有可转换的末级节点");
      return;
    }

    setIsConvertingOutline(true);
    setBeatBoardError(null);

    try {
      const response = await fetch(`/api/stories/${storyId}/blueprint/beats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beats: outlineLeaves.map((node, index) => ({
            title: node.title,
            synopsis: node.synopsis,
            beat_type: node.function === "climax" ? "climax" : "custom",
            position_pct: Math.round(
              (index / Math.max(1, outlineLeaves.length - 1)) * 100,
            ),
            emotion_target: 0,
            sort_order: index,
            content: {
              outlineNodeId: node.id,
              storyFunction: node.function,
            },
          })),
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error?.message ?? "从大纲生成节拍失败");
      }

      setViewMode("kanban");
      router.refresh();
    } catch (error) {
      setBeatBoardError(
        error instanceof Error ? error.message : "从大纲生成节拍失败",
      );
    } finally {
      setIsConvertingOutline(false);
    }
  };

  const handleAdvanceToChapters = async () => {
    if (initialBeats.length === 0) {
      setBeatBoardError("请先添加或生成至少一个节拍");
      return;
    }

    setIsAdvancingToChapters(true);
    setBeatBoardError(null);

    try {
      const response = await fetch(`/api/stories/${storyId}/blueprint`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            ...blueprint.settings,
            workflow: {
              ...workflow,
              completedSteps: Array.from(
                new Set([...workflow.completedSteps, "beats"]),
              ),
              currentStep: "chapters",
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error("进入章节与场景卡失败");
      }

      router.refresh();
    } catch (error) {
      setBeatBoardError(
        error instanceof Error ? error.message : "进入章节与场景卡失败",
      );
    } finally {
      setIsAdvancingToChapters(false);
    }
  };

  const resetCreateForm = () => {
    setNewBeatTitle("");
    setNewBeatType("custom");
    setNewBeatPosition("0");
    setNewBeatEmotion("0");
    setNewBeatSynopsis("");
    setNewBeatDescription("");
    setCreateError(null);
  };

  const handleCreateBeat = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = newBeatTitle.trim();

    if (!title) {
      setCreateError("请先填写节拍标题");
      return;
    }

    const position = Number(newBeatPosition);
    const emotion = Number(newBeatEmotion);

    if (!Number.isFinite(position) || position < 0 || position > 100) {
      setCreateError("故事位置需要在 0 到 100 之间");
      return;
    }

    if (!Number.isInteger(emotion) || emotion < -10 || emotion > 10) {
      setCreateError("情绪目标需要是 -10 到 10 之间的整数");
      return;
    }

    setIsCreatingBeat(true);
    setCreateError(null);

    try {
      const response = await fetch(`/api/stories/${storyId}/blueprint/beats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          beat_type: newBeatType,
          position_pct: position,
          emotion_target: emotion,
          synopsis: newBeatSynopsis.trim() || undefined,
          description: newBeatDescription.trim() || undefined,
          sort_order: initialBeats.length,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error?.message ?? "创建节拍失败");
      }

      resetCreateForm();
      setShowCreateDialog(false);
      setViewMode("kanban");
      router.refresh();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "创建节拍失败");
    } finally {
      setIsCreatingBeat(false);
    }
  };

  const workflowStepLabel =
    WORKFLOW_STEPS.find((step) => step.value === workflow.currentStep)?.label ??
    workflow.currentStep;

  const writingPanel = (
    <div className="mx-auto w-full max-w-5xl px-6 py-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">开始写作</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            把已确认的章节计划带到编辑器里，开始写第一段正文。
          </p>
        </div>
        <Button asChild>
          <Link href={`/stories/${storyId}/editor`}>打开编辑器</Link>
        </Button>
      </div>

      {blueprintChapters.length > 0 ? (
        <div className="space-y-3">
          {[...blueprintChapters]
            .sort((a, b) => a.sort_order - b.sort_order)
            .slice(0, 5)
            .map((chapter) => {
              const sceneCards = getWorkflowSceneCards(chapter.content_guidance);
              const firstScene = sceneCards[0];

              return (
                <div key={chapter.id} className="rounded-lg border border-workspace-border/70 bg-workspace-paper/80 p-4 shadow-sm dark:bg-workspace-surface-strong">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-base font-semibold">{chapter.title}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline">
                          {chapter.target_word_count ?? 0} 字
                        </Badge>
                        <Badge variant="outline">{sceneCards.length} 张场景卡</Badge>
                      </div>
                      {firstScene && (
                        <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                          <p>
                            <span className="font-medium text-foreground">本章目标：</span>
                            {firstScene.goal || chapter.synopsis || "进入编辑器后补齐本章目标。"}
                          </p>
                          <p>
                            <span className="font-medium text-foreground">章末钩子：</span>
                            {firstScene.endingHook || "进入编辑器前可以先补一个章末钩子。"}
                          </p>
                        </div>
                      )}
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/stories/${storyId}/editor`}>写这一章</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <div className="rounded-lg border border-workspace-border/70 bg-workspace-paper/72 p-6 text-sm leading-6 text-muted-foreground dark:bg-workspace-surface">
          还没有章节场景卡。可以先打开编辑器自由写作，也可以回到“章节场景”生成更明确的本章目标、冲突和章末钩子。
        </div>
      )}
    </div>
  );

  const beatWorkspace = (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">{blueprint.title}</h1>
            <Badge variant="outline">{initialBeats.length} 个节拍</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "kanban" | "list" | "deviation" | "arc" | "foreshadowing")}>
              <TabsList className="h-8">
                <TabsTrigger value="kanban" className="h-6 px-2">
                  <LayoutGrid className="h-3.5 w-3.5" />
                </TabsTrigger>
                <TabsTrigger value="list" className="h-6 px-2">
                  <List className="h-3.5 w-3.5" />
                </TabsTrigger>
                <TabsTrigger value="arc" className="h-6 px-2" title="角色弧光">
                  <TrendingUp className="h-3.5 w-3.5" />
                </TabsTrigger>
                <TabsTrigger value="foreshadowing" className="h-6 px-2" title="伏笔管理">
                  <BookOpen className="h-3.5 w-3.5" />
                </TabsTrigger>
                <TabsTrigger value="deviation" className="h-6 px-2" title="偏差报告">
                  <ShieldAlert className="h-3.5 w-3.5" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              size="sm"
              onClick={openCreateBeatDialog}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              添加节拍
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCreateBeatsFromOutline}
              disabled={isConvertingOutline || outlineLeaves.length === 0}
            >
              {isConvertingOutline ? "生成中..." : "从大纲生成节拍"}
            </Button>
            <Button
              size="sm"
              onClick={handleAdvanceToChapters}
              disabled={isAdvancingToChapters || initialBeats.length === 0}
            >
              {isAdvancingToChapters ? "进入中..." : "确认节拍，生成章节与场景卡"}
            </Button>
          </div>
        </div>
      </div>

      {beatBoardError && (
        <div className="mx-6 mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {beatBoardError}
        </div>
      )}

      <CollapsibleSection title="情绪曲线与健康度" defaultOpen={false}>
        <HealthDashboard beats={initialBeats} onBeatClick={handleBeatClick} />
      </CollapsibleSection>

      {viewMode === "deviation" ? (
        <div className="flex-1 overflow-auto p-6">
          <DeviationReportList storyId={storyId} />
        </div>
      ) : viewMode === "arc" ? (
        <div className="flex-1 overflow-auto p-6">
          <div className="text-sm text-muted-foreground">
            角色弧光可视化将在角色数据中定义弧光节点后显示。
            请在角色详情中设置「成长弧光」的起点、终点和转变节点。
          </div>
        </div>
      ) : viewMode === "foreshadowing" ? (
        <div className="flex-1 overflow-auto p-6">
          <ForeshadowingKanban storyId={storyId} />
        </div>
      ) : viewMode === "kanban" ? (
        <div className="flex flex-1 gap-4 overflow-x-auto p-6">
          {initialBeats.length === 0 && (
            <div className="flex w-80 shrink-0 flex-col justify-center rounded-lg border border-dashed border-workspace-border/70 bg-workspace-paper/72 p-5 text-center dark:bg-workspace-surface">
              <div className="text-sm font-semibold">还没有节拍</div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                可以手动添加第一个节拍，也可以把整体大纲的末级节点转换为节拍卡。
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Button size="sm" onClick={openCreateBeatDialog}>
                  添加第一个节拍
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCreateBeatsFromOutline}
                  disabled={isConvertingOutline || outlineLeaves.length === 0}
                >
                  {isConvertingOutline ? "生成中..." : "从大纲生成节拍"}
                </Button>
              </div>
            </div>
          )}
          {(["planned", "writing", "completed"] as BeatStatus[]).map((status) => (
            <KanbanColumn
              key={status}
              title={BEAT_STATUS_LABELS[status]}
              status={status}
              beats={beatsByStatus[status]}
              storyId={storyId}
              onBeatClick={handleBeatClick}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-2">
            {sortedBeats.map((beat) => (
              <div
                key={beat.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-accent"
                onClick={() => handleBeatClick(beat.id)}
              >
                <Badge variant="outline" className="text-xs shrink-0">
                  {BEAT_STATUS_LABELS[beat.status]}
                </Badge>
                <span className="font-medium text-sm">{beat.title}</span>
                <span className="text-xs text-muted-foreground">
                  {beat.position_pct.toFixed(0)}%
                </span>
                {beat.emotion_target !== 0 && (
                  <span className="text-xs text-muted-foreground">
                    情绪 {beat.emotion_target > 0 ? "+" : ""}{beat.emotion_target}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <form onSubmit={handleCreateBeat} className="space-y-5">
            <DialogHeader>
              <DialogTitle>添加节拍</DialogTitle>
              <DialogDescription>
                为当前叙事蓝图补充一个可追踪的情节点，之后可拖拽到写作状态中。
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="beat-title">节拍标题</Label>
                <Input
                  id="beat-title"
                  value={newBeatTitle}
                  onChange={(event) => setNewBeatTitle(event.target.value)}
                  placeholder="例如：主角第一次发现异常"
                  maxLength={200}
                  autoFocus
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label>节拍类型</Label>
                  <Select value={newBeatType} onValueChange={(value) => setNewBeatType(value as BeatType)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BEAT_TYPE_OPTIONS.map((type) => (
                        <SelectItem key={type} value={type}>
                          {BEAT_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="beat-position">故事位置</Label>
                  <Input
                    id="beat-position"
                    type="number"
                    min={0}
                    max={100}
                    value={newBeatPosition}
                    onChange={(event) => setNewBeatPosition(event.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="beat-emotion">情绪目标</Label>
                  <Input
                    id="beat-emotion"
                    type="number"
                    min={-10}
                    max={10}
                    step={1}
                    value={newBeatEmotion}
                    onChange={(event) => setNewBeatEmotion(event.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="beat-synopsis">节拍摘要</Label>
                <Textarea
                  id="beat-synopsis"
                  value={newBeatSynopsis}
                  onChange={(event) => setNewBeatSynopsis(event.target.value)}
                  placeholder="写下这个节拍的主要剧情推进、冲突或信息揭示。"
                  rows={4}
                  maxLength={5000}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="beat-description">补充说明</Label>
                <Textarea
                  id="beat-description"
                  value={newBeatDescription}
                  onChange={(event) => setNewBeatDescription(event.target.value)}
                  placeholder="可选：角色动机、场景提示、伏笔或创作备注。"
                  rows={3}
                  maxLength={2000}
                />
              </div>

              {createError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {createError}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                disabled={isCreatingBeat}
              >
                取消
              </Button>
              <Button type="submit" disabled={isCreatingBeat}>
                {isCreatingBeat ? "创建中..." : "创建节拍"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <BeatDetailSheet
        storyId={storyId}
        beatId={selectedBeatId}
        open={isDetailOpen}
        onClose={() => setDetailOpen(false)}
        beats={initialBeats}
      />
    </div>
  );

  return (
    <BlueprintWorkflowShell
      storyId={storyId}
      story={story}
      blueprint={blueprint}
      workflow={workflow}
    >
      {workflow.currentStep === "beats" ? (
        beatWorkspace
      ) : workflow.currentStep === "contract" ? (
        <StoryContractPanel
          storyId={storyId}
          blueprint={blueprint}
          workflow={workflow}
        />
      ) : workflow.currentStep === "synopsis" ? (
        <SynopsisCandidatePanel
          storyId={storyId}
          blueprint={blueprint}
          workflow={workflow}
        />
      ) : workflow.currentStep === "structure" ? (
        <StructureTemplatePanel
          storyId={storyId}
          blueprint={blueprint}
          workflow={workflow}
        />
      ) : workflow.currentStep === "outline" ? (
        <OutlineOverviewPanel
          storyId={storyId}
          blueprint={blueprint}
          workflow={workflow}
        />
      ) : workflow.currentStep === "story-assets" ? (
        <StoryAssetsPanel
          storyId={storyId}
          blueprint={blueprint}
          workflow={workflow}
        />
      ) : workflow.currentStep === "chapters" ? (
        <ChapterScenePlanPanel
          storyId={storyId}
          workflow={workflow}
          beats={initialBeats}
          blueprintChapters={blueprintChapters}
        />
      ) : workflow.currentStep === "writing" ? (
        writingPanel
      ) : workflow.currentStep === "sync" ? (
        <ReverseSyncPanel
          storyId={storyId}
          blueprint={blueprint}
          workflow={workflow}
        />
      ) : (
        <div className="flex min-h-full items-center justify-center p-8">
          <div className="max-w-md rounded-lg border border-workspace-border/70 bg-workspace-paper/72 p-6 text-center shadow-sm dark:bg-workspace-surface">
            <div className="text-sm font-semibold">{workflowStepLabel}</div>
            <p className="mt-2 text-sm text-muted-foreground">
              当前步骤的工作面板将在对应任务中接入。你可以通过上方步骤导航先进入节拍板继续规划。
            </p>
          </div>
        </div>
      )}
    </BlueprintWorkflowShell>
  );
}
