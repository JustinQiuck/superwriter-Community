import type { DeviationSeverity, DeviationType } from "@/types/deviation";
import type { SceneExecutionCard } from "@/lib/blueprint/workflow-types";

export interface BriefChapterInput {
  id: string;
  name: string;
  sortOrder?: number | null;
  summary?: string | null;
  mustInclude?: string | string[] | null;
  keyInformation?: string | string[] | null;
  wordCount?: number | null;
  targetWordCount?: number | null;
}

export interface BriefBeatInput {
  id: string;
  title: string;
  description?: string | null;
  synopsis?: string | null;
  emotionTarget?: number | null;
  content?: Record<string, unknown> | null;
}

export interface BriefDeviationInput {
  id: string;
  type: DeviationType;
  severity: DeviationSeverity;
  blueprintValue: string;
  actualValue: string;
  suggestion?: string | null;
}

export interface WritingBriefRisk {
  id: string;
  type: DeviationType;
  label: string;
  severity: DeviationSeverity;
  message: string;
  suggestion?: string | null;
}

export interface WritingBrief {
  chapterId: string;
  chapterName: string;
  beatId: string | null;
  beatTitle: string | null;
  nextBeatTitle: string | null;
  emotionalTarget: number | null;
  targetWordCount: number | null;
  primaryGoal: string;
  mustInclude: string[];
  risks: WritingBriefRisk[];
  currentSceneCard: SceneExecutionCard | null;
  previousChapter: {
    id: string;
    name: string;
    summary: string | null;
  } | null;
}

export const FALLBACK_PRIMARY_GOAL = "继续推进当前章节。";

export const DEVIATION_TYPE_LABELS: Record<DeviationType, string> = {
  emotion: "情绪目标偏离",
  character_absence: "角色缺席风险",
  pacing: "节奏风险",
  setting_contradiction: "设定矛盾",
};

export function buildWritingBriefFromParts(input: {
  chapter: BriefChapterInput;
  beat?: BriefBeatInput | null;
  nextBeat?: BriefBeatInput | null;
  previousChapter?: BriefChapterInput | null;
  currentSceneCard?: SceneExecutionCard | null;
  deviations?: BriefDeviationInput[];
}): WritingBrief {
  const beat = input.beat ?? null;
  const nextBeat = input.nextBeat ?? null;
  const previousChapter = input.previousChapter ?? null;

  return {
    chapterId: input.chapter.id,
    chapterName: input.chapter.name,
    beatId: beat?.id ?? null,
    beatTitle: beat?.title ?? null,
    nextBeatTitle: normalizeText(nextBeat?.title) ?? null,
    emotionalTarget: beat?.emotionTarget ?? null,
    targetWordCount: input.chapter.targetWordCount ?? null,
    primaryGoal:
      firstNonEmpty(beat?.description, input.chapter.summary) ?? FALLBACK_PRIMARY_GOAL,
    mustInclude: buildMustInclude(input.chapter, beat, previousChapter),
    risks: (input.deviations ?? []).map(formatRisk),
    currentSceneCard: input.currentSceneCard ?? null,
    previousChapter: previousChapter
      ? {
          id: previousChapter.id,
          name: previousChapter.name,
          summary: normalizeText(previousChapter.summary) ?? null,
        }
      : null,
  };
}

export function formatWritingBriefForPrompt(brief: WritingBrief): string {
  const lines = [
    "## 当前章节写作目标",
    `章节：${brief.chapterName}`,
    `目标：${brief.primaryGoal}`,
    `蓝图节拍：${brief.beatTitle ?? "暂无匹配节拍"}`,
  ];

  if (brief.emotionalTarget !== null) {
    lines.push(`情绪目标：${brief.emotionalTarget}`);
  }

  if (brief.targetWordCount !== null) {
    lines.push(`目标字数：${brief.targetWordCount}`);
  }

  if (brief.previousChapter?.summary) {
    lines.push(`上一章承接：${brief.previousChapter.summary}`);
  }

  if (brief.currentSceneCard) {
    lines.push(
      "",
      "## 当前场景执行卡",
      `本场目标：${brief.currentSceneCard.goal || "未填写"}`,
      `冲突：${brief.currentSceneCard.conflict || "未填写"}`,
      `转折：${brief.currentSceneCard.turn || "未填写"}`,
      `章末钩子：${brief.currentSceneCard.endingHook || "未填写"}`,
    );
  }

  lines.push(
    "",
    "必须包含：",
    ...formatList(brief.mustInclude, "暂无明确必写项，保持章节自然推进。"),
    "",
    "风险提醒：",
    ...formatList(
      brief.risks.map((risk) => `${risk.label}（${risk.severity}）：${risk.message}`),
      "暂无待处理偏差。",
    ),
  );

  return lines.join("\n");
}

function buildMustInclude(
  chapter: BriefChapterInput,
  beat: BriefBeatInput | null,
  previousChapter: BriefChapterInput | null,
): string[] {
  const items = new Set<string>();

  if (previousChapter?.summary) {
    items.add(`承接上一章「${previousChapter.name}」：${previousChapter.summary}`);
  }

  const chapterSummary = normalizeText(chapter.summary);
  if (chapterSummary) {
    items.add(`章节摘要：${chapterSummary}`);
  }

  const synopsis = normalizeText(beat?.synopsis);
  if (synopsis) {
    items.add(`节拍摘要：${synopsis}`);
  }

  for (const value of valuesFromUnknown(chapter.mustInclude)) {
    items.add(value);
  }

  for (const value of valuesFromUnknown(chapter.keyInformation)) {
    items.add(value);
  }

  const guidance = beat?.content ?? {};
  for (const key of [
    "must_include",
    "mustInclude",
    "required_elements",
    "requiredElements",
    "key_points",
    "keyPoints",
    "scene_requirements",
    "sceneRequirements",
  ]) {
    for (const value of valuesFromUnknown(guidance[key])) {
      items.add(value);
    }
  }

  return [...items];
}

function formatRisk(deviation: BriefDeviationInput): WritingBriefRisk {
  const label = DEVIATION_TYPE_LABELS[deviation.type];
  const messageParts = [
    deviation.blueprintValue ? `蓝图：${deviation.blueprintValue}` : "",
    deviation.actualValue ? `当前：${deviation.actualValue}` : "",
  ].filter(Boolean);

  return {
    id: deviation.id,
    type: deviation.type,
    label,
    severity: deviation.severity,
    message: messageParts.join("；") || "请检查该偏差。",
    suggestion: normalizeText(deviation.suggestion) ?? null,
  };
}

function formatList(items: string[], fallback: string): string[] {
  if (items.length === 0) return [`- ${fallback}`];
  return items.map((item) => `- ${item}`);
}

function valuesFromUnknown(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(valuesFromUnknown);
  }

  const normalized = normalizeText(value);
  return normalized ? [normalized] : [];
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | undefined {
  for (const value of values) {
    const normalized = normalizeText(value);
    if (normalized) return normalized;
  }
  return undefined;
}

function normalizeText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim()
    ? value.replace(/\s+/g, " ").trim()
    : undefined;
}
