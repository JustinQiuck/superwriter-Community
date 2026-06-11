"use client";

import type { BlueprintWorkflowStep } from "@/lib/blueprint/workflow-types";
import { cn } from "@/lib/utils";

export const WORKFLOW_STEPS = [
  { value: "contract", label: "故事契约" },
  { value: "synopsis", label: "简介候选" },
  { value: "structure", label: "结构模板" },
  { value: "outline", label: "整体大纲" },
  { value: "story-assets", label: "角色世界" },
  { value: "beats", label: "节拍" },
  { value: "chapters", label: "章节场景" },
  { value: "writing", label: "写作" },
  { value: "sync", label: "反向同步" },
] as const;

const WORKFLOW_STEP_LABELS = new Map(
  WORKFLOW_STEPS.map((step) => [step.value, step.label]),
);

interface WorkflowStepperProps {
  currentStep: BlueprintWorkflowStep;
  completedSteps: BlueprintWorkflowStep[];
  steps: BlueprintWorkflowStep[];
  onStepChange: (step: BlueprintWorkflowStep) => void;
}

export function WorkflowStepper({
  currentStep,
  completedSteps,
  steps,
  onStepChange,
}: WorkflowStepperProps) {
  return (
    <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
      {steps.map((step) => {
        const active = step === currentStep;
        const complete = completedSteps.includes(step);

        return (
          <button
            key={step}
            type="button"
            onClick={() => onStepChange(step)}
            className={cn(
              "flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-medium transition",
              active
                ? "border-[var(--module-blueprint)]/45 bg-[var(--module-blueprint)]/12 text-foreground"
                : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                active
                  ? "bg-[var(--module-blueprint)]"
                  : complete
                    ? "bg-emerald-500"
                    : "bg-muted-foreground/30",
              )}
            />
            {WORKFLOW_STEP_LABELS.get(step) ?? step}
          </button>
        );
      })}
    </div>
  );
}
