import { z } from "zod";
import {
  parseFirstJsonArray,
  parseFirstJsonObject,
} from "@/lib/ai/parse-ai-json";
import type {
  OutlineNode,
  ReverseSyncSuggestion,
  StoryAssetNeed,
  SynopsisCandidate,
} from "@/lib/blueprint/workflow-types";

const outlineFunctionSchema = z
  .enum(["setup", "complication", "turn", "crisis", "climax", "resolution", "custom"])
  .catch("custom");

const synopsisCandidateSchema = z.object({
  id: z.string().optional(),
  title: z.string().catch("简介方案"),
  logline: z.string().catch(""),
  synopsis: z.string().catch(""),
  promise: z.string().catch(""),
  protagonistArc: z.string().catch(""),
  endingSignal: z.string().catch(""),
});

const SYNOPSIS_FIELD_ALIASES = {
  id: ["id"],
  title: ["title", "标题"],
  logline: ["logline", "一句话", "oneLine", "one_liner"],
  synopsis: ["synopsis", "简介", "summary"],
  promise: ["promise", "readerPromise", "reader_promise", "读者承诺"],
  protagonistArc: ["protagonistArc", "protagonist_arc", "protagonistChange", "主角变化"],
  endingSignal: ["endingSignal", "ending_signal", "ending", "结局方向"],
} satisfies Record<keyof SynopsisCandidate, string[]>;

const SYNOPSIS_FIELD_KEYS = Object.values(SYNOPSIS_FIELD_ALIASES).flat();

const storyAssetNeedSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["character", "location", "faction", "rule"]),
  name: z.string(),
  reason: z.string().catch(""),
  sourceOutlineNodeId: z.string().optional(),
  status: z.enum(["suggested", "accepted", "created"]).catch("suggested"),
});

const reverseSyncSuggestionSchema = z.object({
  id: z.string().optional(),
  target: z.enum(["synopsis", "outline", "beat", "chapter", "scene_card"]),
  targetId: z.string().optional(),
  reason: z.string().catch(""),
  before: z.string().catch(""),
  after: z.string().catch(""),
  decision: z.enum(["pending", "accepted", "rejected"]).catch("pending"),
});

const workflowGenerationIssueSchema = z.object({
  error: z.string().optional(),
  message: z.string().optional(),
  details: z.string().optional(),
  suggestion: z.string().optional(),
});

export function parseSynopsisCandidates(text: string): SynopsisCandidate[] {
  const candidates = parseWorkflowArray(text, (value, index) => {
    const parsed = synopsisCandidateSchema.safeParse(value);
    if (!parsed.success) return null;

    return {
      ...parsed.data,
      id: parsed.data.id ?? `synopsis-${index + 1}`,
    };
  });
  if (candidates.length > 0) return candidates;

  return parseLooseSynopsisCandidates(text);
}

export function parseWorkflowGenerationIssue(text: string): string | null {
  try {
    const parsed = workflowGenerationIssueSchema.safeParse(
      parseFirstJsonObject(text),
    );
    if (!parsed.success) return null;

    const title = parsed.data.error ?? parsed.data.message;
    const suggestion = parsed.data.suggestion
      ? `建议：${parsed.data.suggestion}`
      : null;
    const message = [title, parsed.data.details, suggestion]
      .filter((part): part is string => Boolean(part?.trim()))
      .join("\n\n")
      .trim();

    return message || null;
  } catch {
    return null;
  }
}

export function parseOutlineNodes(text: string): OutlineNode[] {
  return parseWorkflowArray(text, normalizeOutlineNode);
}

export function parseStoryAssetNeeds(text: string): StoryAssetNeed[] {
  return parseWorkflowArray(text, (value, index) => {
    const parsed = storyAssetNeedSchema.safeParse(value);
    if (!parsed.success) return null;

    return {
      ...parsed.data,
      id: parsed.data.id ?? `asset-${index + 1}`,
    };
  });
}

export function parseReverseSyncSuggestions(text: string): ReverseSyncSuggestion[] {
  return parseWorkflowArray(text, (value, index) => {
    const parsed = reverseSyncSuggestionSchema.safeParse(value);
    if (!parsed.success) return null;

    return {
      ...parsed.data,
      id: parsed.data.id ?? `reverse-sync-${index + 1}`,
    };
  });
}

function parseWorkflowArray<T>(
  text: string,
  normalize: (value: unknown, index: number) => T | null,
): T[] {
  try {
    return parseFirstJsonArray(text)
      .map((value, index) => normalize(value, index))
      .filter((value): value is T => value !== null);
  } catch {
    return [];
  }
}

function parseLooseSynopsisCandidates(text: string): SynopsisCandidate[] {
  const arrayText = extractFirstArrayTextLenient(stripCodeFence(text));
  if (!arrayText) return [];

  return splitTopLevelObjectTexts(arrayText)
    .map((objectText, index) => {
      const candidate: SynopsisCandidate = {
        id: extractLooseStringField(objectText, SYNOPSIS_FIELD_ALIASES.id) ?? `synopsis-${index + 1}`,
        title: extractLooseStringField(objectText, SYNOPSIS_FIELD_ALIASES.title) ?? "简介方案",
        logline: extractLooseStringField(objectText, SYNOPSIS_FIELD_ALIASES.logline) ?? "",
        synopsis: extractLooseStringField(objectText, SYNOPSIS_FIELD_ALIASES.synopsis) ?? "",
        promise: extractLooseStringField(objectText, SYNOPSIS_FIELD_ALIASES.promise) ?? "",
        protagonistArc: extractLooseStringField(objectText, SYNOPSIS_FIELD_ALIASES.protagonistArc) ?? "",
        endingSignal: extractLooseStringField(objectText, SYNOPSIS_FIELD_ALIASES.endingSignal) ?? "",
      };

      return hasMeaningfulSynopsisCandidate(candidate) ? candidate : null;
    })
    .filter((candidate): candidate is SynopsisCandidate => candidate !== null);
}

function hasMeaningfulSynopsisCandidate(candidate: SynopsisCandidate): boolean {
  return Boolean(
    candidate.title.trim() &&
    (candidate.logline.trim() || candidate.synopsis.trim()),
  );
}

function extractFirstArrayTextLenient(source: string): string | null {
  const start = source.indexOf("[");
  if (start === -1) return null;

  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (char === "[") depth += 1;
    if (char === "]") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }

  return source.slice(start);
}

function splitTopLevelObjectTexts(arrayText: string): string[] {
  const objects: string[] = [];
  let depth = 0;
  let objectStart = -1;

  for (let index = 0; index < arrayText.length; index += 1) {
    const char = arrayText[index];
    if (char === "{") {
      if (depth === 0) objectStart = index;
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0 && objectStart !== -1) {
        objects.push(arrayText.slice(objectStart, index + 1));
        objectStart = -1;
      }
    }
  }

  return objects;
}

function extractLooseStringField(objectText: string, aliases: string[]): string | undefined {
  const start = findFieldValueStart(objectText, aliases);
  if (!start) return undefined;

  const end = findLooseStringEnd(objectText, start.index, aliases);
  if (end <= start.index) return undefined;

  return decodeLooseJsonString(objectText.slice(start.index, end));
}

function findFieldValueStart(
  objectText: string,
  aliases: string[],
): { index: number; alias: string } | null {
  let best: { index: number; alias: string } | null = null;

  for (const alias of aliases) {
    const pattern = new RegExp(`"${escapeRegExp(alias)}"\\s*:\\s*"`, "g");
    const match = pattern.exec(objectText);
    if (!match) continue;
    const index = match.index + match[0].length;
    if (!best || index < best.index) {
      best = { index, alias };
    }
  }

  return best;
}

function findLooseStringEnd(
  objectText: string,
  valueStart: number,
  currentAliases: string[],
): number {
  let end = Number.POSITIVE_INFINITY;
  const currentAliasSet = new Set(currentAliases);

  for (const key of SYNOPSIS_FIELD_KEYS) {
    if (currentAliasSet.has(key)) continue;
    const pattern = new RegExp(`"\\s*,\\s*\\r?\\n\\s*"${escapeRegExp(key)}"\\s*:`, "g");
    pattern.lastIndex = valueStart;
    const match = pattern.exec(objectText);
    if (match) end = Math.min(end, match.index);
  }

  const closingPattern = /"\s*\r?\n\s*}/g;
  closingPattern.lastIndex = valueStart;
  const closing = closingPattern.exec(objectText);
  if (closing) end = Math.min(end, closing.index);

  if (Number.isFinite(end)) return end;

  const lastQuote = objectText.lastIndexOf("\"");
  return lastQuote > valueStart ? lastQuote : objectText.length;
}

function decodeLooseJsonString(value: string): string | undefined {
  const decoded = value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, "\"")
    .replace(/\\\\/g, "\\")
    .trim();
  return decoded || undefined;
}

function stripCodeFence(text: string): string {
  return text
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeOutlineNode(value: unknown): OutlineNode | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const children = Array.isArray(record.children)
    ? record.children
        .map(normalizeOutlineNode)
        .filter((child): child is OutlineNode => child !== null)
    : [];

  return {
    id: getString(record.id) ?? crypto.randomUUID(),
    title: getString(record.title) ?? "大纲节点",
    synopsis: getString(record.synopsis) ?? "",
    order: getInteger(record.order) ?? 0,
    function: outlineFunctionSchema.parse(record.function),
    children,
  };
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) ? value : undefined;
}
