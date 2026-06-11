"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { StoryBlueprint } from "@/types/entity";
import { parseOutlineNodes } from "@/lib/ai/parse-workflow-json";
import { readTextFromDataStream } from "@/lib/ai/read-data-stream";
import type {
  BlueprintWorkflowState,
  OutlineNode,
  StructureTemplate,
} from "@/lib/blueprint/workflow-types";
import {
  createOutlineNode,
  flattenOutlineLeaves,
  moveOutlineSibling,
  normalizeOutlineOrder,
} from "@/lib/blueprint/outline-utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { OutlineNodeEditor } from "./outline-node-editor";

const STRUCTURE_TEMPLATE_LABELS: Record<StructureTemplate, string> = {
  three_act: "三幕式",
  save_the_cat: "Save the Cat",
  snowflake: "雪花法",
  web_serial: "网文连载",
  freeform: "自由模式",
};

interface OutlineOverviewPanelProps {
  storyId: string;
  blueprint: StoryBlueprint;
  workflow: BlueprintWorkflowState;
}

export function OutlineOverviewPanel({
  storyId,
  blueprint,
  workflow,
}: OutlineOverviewPanelProps) {
  const router = useRouter();
  const [outline, setOutline] = useState<OutlineNode[]>(workflow.outline);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptedSynopsis = useMemo(() => {
    const accepted = workflow.synopsisCandidates.find(
      (candidate) => candidate.id === workflow.acceptedSynopsisId,
    );

    return accepted?.synopsis || blueprint.synopsis || "";
  }, [blueprint.synopsis, workflow.acceptedSynopsisId, workflow.synopsisCandidates]);

  const outlineLeaves = flattenOutlineLeaves(outline);
  const leafCount = outlineLeaves.length;
  const outlineQualityNotes = getOutlineQualityNotes(outlineLeaves);

  const generateOutline = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "story_outline_generate",
          storyId,
          workflow,
          synopsis: acceptedSynopsis,
          structureTemplate: workflow.structureTemplate,
          prompt: feedback,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("生成整体大纲失败");
      }

      const fullText = await readTextFromDataStream(response.body);
      const generatedOutline = normalizeOutlineOrder(parseOutlineNodes(fullText));

      if (generatedOutline.length === 0) {
        throw new Error("AI 未返回可用的大纲节点");
      }

      setOutline(generatedOutline);
      await persistOutline(generatedOutline, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成整体大纲失败");
    } finally {
      setLoading(false);
    }
  };

  const persistOutline = async (nextOutline: OutlineNode[], complete: boolean) => {
    const normalizedOutline = normalizeOutlineOrder(nextOutline);
    const nextWorkflow: BlueprintWorkflowState = {
      ...workflow,
      outline: normalizedOutline,
      ...(complete
        ? {
            completedSteps: Array.from(
              new Set([...workflow.completedSteps, "outline"]),
            ),
            currentStep: "story-assets",
          }
        : {}),
    };

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
      throw new Error("保存整体大纲失败");
    }
  };

  const addTopLevelNode = () => {
    const node = {
      ...createOutlineNode(outline.length === 0 ? "第一部分" : "新的大纲节点"),
      order: outline.length,
    };
    setOutline((current) => normalizeOutlineOrder([...current, node]));
  };

  const updateTopLevelNode = (nodeId: string, nextNode: OutlineNode) => {
    setOutline((current) =>
      normalizeOutlineOrder(
        current.map((node) => (node.id === nodeId ? nextNode : node)),
      ),
    );
  };

  const deleteTopLevelNode = (nodeId: string) => {
    setOutline((current) =>
      normalizeOutlineOrder(current.filter((node) => node.id !== nodeId)),
    );
  };

  const moveTopLevelNode = (index: number, direction: "up" | "down") => {
    setOutline((current) => moveOutlineSibling(current, index, direction));
  };

  const saveAndContinue = async () => {
    setSaving(true);
    setError(null);
    try {
      await persistOutline(outline, true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存整体大纲失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">整体大纲</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline">
              {STRUCTURE_TEMPLATE_LABELS[workflow.structureTemplate]}
            </Badge>
            <Badge variant="outline">{outline.length} 个主节点</Badge>
            <Badge variant="outline">{leafCount} 个末级节点</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={addTopLevelNode} disabled={loading || saving}>
            添加主节点
          </Button>
          <Button variant="outline" onClick={generateOutline} disabled={loading || saving}>
            {loading ? "生成中..." : outline.length > 0 ? "重新生成" : "AI 生成大纲"}
          </Button>
          <Button onClick={saveAndContinue} disabled={loading || saving}>
            {saving ? "保存中..." : "确认大纲，进入角色与世界"}
          </Button>
        </div>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-workspace-border/70 bg-workspace-paper/72 p-4 dark:bg-workspace-surface">
          <div className="text-sm font-medium">已确认简介</div>
          <p className="mt-2 max-h-44 overflow-auto text-sm leading-6 text-muted-foreground">
            {acceptedSynopsis || "尚未确认简介。可以手动添加大纲节点，但建议先完成简介步骤。"}
          </p>
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="outline-feedback">
            生成要求
          </label>
          <Textarea
            id="outline-feedback"
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="可选：例如更偏群像、加强前三章钩子、分成四卷。"
            rows={6}
          />
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {outlineQualityNotes.length > 0 && (
        <div className="mb-5 rounded-lg border border-[var(--module-timeline)]/35 bg-[var(--module-timeline)]/10 px-4 py-3 text-sm leading-6 text-foreground">
          {outlineQualityNotes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      )}

      {outline.length === 0 ? (
        <div className="rounded-lg border border-workspace-border/70 bg-workspace-paper/72 p-8 text-center text-sm text-muted-foreground dark:bg-workspace-surface">
          暂无整体大纲。你可以添加主节点手动规划，也可以让 AI 根据简介和结构模板生成草稿。
        </div>
      ) : (
        <div className="space-y-4">
          {outline.map((node, index) => (
            <OutlineNodeEditor
              key={node.id}
              node={node}
              depth={0}
              index={index}
              siblingCount={outline.length}
              onChange={(nextNode) => updateTopLevelNode(node.id, nextNode)}
              onDelete={() => deleteTopLevelNode(node.id)}
              onMoveUp={() => moveTopLevelNode(index, "up")}
              onMoveDown={() => moveTopLevelNode(index, "down")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function getOutlineQualityNotes(outlineLeaves: OutlineNode[]) {
  const notes: string[] = [];

  if (outlineLeaves.length === 1) {
    notes.push("当前只有 1 个末级节点，后续可能只会生成 1 个节拍。");
  }

  const hasCoarseLeaf = outlineLeaves.some((node) => {
    const text = `${node.title} ${node.synopsis}`.trim();
    return text.length > 0 && text.length < 80;
  });

  if (hasCoarseLeaf) {
    notes.push("建议补足事件、冲突、转折、结果和读者期待。");
  }

  return notes;
}
