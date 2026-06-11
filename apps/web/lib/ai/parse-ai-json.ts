import type { BeatType } from "@superwriter/shared";

const SUPPORTED_BEAT_TYPES = new Set<BeatType>([
  "setup",
  "inciting_incident",
  "rising_action",
  "midpoint",
  "crisis",
  "climax",
  "falling_action",
  "resolution",
  "turning_point",
  "reveal",
  "custom",
]);

export interface GeneratedBlueprintBeat {
  title: string;
  description: string;
  beat_type: BeatType;
  position_pct: number;
  default_emotion: number;
  synopsis?: string;
}

export class AIJsonParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIJsonParseError";
  }
}

export function parseGeneratedBlueprintBeats(text: string): GeneratedBlueprintBeat[] {
  const value = parseFirstJsonArray(text);
  if (!Array.isArray(value)) {
    throw new AIJsonParseError("AI 未返回节拍数组");
  }

  const beats = value.map((item, index) => normalizeGeneratedBeat(item, index));
  if (beats.length === 0) {
    throw new AIJsonParseError("AI 返回的节拍为空");
  }

  return beats;
}

export function parseFirstJsonArray(text: string): unknown[] {
  const source = stripCodeFence(text);
  const start = source.indexOf("[");
  if (start === -1) {
    throw new AIJsonParseError("未找到 JSON 数组");
  }

  const json = extractBalancedJson(source, start, "[", "]");
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) {
      throw new AIJsonParseError("JSON 顶层不是数组");
    }
    return parsed;
  } catch (error) {
    if (error instanceof AIJsonParseError) throw error;
    throw new AIJsonParseError("JSON 解析失败");
  }
}

export function parseFirstJsonObject(text: string): Record<string, unknown> {
  const source = stripCodeFence(text);
  const start = source.indexOf("{");
  if (start === -1) {
    throw new AIJsonParseError("未找到 JSON 对象");
  }

  const json = extractBalancedJson(source, start, "{", "}");
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new AIJsonParseError("JSON 顶层不是对象");
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof AIJsonParseError) throw error;
    throw new AIJsonParseError("JSON 解析失败");
  }
}

function normalizeGeneratedBeat(item: unknown, index: number): GeneratedBlueprintBeat {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new AIJsonParseError(`第 ${index + 1} 个节拍格式无效`);
  }

  const record = item as Record<string, unknown>;
  const title = getString(record.title);
  if (!title) {
    throw new AIJsonParseError(`第 ${index + 1} 个节拍缺少标题`);
  }

  return {
    title,
    description: getString(record.description) ?? "",
    beat_type: normalizeBeatType(record.beat_type),
    position_pct: clampNumber(getNumber(record.position_pct), 0, 100, 0),
    default_emotion: clampNumber(
      getNumber(record.default_emotion) ?? getNumber(record.emotion_target),
      -10,
      10,
      0,
    ),
    synopsis: getString(record.synopsis),
  };
}

function extractBalancedJson(
  source: string,
  start: number,
  open: string,
  close: string,
): string {
  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (escaping) {
        escaping = false;
      } else if (char === "\\") {
        escaping = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
    } else if (char === open) {
      depth += 1;
    } else if (char === close) {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }

  throw new AIJsonParseError("JSON 数组不完整");
}

function stripCodeFence(text: string): string {
  return text
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();
}

function normalizeBeatType(value: unknown): BeatType {
  return typeof value === "string" && SUPPORTED_BEAT_TYPES.has(value as BeatType)
    ? (value as BeatType)
    : "custom";
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function clampNumber(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (value === undefined) return fallback;
  return Math.max(min, Math.min(max, value));
}
