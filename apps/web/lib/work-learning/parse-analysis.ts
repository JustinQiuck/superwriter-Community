import { AIJsonParseError, parseFirstJsonArray, parseFirstJsonObject } from "@/lib/ai/parse-ai-json";
import {
  getWorkLearningSkill,
  isWorkLearningSkillId,
} from "./skill-registry";
import type {
  TechniqueCard,
  WorkLearningApplicationIntent,
  WorkLearningApplyResult,
  WorkLearningSkillId,
} from "./types";

const APPLICATION_INTENTS = new Set<WorkLearningApplicationIntent>([
  "blueprint",
  "chapter",
  "character",
  "practice",
]);

export function parseTechniqueCards(
  text: string,
  fallbackSkillId: WorkLearningSkillId,
): { summary: string; cards: TechniqueCard[] } {
  const root = parseAnalysisRoot(text);
  const rawCards = Array.isArray(root.cards) ? root.cards : [];
  if (rawCards.length === 0) {
    throw new AIJsonParseError("AI 未返回技法卡");
  }

  const cards = rawCards.map((item, index) => normalizeTechniqueCard(item, index, fallbackSkillId));
  return {
    summary: getString(root.summary) ?? "已完成作品学习拆解。",
    cards,
  };
}

export function parseWorkLearningApplyResult(text: string): WorkLearningApplyResult {
  const root = parseFirstJsonObject(text);
  const title = getString(root.title);
  const guidance = getString(root.guidance);

  if (!title || !guidance) {
    throw new AIJsonParseError("AI 未返回可用的应用建议");
  }

  return {
    title,
    guidance,
    tasks: normalizeStringArray(root.tasks),
    cautions: normalizeStringArray(root.cautions),
  };
}

function parseAnalysisRoot(text: string): Record<string, unknown> & { cards?: unknown[] } {
  try {
    const root = parseFirstJsonObject(text) as Record<string, unknown> & { cards?: unknown[] };
    if (Array.isArray(root.cards)) return root;
  } catch {
    // Fall through to top-level array parsing below.
  }

  const cards = parseFirstJsonArray(text);
  return { summary: "已完成作品学习拆解。", cards };
}

function normalizeTechniqueCard(
  value: unknown,
  index: number,
  fallbackSkillId: WorkLearningSkillId,
): TechniqueCard {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AIJsonParseError(`第 ${index + 1} 张技法卡格式无效`);
  }

  const record = value as Record<string, unknown>;
  const title = getString(record.title);
  const sourceManifestation = getString(record.sourceManifestation);
  const abstractRule = getString(record.abstractRule);
  const whyItWorks = getString(record.whyItWorks);
  const migrationSuggestion = getString(record.migrationSuggestion);
  const practiceTask = getString(record.practiceTask);

  if (!title || !sourceManifestation || !abstractRule || !whyItWorks || !migrationSuggestion || !practiceTask) {
    throw new AIJsonParseError(`第 ${index + 1} 张技法卡缺少必填字段`);
  }

  const skillId = normalizeSkillId(record.skillId, fallbackSkillId);
  const skill = getWorkLearningSkill(skillId);
  const applicationIntents = normalizeApplicationIntents(record.applicationIntents, skill?.applicationIntents ?? []);

  return {
    id: getString(record.id) ?? `${skillId}-${index + 1}`,
    skillId,
    title,
    sourceManifestation,
    abstractRule,
    whyItWorks,
    suitableUses: normalizeStringArray(record.suitableUses),
    migrationSuggestion,
    practiceTask,
    applicationIntents,
    cautions: normalizeStringArray(record.cautions),
    sourceAnchors: normalizeStringArray(record.sourceAnchors).map((anchor) => anchor.slice(0, 80)),
  };
}

function normalizeSkillId(value: unknown, fallback: WorkLearningSkillId): WorkLearningSkillId {
  return typeof value === "string" && isWorkLearningSkillId(value) ? value : fallback;
}

function normalizeApplicationIntents(
  value: unknown,
  fallback: WorkLearningApplicationIntent[],
): WorkLearningApplicationIntent[] {
  const raw = Array.isArray(value) ? value : [];
  const intents = raw.filter(
    (item): item is WorkLearningApplicationIntent =>
      typeof item === "string" && APPLICATION_INTENTS.has(item as WorkLearningApplicationIntent),
  );
  const unique = Array.from(new Set(intents));
  return unique.length > 0 ? unique : fallback;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
