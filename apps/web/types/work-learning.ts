import type {
  TechniqueCard,
  WorkLearningApplicationIntent,
  WorkLearningSkillId,
} from "@/lib/work-learning/types";

export interface TechniqueCardRecord {
  id: string;
  userId: string;
  skillId: WorkLearningSkillId;
  title: string;
  sourceTitle?: string | null;
  sourceHash: string;
  sourceLength: number;
  targetStoryId?: string | null;
  card: TechniqueCard;
  applicationIntents: WorkLearningApplicationIntent[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
