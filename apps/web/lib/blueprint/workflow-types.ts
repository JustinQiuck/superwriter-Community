export type BlueprintWorkflowStep =
  | "contract"
  | "synopsis"
  | "structure"
  | "outline"
  | "story-assets"
  | "beats"
  | "chapters"
  | "writing"
  | "sync";

export type BlueprintWorkflowMode = "guided" | "planning-light" | "freewrite";

export type StructureTemplate =
  | "three_act"
  | "save_the_cat"
  | "snowflake"
  | "web_serial"
  | "freeform";

export type MiceConflictType = "milieu" | "inquiry" | "character" | "event";

export interface StoryContractInput {
  genre: string;
  tone: string;
  targetReader: string;
  readerPromise: string;
  coreHook: string;
  protagonistSeed: string;
  protagonistWant: string;
  protagonistFlaw: string;
  oppositionForce: string;
  centralConflict: string;
  stakes: string;
  storyQuestion: string;
  endingDirection: string;
  miceType: MiceConflictType;
  constraints: string[];
  comparableWorks: string[];
}

export interface SynopsisCandidate {
  id: string;
  title: string;
  logline: string;
  synopsis: string;
  promise: string;
  protagonistArc: string;
  endingSignal: string;
}

export interface OutlineNode {
  id: string;
  title: string;
  synopsis: string;
  order: number;
  function:
    | "setup"
    | "complication"
    | "turn"
    | "crisis"
    | "climax"
    | "resolution"
    | "custom";
  children: OutlineNode[];
}

export interface StoryAssetNeed {
  id: string;
  type: "character" | "location" | "faction" | "rule";
  name: string;
  reason: string;
  sourceOutlineNodeId?: string;
  status: "suggested" | "accepted" | "created";
}

export interface SceneExecutionCard {
  id: string;
  title: string;
  pov: string;
  location: string;
  time: string;
  goal: string;
  conflict: string;
  turn: string;
  outcome: string;
  openingHook: string;
  endingHook: string;
  payoff: string;
  serialPacingNote: string;
}

export interface ReverseSyncSuggestion {
  id: string;
  target: "synopsis" | "outline" | "beat" | "chapter" | "scene_card";
  targetId?: string;
  reason: string;
  before: string;
  after: string;
  decision: "pending" | "accepted" | "rejected";
}

export interface BlueprintWorkflowState {
  mode: BlueprintWorkflowMode;
  currentStep: BlueprintWorkflowStep;
  completedSteps: BlueprintWorkflowStep[];
  contract: StoryContractInput;
  synopsisCandidates: SynopsisCandidate[];
  acceptedSynopsisId?: string;
  structureTemplate: StructureTemplate;
  outline: OutlineNode[];
  assetNeeds: StoryAssetNeed[];
  reverseSyncEnabled: boolean;
  reverseSyncSuggestions: ReverseSyncSuggestion[];
}
