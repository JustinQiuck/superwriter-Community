import type { AIMode } from "@superwriter/shared";

export type WritingIntentId =
  | "continue"
  | "conflict"
  | "tighten"
  | "polish"
  | "sensory"
  | "dialogue"
  | "hook"
  | "voice-check"
  | "drift-check"
  | "foreshadowing-check";

export interface WritingIntent {
  id: WritingIntentId;
  mode: AIMode;
  label: string;
  shortLabel: string;
  description: string;
  prompt: string;
}

export interface WritingIntentGroup {
  id: "push-forward" | "improve-text" | "quality-check";
  label: string;
  intents: WritingIntent[];
}

export const WRITING_INTENTS: WritingIntent[] = [
  {
    id: "continue",
    mode: "chapter_continue",
    label: "继续往下写",
    shortLabel: "续写",
    description: "基于光标和本章目标续写下一段。",
    prompt: "请基于当前光标位置、本章目标和前后文，继续往下写一段 300-600 字正文。只输出正文。",
  },
  {
    id: "conflict",
    mode: "conflict_intensify",
    label: "加强冲突",
    shortLabel: "冲突",
    description: "让当前段落更有阻力、压迫感和推进力。",
    prompt: "请加强冲突：保留原意，让阻力更明确、人物选择更困难、情节推进更强。只输出改写后的正文。",
  },
  {
    id: "tighten",
    mode: "pacing_tighten",
    label: "压缩拖沓",
    shortLabel: "提速",
    description: "压缩解释和重复描写，让节奏更快。",
    prompt: "请压缩拖沓内容：删除重复解释，保留关键信息，让节奏更适合网文连载。只输出处理后的正文。",
  },
  {
    id: "polish",
    mode: "chapter_rewrite",
    label: "润色改写",
    shortLabel: "润色",
    description: "提升文采和流畅度，不改变情节。",
    prompt: "请润色当前文本，提升表现力和阅读顺滑度，保持原意不变。只输出润色后的正文。",
  },
  {
    id: "sensory",
    mode: "sensory_expand",
    label: "补感官描写",
    shortLabel: "感官",
    description: "补充视觉、听觉、触觉等现场感。",
    prompt: "请为当前文本补充适量感官描写，增强画面感，但不要拖慢节奏。只输出处理后的正文。",
  },
  {
    id: "dialogue",
    mode: "character_dialogue",
    label: "让角色开口",
    shortLabel: "对话",
    description: "生成符合角色口吻的对话。",
    prompt: "请基于当前场景生成一段有潜台词、有冲突推进的角色对话。只输出正文。",
  },
  {
    id: "hook",
    mode: "hook_boost",
    label: "补一个爽点/钩子",
    shortLabel: "钩子",
    description: "增强段尾吸引力或读者期待。",
    prompt: "请为当前段落补一个适合网文连载的爽点、反转或段尾钩子。不要脱离本章目标。只输出正文。",
  },
  {
    id: "voice-check",
    mode: "voice_check",
    label: "检查角色口吻",
    shortLabel: "口吻",
    description: "检查对话是否符合角色。",
    prompt: "请检查当前文本中的角色口吻是否稳定，指出不自然处，并给出可替换句子。",
  },
  {
    id: "drift-check",
    mode: "chapter_drift_check",
    label: "检查本章跑偏",
    shortLabel: "跑偏",
    description: "检查正文是否偏离本章目标。",
    prompt: "请对照本章写作目标检查当前内容是否跑偏，并给出最小修正建议。",
  },
  {
    id: "foreshadowing-check",
    mode: "foreshadowing_check",
    label: "检查伏笔遗漏",
    shortLabel: "伏笔",
    description: "检查是否遗漏应交代的信息点。",
    prompt: "请检查当前章节是否遗漏本章应交代的伏笔、线索或设定信息，并给出补写建议。",
  },
];

export const FLOATING_WRITING_INTENTS = [
  getWritingIntent("continue"),
  getWritingIntent("conflict"),
  getWritingIntent("tighten"),
  getWritingIntent("polish"),
];

export const WRITING_INTENT_GROUPS: WritingIntentGroup[] = [
  {
    id: "push-forward",
    label: "推进正文",
    intents: [
      getWritingIntent("continue"),
      getWritingIntent("conflict"),
      getWritingIntent("hook"),
    ],
  },
  {
    id: "improve-text",
    label: "优化片段",
    intents: [
      getWritingIntent("polish"),
      getWritingIntent("tighten"),
      getWritingIntent("sensory"),
      getWritingIntent("dialogue"),
    ],
  },
  {
    id: "quality-check",
    label: "检查风险",
    intents: [
      getWritingIntent("voice-check"),
      getWritingIntent("drift-check"),
      getWritingIntent("foreshadowing-check"),
    ],
  },
];

export const ADVISORY_WRITING_INTENT_MODES: AIMode[] = [
  "voice_check",
  "chapter_drift_check",
  "foreshadowing_check",
];

export const INSERTION_WRITING_INTENT_MODES: AIMode[] = [
  "chapter_continue",
  "hook_boost",
];

export function getWritingIntent(id: WritingIntentId): WritingIntent {
  const intent = WRITING_INTENTS.find((item) => item.id === id);
  if (!intent) throw new Error(`Unknown writing intent: ${id}`);
  return intent;
}

export function isAdvisoryWritingIntent(intent: WritingIntent): boolean {
  return ADVISORY_WRITING_INTENT_MODES.includes(intent.mode);
}

export function isInsertionWritingIntent(intent: WritingIntent): boolean {
  return INSERTION_WRITING_INTENT_MODES.includes(intent.mode);
}

export function buildWritingIntentPrompt(
  intent: WritingIntent,
  contextText?: string,
): string {
  const context = contextText?.trim();
  if (!context) return intent.prompt;

  return `写作意图：${intent.prompt}\n\n待处理文本：\n${context}`;
}
