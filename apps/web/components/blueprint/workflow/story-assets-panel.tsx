"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { EntityType } from "@superwriter/shared";
import { ENTITY_TYPE_LABELS } from "@superwriter/shared";
import { Database, Pencil, Save, X } from "lucide-react";
import type { StoryBlueprint } from "@/types/entity";
import { parseStoryAssetNeeds } from "@/lib/ai/parse-workflow-json";
import { readTextFromDataStream } from "@/lib/ai/read-data-stream";
import type {
  BlueprintWorkflowState,
  OutlineNode,
  StoryAssetNeed,
} from "@/lib/blueprint/workflow-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const ASSET_GROUPS: Array<{
  type: StoryAssetNeed["type"];
  label: string;
  entityType: EntityType;
}> = [
  { type: "character", label: "角色", entityType: "character" },
  { type: "location", label: "地点", entityType: "location" },
  { type: "faction", label: "阵营", entityType: "faction" },
  { type: "rule", label: "规则/设定", entityType: "magic_system" },
];

const STATUS_LABELS: Record<StoryAssetNeed["status"], string> = {
  suggested: "建议",
  accepted: "已接受",
  created: "已创建",
};

interface StoryAssetsPanelProps {
  storyId: string;
  blueprint: StoryBlueprint;
  workflow: BlueprintWorkflowState;
}

export function StoryAssetsPanel({
  storyId,
  blueprint,
  workflow,
}: StoryAssetsPanelProps) {
  const router = useRouter();
  const [assetNeeds, setAssetNeeds] = useState<StoryAssetNeed[]>(
    workflow.assetNeeds,
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingNeedId, setEditingNeedId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingReason, setEditingReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const outlineTitleById = useMemo(() => {
    const pairs: Array<[string, string]> = flattenOutlineNodes(workflow.outline).map(
      (node) => [node.id, node.title],
    );
    return new Map<string, string>(pairs);
  }, [workflow.outline]);

  const acceptedSynopsis = useMemo(() => {
    const accepted = workflow.synopsisCandidates.find(
      (candidate) => candidate.id === workflow.acceptedSynopsisId,
    );

    return accepted?.synopsis || blueprint.synopsis || "";
  }, [blueprint.synopsis, workflow.acceptedSynopsisId, workflow.synopsisCandidates]);

  const unsyncedNeeds = assetNeeds.filter((need) => need.status !== "created");

  const generateAssetNeeds = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "story_asset_needs",
          storyId,
          workflow,
          synopsis: acceptedSynopsis,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("生成素材需求失败");
      }

      const fullText = await readTextFromDataStream(response.body);
      const nextNeeds = parseStoryAssetNeeds(fullText);

      if (nextNeeds.length === 0) {
        throw new Error("AI 未返回可用的素材需求");
      }

      setAssetNeeds(nextNeeds);
      await persistWorkflow({
        ...workflow,
        assetNeeds: nextNeeds,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成素材需求失败");
    } finally {
      setLoading(false);
    }
  };

  const markAccepted = async (needId: string) => {
    const nextNeeds = assetNeeds.map((need) =>
      need.id === needId && need.status === "suggested"
        ? { ...need, status: "accepted" as const }
        : need,
    );

    setAssetNeeds(nextNeeds);
    await persistWorkflow({
      ...workflow,
      assetNeeds: nextNeeds,
    });
  };

  const startEditing = (need: StoryAssetNeed) => {
    setEditingNeedId(need.id);
    setEditingName(need.name);
    setEditingReason(need.reason);
    setError(null);
  };

  const cancelEditing = () => {
    setEditingNeedId(null);
    setEditingName("");
    setEditingReason("");
  };

  const saveEditedNeed = async (needId: string) => {
    const nextName = editingName.trim();
    const nextReason = editingReason.trim();

    if (!nextName || !nextReason) {
      setError("素材名称和说明不能为空");
      return;
    }

    const nextNeeds = assetNeeds.map((need) =>
      need.id === needId
        ? { ...need, name: nextName, reason: nextReason }
        : need,
    );

    setSaving(true);
    setError(null);
    try {
      await persistWorkflow({
        ...workflow,
        assetNeeds: nextNeeds,
      });
      setAssetNeeds(nextNeeds);
      cancelEditing();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存素材需求失败");
    } finally {
      setSaving(false);
    }
  };

  const syncNeedToEntity = async (needId: string) => {
    await syncNeedsToEntities([needId]);
  };

  const syncAllNeedsToEntities = async () => {
    await syncNeedsToEntities(unsyncedNeeds.map((need) => need.id));
  };

  const syncNeedsToEntities = async (needIds: string[]) => {
    const needsToSync = assetNeeds.filter(
      (need) => needIds.includes(need.id) && need.status !== "created",
    );

    if (needsToSync.length === 0) return;

    setSaving(true);
    setError(null);
    try {
      await Promise.all(
        needsToSync.map((need) =>
          createEntityFromNeed(storyId, getEntityTypeForAssetNeed(need), need),
        ),
      );

      const syncedIds = new Set(needsToSync.map((need) => need.id));
      const nextNeeds = assetNeeds.map((need) =>
        syncedIds.has(need.id)
          ? { ...need, status: "created" as const }
          : need,
      );

      await persistWorkflow({
        ...workflow,
        assetNeeds: nextNeeds,
      });
      setAssetNeeds(nextNeeds);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "同步到世界库失败");
    } finally {
      setSaving(false);
    }
  };

  const continueToBeats = async () => {
    setSaving(true);
    setError(null);
    try {
      await persistWorkflow({
        ...workflow,
        assetNeeds,
        completedSteps: Array.from(
          new Set([...workflow.completedSteps, "story-assets"]),
        ),
        currentStep: "beats",
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存素材需求失败");
    } finally {
      setSaving(false);
    }
  };

  const persistWorkflow = async (nextWorkflow: BlueprintWorkflowState) => {
    const response = await fetch(`/api/stories/${storyId}/blueprint`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        settings: {
          ...blueprint.settings,
          workflow: nextWorkflow,
        },
      }),
    });

    if (!response.ok) {
      throw new Error("保存素材需求失败");
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">角色与世界需求</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            从整体大纲反推必要的角色、地点、阵营和规则。素材可以稍后再补全，不阻塞进入节拍。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={generateAssetNeeds} disabled={loading || saving}>
            {loading ? "生成中..." : assetNeeds.length > 0 ? "重新生成需求" : "AI 生成素材需求"}
          </Button>
          {assetNeeds.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={syncAllNeedsToEntities}
              disabled={loading || saving || unsyncedNeeds.length === 0}
            >
              <Database className="h-4 w-4" />
              {unsyncedNeeds.length === 0
                ? "已同步到世界库"
                : `同步到世界库（${unsyncedNeeds.length}）`}
            </Button>
          ) : null}
          <Button onClick={continueToBeats} disabled={loading || saving}>
            {saving ? "保存中..." : "确认素材需求，进入节拍编排"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {assetNeeds.length === 0 ? (
        <div className="rounded-lg border border-workspace-border/70 bg-workspace-paper/72 p-8 text-center text-sm text-muted-foreground dark:bg-workspace-surface">
          暂无素材需求。你可以直接进入节拍编排，也可以先让 AI 根据整体大纲生成建议清单。
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {ASSET_GROUPS.map((group) => {
            const needs = assetNeeds.filter((need) => need.type === group.type);

            return (
              <section key={group.type} className="rounded-lg border border-workspace-border/70 bg-workspace-paper/72 p-4 dark:bg-workspace-surface">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">{group.label}</h3>
                  <Badge variant="outline">{needs.length}</Badge>
                </div>

                {needs.length === 0 ? (
                  <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    暂无{group.label}需求
                  </div>
                ) : (
                  <div className="space-y-3">
                    {needs.map((need) => {
                      const sourceTitle = need.sourceOutlineNodeId
                        ? outlineTitleById.get(need.sourceOutlineNodeId)
                        : null;
                      const isEditing = editingNeedId === need.id;

                      return (
                        <div key={need.id} className="rounded-md border border-workspace-border/70 bg-workspace-paper/80 p-3 dark:bg-workspace-surface-strong">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="font-medium">
                                {isEditing ? editingName || need.name : need.name}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {sourceTitle ? `来源：${sourceTitle}` : "来源：整体大纲"}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{STATUS_LABELS[need.status]}</Badge>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                onClick={() => startEditing(need)}
                                disabled={loading || saving || isEditing || need.status === "created"}
                                aria-label={`编辑${need.name}`}
                                title={need.status === "created" ? "已入库后请在世界库编辑" : "编辑"}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {isEditing ? (
                            <div className="mt-3 grid gap-3">
                              <div className="grid gap-2">
                                <Label htmlFor={`${need.id}-asset-name`}>名称</Label>
                                <Input
                                  id={`${need.id}-asset-name`}
                                  aria-label="素材名称"
                                  value={editingName}
                                  onChange={(event) =>
                                    setEditingName(event.target.value)
                                  }
                                  disabled={saving}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor={`${need.id}-asset-reason`}>说明</Label>
                                <Textarea
                                  id={`${need.id}-asset-reason`}
                                  aria-label="素材说明"
                                  value={editingReason}
                                  onChange={(event) =>
                                    setEditingReason(event.target.value)
                                  }
                                  rows={3}
                                  disabled={saving}
                                />
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => saveEditedNeed(need.id)}
                                  disabled={saving}
                                >
                                  <Save className="h-4 w-4" />
                                  保存编辑
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={cancelEditing}
                                  disabled={saving}
                                >
                                  <X className="h-4 w-4" />
                                  取消
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                {need.reason}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => markAccepted(need.id)}
                                  disabled={need.status !== "suggested" || loading || saving}
                                >
                                  接受
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => syncNeedToEntity(need.id)}
                                  disabled={loading || saving || need.status === "created"}
                                  aria-label={`创建${need.name}到世界库`}
                                >
                                  <Database className="h-4 w-4" />
                                  {need.status === "created"
                                    ? "已入库"
                                    : `创建到${ENTITY_TYPE_LABELS[group.entityType]}`}
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function flattenOutlineNodes(nodes: OutlineNode[]): OutlineNode[] {
  return nodes.flatMap((node) => [node, ...flattenOutlineNodes(node.children)]);
}

function getEntityTypeForAssetNeed(need: StoryAssetNeed): EntityType {
  return (
    ASSET_GROUPS.find((group) => group.type === need.type)?.entityType ??
    "character"
  );
}

async function createEntityFromNeed(
  storyId: string,
  type: EntityType,
  need: StoryAssetNeed,
) {
  const response = await fetch(`/api/stories/${storyId}/entities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type,
      name: need.name,
      data: {
        description: need.reason,
        blueprintAssetNeedId: need.id,
        blueprintAssetType: need.type,
      },
      tags: ["蓝图素材"],
    }),
  });

  if (!response.ok) {
    throw new Error(`创建${ENTITY_TYPE_LABELS[type]}「${need.name}」失败`);
  }
}
