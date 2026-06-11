import type { StoryBlueprint } from "@/types/entity";
import type { BlueprintWorkflowState } from "./workflow-types";

export const defaultStoryContract = {
  genre: "",
  tone: "",
  targetReader: "",
  readerPromise: "",
  coreHook: "",
  protagonistSeed: "",
  protagonistWant: "",
  protagonistFlaw: "",
  oppositionForce: "",
  centralConflict: "",
  stakes: "",
  storyQuestion: "",
  endingDirection: "",
  miceType: "event" as const,
  constraints: [],
  comparableWorks: [],
};

export const defaultBlueprintWorkflowState: BlueprintWorkflowState = {
  mode: "guided",
  currentStep: "contract",
  completedSteps: [],
  contract: defaultStoryContract,
  synopsisCandidates: [],
  structureTemplate: "three_act",
  outline: [],
  assetNeeds: [],
  reverseSyncEnabled: true,
  reverseSyncSuggestions: [],
};

export function getBlueprintWorkflowState(
  blueprint: StoryBlueprint | null,
): BlueprintWorkflowState {
  const workflow = blueprint?.settings?.workflow;

  if (!workflow || typeof workflow !== "object") {
    return defaultBlueprintWorkflowState;
  }

  const partial = workflow as Partial<BlueprintWorkflowState>;

  return {
    ...defaultBlueprintWorkflowState,
    ...partial,
    contract: {
      ...defaultStoryContract,
      ...(partial.contract ?? {}),
    },
    completedSteps: partial.completedSteps ?? [],
    synopsisCandidates: partial.synopsisCandidates ?? [],
    outline: partial.outline ?? [],
    assetNeeds: partial.assetNeeds ?? [],
    reverseSyncSuggestions: partial.reverseSyncSuggestions ?? [],
  };
}
