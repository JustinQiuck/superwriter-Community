"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BlueprintBeat, BlueprintChapter } from "@/types/entity";
import type {
  BlueprintWorkflowState,
  SceneExecutionCard,
} from "@/lib/blueprint/workflow-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SceneCardEditor } from "./scene-card-editor";

interface ChapterScenePlanPanelProps {
  storyId: string;
  workflow: BlueprintWorkflowState;
  beats: BlueprintBeat[];
  blueprintChapters: BlueprintChapter[];
}

export function ChapterScenePlanPanel({
  storyId,
  workflow,
  beats,
  blueprintChapters,
}: ChapterScenePlanPanelProps) {
  const router = useRouter();
  const [chapters, setChapters] = useState<BlueprintChapter[]>(
    [...blueprintChapters].sort((a, b) => a.sort_order - b.sort_order),
  );
  const [loading, setLoading] = useState(false);
  const [savingChapterId, setSavingChapterId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const beatById = useMemo(() => {
    return new Map(beats.map((beat) => [beat.id, beat]));
  }, [beats]);

  const groupedChapters = useMemo(() => {
    const groups = new Map<string, BlueprintChapter[]>();

    for (const chapter of chapters) {
      const key = chapter.volume_id ?? "unassigned";
      groups.set(key, [...(groups.get(key) ?? []), chapter]);
    }

    return Array.from(groups.entries()).map(([volumeId, groupChapters]) => ({
      volumeId,
      chapters: groupChapters.sort((a, b) => a.sort_order - b.sort_order),
    }));
  }, [chapters]);

  const generateChaptersFromBeats = async () => {
    const existingBeatIds = new Set(
      chapters.map((chapter) => chapter.beat_id).filter(Boolean),
    );
    const sourceBeats = [...beats]
      .sort((a, b) => a.sort_order - b.sort_order)
      .filter((beat) => !existingBeatIds.has(beat.id));

    if (sourceBeats.length === 0) {
      setError(beats.length === 0 ? "请先添加或生成节拍" : "所有节拍都已生成章节");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const createdChapters: BlueprintChapter[] = [];

      for (const beat of sourceBeats) {
        const response = await fetch(`/api/stories/${storyId}/blueprint/chapters`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            beat_id: beat.id,
            title: beat.title,
            synopsis: beat.synopsis ?? beat.description ?? "",
            target_word_count:
              workflow.structureTemplate === "web_serial" ? 2200 : 3000,
            target_emotion: beat.emotion_target,
            content_guidance: {
              key_events: [beat.title],
              notes: beat.synopsis ?? beat.description ?? "",
              scene_cards: [createSceneCard(beat.title)],
            },
            sort_order: beat.sort_order,
          }),
        });

        if (!response.ok) {
          throw new Error(`生成章节「${beat.title}」失败`);
        }

        const result = await response.json();
        if (result?.data) {
          createdChapters.push(result.data as BlueprintChapter);
        }
      }

      setChapters((current) =>
        [...current, ...createdChapters].sort((a, b) => a.sort_order - b.sort_order),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成章节失败");
    } finally {
      setLoading(false);
    }
  };

  const updateChapterSceneCards = (
    chapterId: string,
    nextSceneCards: SceneExecutionCard[],
  ) => {
    setChapters((current) =>
      current.map((chapter) =>
        chapter.id === chapterId
          ? {
              ...chapter,
              content_guidance: {
                ...chapter.content_guidance,
                scene_cards: nextSceneCards,
              },
            }
          : chapter,
      ),
    );
  };

  const saveChapterSceneCards = async (chapter: BlueprintChapter) => {
    setSavingChapterId(chapter.id);
    setError(null);

    try {
      const response = await fetch(`/api/stories/${storyId}/blueprint/chapters`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapter_id: chapter.id,
          content_guidance: chapter.content_guidance,
        }),
      });

      if (!response.ok) {
        throw new Error("保存场景卡失败");
      }

      const result = await response.json();
      if (result?.data) {
        setChapters((current) =>
          current.map((item) =>
            item.id === chapter.id ? (result.data as BlueprintChapter) : item,
          ),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存场景卡失败");
    } finally {
      setSavingChapterId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">章节与场景卡</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            把节拍拆成可执行章节，并为每章维护至少一个场景执行卡。
          </p>
        </div>
        <Button onClick={generateChaptersFromBeats} disabled={loading}>
          {loading ? "生成中..." : chapters.length > 0 ? "补齐缺失章节" : "从节拍生成章节"}
        </Button>
      </div>

      {error && (
        <div className="mb-5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {chapters.length === 0 ? (
        <div className="rounded-lg border border-workspace-border/70 bg-workspace-paper/72 p-8 text-center text-sm text-muted-foreground dark:bg-workspace-surface">
          暂无章节计划。请先确认节拍，再从节拍生成章节与场景卡。
        </div>
      ) : (
        <div className="space-y-5">
          {groupedChapters.map((group) => (
            <section key={group.volumeId} className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">
                  {group.volumeId === "unassigned" ? "未分卷" : group.volumeId}
                </h3>
                <Badge variant="outline">{group.chapters.length} 章</Badge>
              </div>

              {group.chapters.map((chapter) => {
                const linkedBeat = chapter.beat_id
                  ? beatById.get(chapter.beat_id)
                  : null;
                const sceneCards = getSceneCards(chapter.content_guidance);

                return (
                  <div key={chapter.id} className="rounded-lg border border-workspace-border/70 bg-workspace-paper/80 p-4 shadow-sm dark:bg-workspace-surface-strong">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="text-base font-semibold">{chapter.title}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {linkedBeat && (
                            <Badge variant="outline">节拍：{linkedBeat.title}</Badge>
                          )}
                          <Badge variant="outline">
                            {chapter.target_word_count ?? 0} 字
                          </Badge>
                          <Badge variant="outline">
                            情绪 {chapter.target_emotion > 0 ? "+" : ""}
                            {chapter.target_emotion}
                          </Badge>
                          <Badge variant="outline">{sceneCards.length} 张场景卡</Badge>
                        </div>
                        {chapter.synopsis && (
                          <p className="mt-3 text-sm leading-6 text-muted-foreground">
                            {chapter.synopsis}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateChapterSceneCards(chapter.id, [
                              ...sceneCards,
                              createSceneCard(chapter.title),
                            ])
                          }
                        >
                          添加场景卡
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => saveChapterSceneCards(chapter)}
                          disabled={savingChapterId === chapter.id}
                        >
                          {savingChapterId === chapter.id ? "保存中..." : "保存场景卡"}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {sceneCards.length === 0 ? (
                        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                          暂无场景卡。添加一张后即可填写本章目标、冲突、转折和章末钩子。
                        </div>
                      ) : (
                        sceneCards.map((card, cardIndex) => (
                          <SceneCardEditor
                            key={card.id}
                            card={card}
                            onChange={(nextCard) => {
                              const nextCards = sceneCards.map((item, index) =>
                                index === cardIndex ? nextCard : item,
                              );
                              updateChapterSceneCards(chapter.id, nextCards);
                            }}
                            onDelete={() => {
                              const nextCards = sceneCards.filter(
                                (_item, index) => index !== cardIndex,
                              );
                              updateChapterSceneCards(chapter.id, nextCards);
                            }}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function getSceneCards(
  contentGuidance: Record<string, unknown>,
): SceneExecutionCard[] {
  const sceneCards = contentGuidance.scene_cards;
  if (!Array.isArray(sceneCards)) return [];

  return sceneCards.map((card, index) =>
    normalizeSceneCard(card, `scene-card-${index + 1}`),
  );
}

function normalizeSceneCard(
  value: unknown,
  fallbackId: string,
): SceneExecutionCard {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Partial<Record<keyof SceneExecutionCard, unknown>>)
      : {};

  return {
    id: getString(record.id) || fallbackId,
    title: getString(record.title),
    pov: getString(record.pov),
    location: getString(record.location),
    time: getString(record.time),
    goal: getString(record.goal),
    conflict: getString(record.conflict),
    turn: getString(record.turn),
    outcome: getString(record.outcome),
    openingHook: getString(record.openingHook),
    endingHook: getString(record.endingHook),
    payoff: getString(record.payoff),
    serialPacingNote: getString(record.serialPacingNote),
  };
}

function createSceneCard(title: string): SceneExecutionCard {
  return {
    id: crypto.randomUUID(),
    title,
    pov: "",
    location: "",
    time: "",
    goal: "",
    conflict: "",
    turn: "",
    outcome: "",
    openingHook: "",
    endingHook: "",
    payoff: "",
    serialPacingNote: "",
  };
}

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}
