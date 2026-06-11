"use client";

import { type ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import type { Story, StoryBlueprint } from "@/types/entity";
import { getWorkflowStepsForMode } from "@/lib/blueprint/workflow-navigation";
import type {
  BlueprintWorkflowState,
  BlueprintWorkflowStep,
} from "@/lib/blueprint/workflow-types";
import { WorkflowModeSwitch } from "./workflow-mode-switch";
import { WorkflowStepper } from "./workflow-stepper";

interface BlueprintWorkflowShellProps {
  storyId: string;
  story: Story | null;
  blueprint: StoryBlueprint;
  workflow: BlueprintWorkflowState;
  children: ReactNode;
}

export function BlueprintWorkflowShell({
  storyId,
  story,
  blueprint,
  workflow,
  children,
}: BlueprintWorkflowShellProps) {
  const router = useRouter();
  const [savingStep, setSavingStep] = useState(false);
  const [stepMessage, setStepMessage] = useState<string | null>(null);
  const steps = getWorkflowStepsForMode(workflow.mode);

  const handleStepChange = async (step: BlueprintWorkflowStep) => {
    const unavailableReason = getUnavailableStepReason(workflow, step);
    if (unavailableReason) {
      setStepMessage(unavailableReason);
      return;
    }

    setSavingStep(true);
    setStepMessage(null);
    try {
      const response = await fetch(`/api/stories/${storyId}/blueprint`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            ...blueprint.settings,
            workflow: {
              ...workflow,
              currentStep: step,
            },
          },
        }),
      });
      if (!response.ok) {
        throw new Error("切换蓝图步骤失败");
      }
      router.refresh();
    } catch (error) {
      setStepMessage(error instanceof Error ? error.message : "切换蓝图步骤失败");
    } finally {
      setSavingStep(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-workspace-bg">
      <div className="border-b border-workspace-border/70 bg-workspace-surface-strong px-6 py-3">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-semibold">{blueprint.title}</span>
              {story?.genre && (
                <span className="text-xs text-muted-foreground">{story.genre}</span>
              )}
            </div>
            <WorkflowStepper
              currentStep={workflow.currentStep}
              completedSteps={workflow.completedSteps}
              steps={steps}
              onStepChange={(step) => {
                if (!savingStep) void handleStepChange(step);
              }}
            />
            {stepMessage && (
              <div className="mt-2 rounded-md border border-[var(--module-timeline)]/35 bg-[var(--module-timeline)]/10 px-3 py-2 text-xs leading-5 text-foreground">
                {stepMessage}
              </div>
            )}
          </div>
          <WorkflowModeSwitch
            storyId={storyId}
            blueprint={blueprint}
            workflow={workflow}
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}

function getUnavailableStepReason(
  workflow: BlueprintWorkflowState,
  step: BlueprintWorkflowStep,
) {
  const completed = new Set(workflow.completedSteps);

  if (step === "story-assets" && !completed.has("outline")) {
    return "先完成整体大纲，再进入角色世界。";
  }

  if (step === "beats" && workflow.mode === "guided" && !completed.has("story-assets")) {
    return "先确认角色与世界需求，再进入节拍。";
  }

  if (step === "chapters") {
    if (workflow.mode === "guided" && !completed.has("beats")) {
      return "先确认节拍，再进入章节场景。";
    }
    if (workflow.mode !== "guided" && !completed.has("outline")) {
      return "先完成整体大纲，再进入章节场景。";
    }
  }

  if (step === "writing" && workflow.mode !== "freewrite" && !completed.has("chapters")) {
    return "先生成章节与场景卡，再进入写作。";
  }

  return null;
}
