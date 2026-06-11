"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StoryBlueprint } from "@/types/entity";
import { parseReverseSyncSuggestions } from "@/lib/ai/parse-workflow-json";
import { readTextFromDataStream } from "@/lib/ai/read-data-stream";
import type {
  BlueprintWorkflowState,
  OutlineNode,
  ReverseSyncSuggestion,
} from "@/lib/blueprint/workflow-types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const TARGET_LABELS: Record<ReverseSyncSuggestion["target"], string> = {
  synopsis: "故事简介",
  outline: "整体大纲",
  beat: "节拍",
  chapter: "章节",
  scene_card: "场景卡",
};

interface ReverseSyncPanelProps {
  storyId: string;
  blueprint: StoryBlueprint;
  workflow: BlueprintWorkflowState;
}

export function ReverseSyncPanel({
  storyId,
  blueprint,
  workflow,
}: ReverseSyncPanelProps) {
  const router = useRouter();
  const [draftText, setDraftText] = useState("");
  const [suggestions, setSuggestions] = useState<ReverseSyncSuggestion[]>(
    workflow.reverseSyncSuggestions,
  );
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pendingSuggestions = suggestions.filter(
    (suggestion) => suggestion.decision === "pending",
  );

  const generateSuggestions = async () => {
    if (!draftText.trim()) {
      setError("请先粘贴当前草稿或章节摘要");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "blueprint_reverse_sync",
          storyId,
          workflow,
          prompt: draftText,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("生成反向同步建议失败");
      }

      const fullText = await readTextFromDataStream(response.body);
      const nextSuggestions = parseReverseSyncSuggestions(fullText);

      if (nextSuggestions.length === 0) {
        throw new Error("AI 未发现可同步的蓝图变化");
      }

      setSuggestions(nextSuggestions);
      await persistWorkflow({
        ...workflow,
        reverseSyncSuggestions: nextSuggestions,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成反向同步建议失败");
    } finally {
      setLoading(false);
    }
  };

  const decideSuggestion = async (
    suggestion: ReverseSyncSuggestion,
    decision: "accepted" | "rejected",
  ) => {
    setSavingId(suggestion.id);
    setError(null);

    try {
      const nextSuggestions = suggestions.map((item) =>
        item.id === suggestion.id ? { ...item, decision } : item,
      );
      const nextWorkflow =
        decision === "accepted"
          ? applySuggestionToWorkflow(workflow, suggestion, nextSuggestions)
          : { ...workflow, reverseSyncSuggestions: nextSuggestions };

      setSuggestions(nextSuggestions);
      await persistWorkflow(nextWorkflow);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存同步决定失败");
    } finally {
      setSavingId(null);
    }
  };

  const persistWorkflow = async (nextWorkflow: BlueprintWorkflowState) => {
    const response = await fetch(`/api/stories/${storyId}/blueprint`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        synopsis:
          nextWorkflow !== workflow && blueprint.synopsis
            ? getNextBlueprintSynopsis(blueprint.synopsis, workflow, nextWorkflow)
            : undefined,
        settings: {
          ...blueprint.settings,
          workflow: nextWorkflow,
        },
      }),
    });

    if (!response.ok) {
      throw new Error("保存反向同步失败");
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">草稿反向同步</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            对比草稿与蓝图，只把已确认写出来的变化同步回规划，不改正文。
          </p>
        </div>
        <Button onClick={generateSuggestions} disabled={loading}>
          {loading ? "分析中..." : "分析草稿变化"}
        </Button>
      </div>

      <div className="mb-5 grid gap-2">
        <label className="text-sm font-medium" htmlFor="reverse-sync-draft">
          当前草稿或章节摘要
        </label>
        <Textarea
          id="reverse-sync-draft"
          value={draftText}
          onChange={(event) => setDraftText(event.target.value)}
          placeholder="粘贴刚写完的章节、关键段落，或用几句话概括草稿实际走向。"
          rows={8}
        />
      </div>

      {error && (
        <div className="mb-5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {suggestions.length === 0 ? (
        <div className="rounded-lg border border-workspace-border/70 bg-workspace-paper/72 p-8 text-center text-sm text-muted-foreground dark:bg-workspace-surface">
          暂无反向同步建议。粘贴草稿后分析，或继续写作。
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="rounded-lg border border-workspace-border/70 bg-workspace-paper/80 p-4 shadow-sm dark:bg-workspace-surface-strong">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{TARGET_LABELS[suggestion.target]}</Badge>
                  <Badge variant={suggestion.decision === "pending" ? "secondary" : "outline"}>
                    {suggestion.decision === "pending"
                      ? "待处理"
                      : suggestion.decision === "accepted"
                        ? "已接受"
                        : "已忽略"}
                  </Badge>
                </div>
                {suggestion.decision === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => decideSuggestion(suggestion, "rejected")}
                      disabled={savingId === suggestion.id}
                    >
                      忽略
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => decideSuggestion(suggestion, "accepted")}
                      disabled={savingId === suggestion.id}
                    >
                      接受更新
                    </Button>
                  </div>
                )}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{suggestion.reason}</p>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <div className="rounded-md border border-workspace-border/70 bg-workspace-paper/70 p-3 dark:bg-workspace-muted/60">
                  <p className="text-xs font-medium text-muted-foreground">原蓝图</p>
                  <p className="mt-1 text-sm leading-6">{suggestion.before || "未提供"}</p>
                </div>
                <div className="rounded-md border border-workspace-border/70 bg-workspace-paper/70 p-3 dark:bg-workspace-muted/60">
                  <p className="text-xs font-medium text-muted-foreground">建议同步为</p>
                  <p className="mt-1 text-sm leading-6">{suggestion.after || "未提供"}</p>
                </div>
              </div>
            </div>
          ))}
          {pendingSuggestions.length === 0 && (
            <div className="rounded-lg border border-dashed border-workspace-border/70 bg-workspace-paper/60 p-4 text-sm text-muted-foreground dark:bg-workspace-muted/50">
              所有建议都已处理。正文未被修改，只有蓝图同步状态发生变化。
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function applySuggestionToWorkflow(
  workflow: BlueprintWorkflowState,
  suggestion: ReverseSyncSuggestion,
  nextSuggestions: ReverseSyncSuggestion[],
): BlueprintWorkflowState {
  if (suggestion.target === "outline" && suggestion.targetId) {
    return {
      ...workflow,
      outline: updateOutlineNodeSynopsis(
        workflow.outline,
        suggestion.targetId,
        suggestion.after,
      ),
      reverseSyncSuggestions: nextSuggestions,
    };
  }

  return {
    ...workflow,
    reverseSyncSuggestions: nextSuggestions,
  };
}

function updateOutlineNodeSynopsis(
  nodes: OutlineNode[],
  nodeId: string,
  synopsis: string,
): OutlineNode[] {
  return nodes.map((node) =>
    node.id === nodeId
      ? { ...node, synopsis }
      : {
          ...node,
          children: updateOutlineNodeSynopsis(node.children, nodeId, synopsis),
        },
  );
}

function getNextBlueprintSynopsis(
  currentSynopsis: string | undefined,
  workflow: BlueprintWorkflowState,
  nextWorkflow: BlueprintWorkflowState,
) {
  const acceptedSynopsis = nextWorkflow.reverseSyncSuggestions.find(
    (suggestion) =>
      suggestion.target === "synopsis" && suggestion.decision === "accepted",
  );

  if (!acceptedSynopsis) return currentSynopsis;
  if (
    workflow.reverseSyncSuggestions.some(
      (suggestion) =>
        suggestion.id === acceptedSynopsis.id &&
        suggestion.decision === "accepted",
    )
  ) {
    return currentSynopsis;
  }

  return acceptedSynopsis.after || currentSynopsis;
}
