export type WorkLearningSkillId =
  | "chapter_hook"
  | "conflict_escalation"
  | "satisfaction_pacing"
  | "character_desire_chain"
  | "reversal_information_gap"
  | "emotional_pull"
  | "reverse_outline"
  | "functional_story_dna";

export type WorkLearningApplicationIntent =
  | "blueprint"
  | "chapter"
  | "character"
  | "practice";

export interface WorkLearningSkill {
  id: WorkLearningSkillId;
  label: string;
  description: string;
  recommendedInput: string;
  applicationIntents: WorkLearningApplicationIntent[];
  analysisFocus: string[];
  promptGuidance: string;
}

export interface TechniqueCard {
  id: string;
  skillId: WorkLearningSkillId;
  title: string;
  sourceManifestation: string;
  abstractRule: string;
  whyItWorks: string;
  suitableUses: string[];
  migrationSuggestion: string;
  practiceTask: string;
  applicationIntents: WorkLearningApplicationIntent[];
  cautions: string[];
  sourceAnchors: string[];
}

export interface WorkLearningAnalysisRequest {
  text: string;
  skillId: WorkLearningSkillId;
  sourceTitle?: string;
  targetStoryId?: string;
}

export interface WorkLearningAnalysisResult {
  cards: TechniqueCard[];
  summary: string;
  sourceHash: string;
  sourceLength: number;
}

export type WorkLearningApplyTarget =
  | {
      type: "blueprint";
      storyId: string;
    }
  | {
      type: "chapter";
      storyId: string;
      chapterId: string;
    };

export interface WorkLearningApplyRequest {
  card: TechniqueCard;
  target: WorkLearningApplyTarget;
}

export interface WorkLearningApplyResult {
  title: string;
  guidance: string;
  tasks: string[];
  cautions: string[];
}
