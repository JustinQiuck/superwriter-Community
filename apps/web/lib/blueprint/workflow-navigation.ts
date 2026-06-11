import type { BlueprintWorkflowMode, BlueprintWorkflowStep } from "./workflow-types";

export function getWorkflowStepsForMode(
  mode: BlueprintWorkflowMode,
): BlueprintWorkflowStep[] {
  if (mode === "planning-light") {
    return ["contract", "synopsis", "outline", "chapters", "writing", "sync"];
  }
  if (mode === "freewrite") {
    return ["contract", "writing", "sync", "outline", "beats", "chapters"];
  }
  return [
    "contract",
    "synopsis",
    "structure",
    "outline",
    "story-assets",
    "beats",
    "chapters",
    "writing",
    "sync",
  ];
}

export function getNextWorkflowStep(
  mode: BlueprintWorkflowMode,
  currentStep: BlueprintWorkflowStep,
): BlueprintWorkflowStep {
  const steps = getWorkflowStepsForMode(mode);
  const index = steps.indexOf(currentStep);
  return steps[Math.min(index + 1, steps.length - 1)] ?? steps[0];
}
