import { z } from "zod";

import { parseFirstJsonObject } from "@/lib/ai/parse-ai-json";
import type { ImportCandidateType } from "@/types/import";

export class ImportAnalysisParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportAnalysisParseError";
  }
}

export interface CandidateDraft {
  candidate_type: ImportCandidateType;
  name: string;
  summary: string | null;
  payload: Record<string, unknown>;
  confidence: number;
  source_section_ids: string[];
}

export interface ParsedChapterAnalysis {
  summary: string;
  keyEvents: string[];
  candidates: CandidateDraft[];
}

const looseRecordSchema = z.object({}).catchall(z.unknown());
const namedItemSchema = looseRecordSchema.extend({
  name: z.string().trim().min(1),
  summary: z.string().trim().optional().nullable(),
  confidence: z.number().optional(),
});
const chapterAnalysisSchema = looseRecordSchema.extend({
  summary: z.string().trim().optional().default(""),
  characters: z.array(namedItemSchema).optional().default([]),
  locations: z.array(namedItemSchema).optional().default([]),
  relationships: z.array(looseRecordSchema).optional().default([]),
  keyEvents: z.array(z.string()).optional().default([]),
});
const aggregateAnalysisSchema = chapterAnalysisSchema.extend({
  storySummary: z.string().trim().optional(),
});
const blueprintAnalysisSchema = looseRecordSchema.extend({
  blueprint: looseRecordSchema.optional(),
  beats: z.array(looseRecordSchema).optional().default([]),
  chapters: z.array(looseRecordSchema).optional().default([]),
});

export function parseChapterAnalysisJson(
  text: string,
  sourceSectionIds: string[],
): ParsedChapterAnalysis {
  const parsed = parseWithSchema(text, chapterAnalysisSchema);
  return {
    summary: parsed.summary,
    keyEvents: parsed.keyEvents.map((event) => event.trim()).filter(Boolean),
    candidates: [
      ...parseNamedCandidates("character", parsed.characters, sourceSectionIds),
      ...parseNamedCandidates("location", parsed.locations, sourceSectionIds),
      ...parseRelationshipCandidates(parsed.relationships, sourceSectionIds),
    ],
  };
}

export function parseAggregateAnalysisJson(
  text: string,
  sourceSectionIds: string[],
): CandidateDraft[] {
  const parsed = parseWithSchema(text, aggregateAnalysisSchema);
  const summary = parsed.storySummary ?? parsed.summary;
  const candidates: CandidateDraft[] = [];

  if (summary.trim()) {
    candidates.push({
      candidate_type: "story_summary",
      name: "故事摘要",
      summary: summary.trim(),
      payload: { summary: summary.trim() },
      confidence: 1,
      source_section_ids: sourceSectionIds,
    });
  }

  candidates.push(
    ...parseNamedCandidates("character", parsed.characters, sourceSectionIds),
    ...parseNamedCandidates("location", parsed.locations, sourceSectionIds),
    ...parseRelationshipCandidates(parsed.relationships, sourceSectionIds),
  );

  return candidates;
}

export function parseBlueprintAnalysisJson(
  text: string,
  sourceSectionIds: string[],
): CandidateDraft[] {
  const parsed = parseWithSchema(text, blueprintAnalysisSchema);
  const candidates: CandidateDraft[] = [];

  if (parsed.blueprint) {
    const blueprintName = getName(parsed.blueprint, "故事蓝图");
    candidates.push(buildCandidate({
      candidate_type: "blueprint",
      name: blueprintName,
      summary: getSummary(parsed.blueprint),
      payload: parsed.blueprint,
      confidence: getConfidence(parsed.blueprint),
      sourceSectionIds,
    }));
  }

  candidates.push(
    ...parsed.beats
      .map((beat) => buildCandidate({
        candidate_type: "blueprint_beat" as const,
        name: getName(beat, "未命名节拍"),
        summary: getSummary(beat),
        payload: beat,
        confidence: getConfidence(beat),
        sourceSectionIds,
      })),
    ...parsed.chapters
      .map((chapter) => buildCandidate({
        candidate_type: "blueprint_chapter" as const,
        name: getName(chapter, "未命名章节"),
        summary: getSummary(chapter),
        payload: chapter,
        confidence: getConfidence(chapter),
        sourceSectionIds,
      })),
  );

  return candidates;
}

function parseWithSchema<T extends z.ZodTypeAny>(
  text: string,
  schema: T,
): z.infer<T> {
  try {
    const parsed = parseFirstJsonObject(text);
    return schema.parse(parsed);
  } catch (error) {
    if (error instanceof ImportAnalysisParseError) throw error;
    const message = error instanceof Error ? error.message : "AI JSON 解析失败";
    throw new ImportAnalysisParseError(message);
  }
}

function parseNamedCandidates(
  candidateType: "character" | "location",
  items: z.infer<typeof namedItemSchema>[],
  sourceSectionIds: string[],
): CandidateDraft[] {
  return items.map((item) => buildCandidate({
    candidate_type: candidateType,
    name: item.name,
    summary: item.summary?.trim() || null,
    payload: { ...item },
    confidence: normalizeConfidence(item.confidence),
    sourceSectionIds,
  }));
}

function parseRelationshipCandidates(
  items: Record<string, unknown>[],
  sourceSectionIds: string[],
): CandidateDraft[] {
  return items.map((item, index) => {
    const fromName = getString(item.from) ?? getString(item.from_name);
    const toName = getString(item.to) ?? getString(item.to_name);
    const relationshipType = getString(item.type) ?? getString(item.relationship_type) ?? "custom";
    const description = getString(item.description) ?? getString(item.summary) ?? "";

    if (!fromName || !toName) {
      throw new ImportAnalysisParseError(`第 ${index + 1} 个关系缺少角色名称`);
    }

    return buildCandidate({
      candidate_type: "relationship",
      name: `${fromName} - ${toName}`,
      summary: description || null,
      payload: {
        ...item,
        from_name: fromName,
        to_name: toName,
        relationship_type: relationshipType,
        description,
      },
      confidence: normalizeConfidence(getNumber(item.confidence)),
      sourceSectionIds,
    });
  });
}

function buildCandidate(input: {
  candidate_type: ImportCandidateType;
  name: string;
  summary: string | null;
  payload: Record<string, unknown>;
  confidence: number;
  sourceSectionIds: string[];
}): CandidateDraft {
  return {
    candidate_type: input.candidate_type,
    name: input.name.trim(),
    summary: input.summary,
    payload: input.payload,
    confidence: input.confidence,
    source_section_ids: input.sourceSectionIds,
  };
}

function getName(record: Record<string, unknown>, fallback: string): string {
  return getString(record.name) ?? getString(record.title) ?? fallback;
}

function getSummary(record: Record<string, unknown>): string | null {
  return getString(record.summary) ?? getString(record.description) ?? null;
}

function getConfidence(record: Record<string, unknown>): number {
  return normalizeConfidence(getNumber(record.confidence));
}

function normalizeConfidence(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 0.7;
  return Math.max(0, Math.min(1, value));
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
