"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StoryBlueprint } from "@/types/entity";
import {
  parseSynopsisCandidates,
  parseWorkflowGenerationIssue,
} from "@/lib/ai/parse-workflow-json";
import { readTextFromDataStream } from "@/lib/ai/read-data-stream";
import { formatAIErrorForToast, normalizeAIError } from "@/lib/ai/ai-errors";
import type {
  BlueprintWorkflowState,
  SynopsisCandidate,
} from "@/lib/blueprint/workflow-types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface SynopsisCandidatePanelProps {
  storyId: string;
  blueprint: StoryBlueprint;
  workflow: BlueprintWorkflowState;
}

function buildSynopsisContinuationPrompt(
  candidate: SynopsisCandidate,
  feedback: string,
) {
  const instruction = feedback.trim() ||
    "请在保持这个候选核心方向的基础上继续扩写、强化冲突和优化读者承诺。";

  return [
    "请基于以下已生成的简介候选继续扩写或调整，不要回到初始空白生成。",
    "",
    "## 调整要求",
    instruction,
    "",
    "## 待调整候选",
    `标题：${candidate.title}`,
    `一句话：${candidate.logline}`,
    `简介：${candidate.synopsis}`,
    `读者承诺：${candidate.promise}`,
    `主角变化：${candidate.protagonistArc}`,
    `结局方向：${candidate.endingSignal}`,
    "",
    "请基于以上候选继续扩写或调整，返回 3 个可选择的 JSON 简介候选。",
  ].join("\n");
}

export function SynopsisCandidatePanel({
  storyId,
  blueprint,
  workflow,
}: SynopsisCandidatePanelProps) {
  const router = useRouter();
  const [candidates, setCandidates] = useState<SynopsisCandidate[]>(
    workflow.synopsisCandidates,
  );
  const [feedback, setFeedback] = useState("");
  const [manualSynopsis, setManualSynopsis] = useState(blueprint.synopsis ?? "");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateCandidates = async (promptOverride?: string) => {
    setLoading(true);
    setError(null);
    const requestWorkflow = {
      ...workflow,
      synopsisCandidates: candidates,
    };
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "synopsis_candidates",
          storyId,
          workflow: requestWorkflow,
          prompt: promptOverride ?? feedback,
        }),
      });

      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => null);
        throw new Error(formatAIErrorForToast(normalizeAIError({
          status: response.status,
          body,
        })));
      }

      const fullText = await readTextFromDataStream(response.body);
      const nextCandidates = parseSynopsisCandidates(fullText);

      if (nextCandidates.length === 0) {
        throw new Error(
          parseWorkflowGenerationIssue(fullText) ?? "AI 未返回可用的简介候选",
        );
      }

      setCandidates(nextCandidates);
      await persistWorkflow({
        ...requestWorkflow,
        synopsisCandidates: nextCandidates,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成简介失败");
    } finally {
      setLoading(false);
    }
  };

  const continueAdjustCandidate = (candidate: SynopsisCandidate) => {
    const prompt = buildSynopsisContinuationPrompt(candidate, feedback);
    setFeedback(feedback.trim() || `继续调整：${candidate.title}`);
    void generateCandidates(prompt);
  };

  const acceptCandidate = async (candidate: SynopsisCandidate) => {
    setSaving(true);
    setError(null);
    try {
      await persistBlueprint({
        synopsis: candidate.synopsis,
        settings: {
          ...blueprint.settings,
          workflow: {
            ...workflow,
            synopsisCandidates: candidates,
            acceptedSynopsisId: candidate.id,
            completedSteps: Array.from(
              new Set([...workflow.completedSteps, "synopsis"]),
            ),
            currentStep: "structure",
          },
        },
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存简介失败");
    } finally {
      setSaving(false);
    }
  };

  const saveManualSynopsis = async () => {
    const synopsis = manualSynopsis.trim();
    if (!synopsis) {
      setError("请先写下一个简短简介，或选择跳过简介。");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await persistBlueprint({
        synopsis,
        settings: {
          ...blueprint.settings,
          workflow: {
            ...workflow,
            completedSteps: Array.from(
              new Set([...workflow.completedSteps, "synopsis"]),
            ),
            currentStep: "structure",
          },
        },
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存简介失败");
    } finally {
      setSaving(false);
    }
  };

  const skipSynopsis = async () => {
    setSaving(true);
    setError(null);
    try {
      await persistBlueprint({
        settings: {
          ...blueprint.settings,
          workflow: {
            ...workflow,
            currentStep: "structure",
          },
        },
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "进入结构模板失败");
    } finally {
      setSaving(false);
    }
  };

  const persistWorkflow = async (nextWorkflow: BlueprintWorkflowState) => {
    await persistBlueprint({
      settings: {
        ...blueprint.settings,
        workflow: nextWorkflow,
      },
    });
    router.refresh();
  };

  const persistBlueprint = async (payload: Record<string, unknown>) => {
    const response = await fetch(`/api/stories/${storyId}/blueprint`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("保存蓝图失败");
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">简介候选</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            基于故事契约生成多个简介方向，确认后再进入结构模板。
          </p>
        </div>
        <Button onClick={() => generateCandidates()} disabled={loading || saving}>
          {loading ? "生成中..." : candidates.length > 0 ? "重新生成" : "生成简介候选"}
        </Button>
      </div>

      <div className="mb-5 grid gap-2">
        <label className="text-sm font-medium" htmlFor="synopsis-feedback">
          调整要求
        </label>
        <Textarea
          id="synopsis-feedback"
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          placeholder="可选：写下想强化的方向，例如更悬疑、更热血、减少感情线。"
          rows={3}
        />
      </div>

      <div className="mb-5 rounded-lg border border-workspace-border/70 bg-workspace-paper/80 p-4 dark:bg-workspace-surface-strong">
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="manual-synopsis">
            手写简介
          </label>
          <Textarea
            id="manual-synopsis"
            value={manualSynopsis}
            onChange={(event) => setManualSynopsis(event.target.value)}
            placeholder="例如：主角发现一个异常事件，追查过程中不断接近真相，也不断付出更高代价。"
            rows={5}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={saveManualSynopsis}
            disabled={loading || saving || manualSynopsis.trim().length === 0}
          >
            保存手写简介
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={skipSynopsis}
            disabled={loading || saving}
          >
            跳过简介，进入结构模板
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {candidates.length === 0 ? (
        <div className="rounded-lg border border-workspace-border/70 bg-workspace-paper/72 p-8 text-center text-sm text-muted-foreground dark:bg-workspace-surface">
          暂无简介候选。你可以生成 AI 候选，也可以直接保存手写简介或先跳过，后续再回来补。
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {candidates.map((candidate) => (
            <div
              key={candidate.id}
              className="flex min-h-[420px] flex-col rounded-lg border border-workspace-border/70 bg-workspace-paper/80 p-4 shadow-sm dark:bg-workspace-surface-strong"
            >
              <div className="text-base font-semibold">{candidate.title}</div>
              <div className="mt-3 rounded-md bg-muted/60 p-3 text-sm">
                {candidate.logline}
              </div>
              <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                <p>{candidate.synopsis}</p>
                <p>
                  <span className="font-medium text-foreground">读者承诺：</span>
                  {candidate.promise}
                </p>
                <p>
                  <span className="font-medium text-foreground">主角变化：</span>
                  {candidate.protagonistArc}
                </p>
                <p>
                  <span className="font-medium text-foreground">结局方向：</span>
                  {candidate.endingSignal}
                </p>
              </div>
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => continueAdjustCandidate(candidate)}
                  disabled={loading || saving}
                >
                  继续调整
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateCandidates()}
                  disabled={loading || saving}
                >
                  重新生成
                </Button>
                <Button
                  size="sm"
                  onClick={() => acceptCandidate(candidate)}
                  disabled={loading || saving}
                >
                  确定为故事简介
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
