import { z } from "zod";

export const workLearningApplicationIntentSchema = z.enum([
  "blueprint",
  "chapter",
  "character",
  "practice",
]);

export const workLearningSkillIdSchema = z.enum([
  "chapter_hook",
  "conflict_escalation",
  "satisfaction_pacing",
  "character_desire_chain",
  "reversal_information_gap",
  "emotional_pull",
  "reverse_outline",
  "functional_story_dna",
]);

export const techniqueCardSchema = z.object({
  id: z.string().min(1),
  skillId: workLearningSkillIdSchema,
  title: z.string().trim().min(1).max(120),
  sourceManifestation: z.string().trim().min(1).max(800),
  abstractRule: z.string().trim().min(1).max(800),
  whyItWorks: z.string().trim().min(1).max(800),
  suitableUses: z.array(z.string().trim().min(1).max(120)).max(8),
  migrationSuggestion: z.string().trim().min(1).max(1000),
  practiceTask: z.string().trim().min(1).max(800),
  applicationIntents: z.array(workLearningApplicationIntentSchema).min(1).max(4),
  cautions: z.array(z.string().trim().min(1).max(200)).max(6),
  sourceAnchors: z.array(z.string().trim().min(1).max(120)).max(8),
});

export const saveTechniqueCardsSchema = z.object({
  cards: z.array(techniqueCardSchema).min(1).max(20),
  sourceTitle: z.string().trim().max(200).optional(),
  sourceHash: z.string().trim().min(8).max(128),
  sourceLength: z.number().int().min(0).max(200_000),
  targetStoryId: z.string().uuid().optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(12).optional(),
});
