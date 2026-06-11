import {
  clearImportSourceText,
  createImportAppliedRecord,
  getImportAppliedRecord,
  getImportCandidates,
  getImportSections,
  getImportSessionById,
  markImportCandidateApplied,
  updateImportSession,
  type CreateImportAppliedRecordInput,
} from "@/lib/db/queries/imports";
import { createBlueprint, createBlueprintChapter, createBeat } from "@/lib/db/queries/blueprints";
import { createEntity } from "@/lib/db/queries/entities";
import { createRelationship } from "@/lib/db/queries/relationships";
import { createStory } from "@/lib/db/queries/stories";
import { createClient } from "@/lib/supabase/server";
import type {
  ImportAppliedRecord,
  ImportCandidate,
  ImportSection,
  ImportSession,
} from "@/types/import";
import { RELATIONSHIP_TYPE_LABELS, type EntityType, type RelationshipType } from "@superwriter/shared";

const MIGRATABLE_SECTION_TYPES = new Set(["chapter", "prologue", "unknown"]);

export interface ImportApplyResult {
  storyId: string;
  reused: boolean;
}

export interface ApplyStoryInput {
  title: string;
  description?: string;
  settings?: Record<string, unknown>;
}

export interface ApplyEntityInput {
  type: EntityType;
  name: string;
  data?: Record<string, unknown>;
  content?: string;
  tags?: string[];
  sort_order?: number;
  status?: string;
}

export interface ApplyRelationshipInput {
  from_entity_id: string;
  to_entity_id: string;
  type: RelationshipType;
  description?: string;
  bidirectional?: boolean;
  evolution?: Array<Record<string, unknown>>;
}

export interface ApplyBlueprintChildInput {
  candidate: ImportCandidate;
  operationKey: string;
}

export interface ApplyBlueprintInput {
  blueprint: ImportCandidate;
  beats: ApplyBlueprintChildInput[];
  chapters: ApplyBlueprintChildInput[];
}

export interface FindExistingTargetInput {
  targetTable: string;
  operationKey: string;
  storyId?: string;
  blueprintId?: string;
  relationship?: ApplyRelationshipInput;
}

export interface ImportApplyRepository {
  getSession(sessionId: string): Promise<ImportSession | null>;
  getSections(sessionId: string): Promise<ImportSection[]>;
  getCandidates(sessionId: string): Promise<ImportCandidate[]>;
  getAppliedRecord(operationKey: string): Promise<ImportAppliedRecord | null>;
  createAppliedRecord(input: CreateImportAppliedRecordInput): Promise<ImportAppliedRecord>;
  findExistingTarget(input: FindExistingTargetInput): Promise<{ id: string } | null>;
  createStory(input: ApplyStoryInput): Promise<{ id: string }>;
  createEntity(storyId: string, input: ApplyEntityInput): Promise<{ id: string }>;
  createRelationship(storyId: string, input: ApplyRelationshipInput): Promise<{ id: string }>;
  createBlueprintGraph(
    storyId: string,
    input: ApplyBlueprintInput,
    rootOperationKey: string,
  ): Promise<{ blueprintId: string }>;
  markSessionApplying(sessionId: string): Promise<void>;
  markSessionCompleted(sessionId: string, storyId: string): Promise<void>;
  markCandidateApplied(
    sessionId: string,
    candidateId: string,
    targetTable: string,
    targetId: string,
  ): Promise<void>;
  clearDuplicateSourceText(sessionId: string): Promise<void>;
}

export class ImportSessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Import session not found: ${sessionId}`);
    this.name = "ImportSessionNotFoundError";
  }
}

export class ImportSessionNotReadyError extends Error {
  constructor(status: string) {
    super(`Import session is not ready to apply: ${status}`);
    this.name = "ImportSessionNotReadyError";
  }
}

export class ImportNoConfirmedChaptersError extends Error {
  constructor() {
    super("Import session has no confirmed chapters");
    this.name = "ImportNoConfirmedChaptersError";
  }
}

export class ImportApplyError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ImportApplyError";
  }
}

export async function applyImportSession(sessionId: string): Promise<ImportApplyResult> {
  return applyImportSessionWithRepository(createSupabaseImportApplyRepository(), sessionId);
}

export async function applyImportSessionWithRepository(
  repo: ImportApplyRepository,
  sessionId: string,
): Promise<ImportApplyResult> {
  const session = await repo.getSession(sessionId);
  if (!session) throw new ImportSessionNotFoundError(sessionId);

  const isReapplyingCompletedSession = session.status === "completed";
  if (
    session.status !== "ready_for_review" &&
    session.status !== "applying" &&
    !isReapplyingCompletedSession
  ) {
    throw new ImportSessionNotReadyError(session.status);
  }

  const [sections, candidates] = await Promise.all([
    repo.getSections(sessionId),
    repo.getCandidates(sessionId),
  ]);
  const confirmedChapters = sections
    .filter((section) =>
      section.status === "confirmed" && MIGRATABLE_SECTION_TYPES.has(section.section_type)
    )
    .sort((a, b) => a.sort_order - b.sort_order);
  if (confirmedChapters.length === 0) throw new ImportNoConfirmedChaptersError();

  await repo.markSessionApplying(sessionId);

  const applyableCandidates = candidates.filter(isApplyableCandidate);
  const storySummary = applyableCandidates.find((candidate) => candidate.candidate_type === "story_summary");
  const storyKey = storyOperationKey(sessionId);
  const storyId = await createOrReuse(repo, {
    operationKey: storyKey,
    sessionId,
    sourceType: "session",
    sourceId: sessionId,
    targetTable: "stories",
    recover: { targetTable: "stories", operationKey: storyKey },
    create: () => repo.createStory({
      title: storySummary?.name?.trim() || session.inferred_title?.trim() || stripExtension(session.source_filename),
      description: storySummary?.summary?.trim() || undefined,
      settings: { import_operation_key: storyKey },
    }),
  });

  const candidateEntityIdsByName = new Map<string, string[]>();
  const candidateEntityIdsByCandidateId = new Map<string, string>();

  for (const [index, chapter] of confirmedChapters.entries()) {
    const operationKey = chapterOperationKey(sessionId, chapter.id);
    await createOrReuse(repo, {
      operationKey,
      sessionId,
      sourceType: "section",
      sourceId: chapter.id,
      targetTable: "entities",
      recover: { targetTable: "entities", operationKey, storyId },
      create: () => repo.createEntity(storyId, {
        type: "chapter",
        name: chapter.title?.trim() || `第 ${index + 1} 章`,
        content: chapter.content ?? "",
        sort_order: chapter.sort_order,
        data: {
          chapter_number: index + 1,
          word_count: chapter.word_count,
          location_entity_ids: [],
          scene_ids: [],
          writing_status: "draft",
          ...chapterSummaryData(chapter),
          import_operation_key: operationKey,
        },
      }),
    });
  }

  for (const candidate of applyableCandidates) {
    if (candidate.candidate_type !== "character" && candidate.candidate_type !== "location") {
      continue;
    }
    if (!candidate.name?.trim()) continue;
    const entityType: "character" | "location" = candidate.candidate_type;
    const operationKey = candidateEntityOperationKey(sessionId, candidate.id);

    const targetId = await createOrReuse(repo, {
        operationKey,
        sessionId,
        sourceType: "candidate",
        sourceId: candidate.id,
        candidateId: candidate.id,
        targetTable: "entities",
        recover: { targetTable: "entities", operationKey, storyId },
        onMissingExisting: candidate.status === "applied"
          ? () => missingAppliedRecordError(candidate, "entities", operationKey)
          : undefined,
        create: () => repo.createEntity(storyId, {
          type: entityType,
          name: candidate.name?.trim() ?? "",
          content: candidate.summary ?? undefined,
          data: {
            ...buildCandidateEntityData(candidate),
            import_operation_key: operationKey,
          },
        }),
      });
    appendMapValue(candidateEntityIdsByName, candidate.name.trim(), targetId);
    candidateEntityIdsByCandidateId.set(candidate.id, targetId);
    if (candidate.status !== "applied" || candidate.applied_target_id !== targetId) {
      await repo.markCandidateApplied(sessionId, candidate.id, "entities", targetId);
    }
  }

  const blueprintCandidates = applyableCandidates.filter((candidate) => candidate.candidate_type === "blueprint");
  const blueprintBeatCandidates = applyableCandidates
    .filter((candidate) => candidate.candidate_type === "blueprint_beat")
    .map((candidate) => ({
      candidate,
      operationKey: blueprintBeatOperationKey(sessionId, candidate.id),
    }));
  const blueprintChapterCandidates = applyableCandidates
    .filter((candidate) => candidate.candidate_type === "blueprint_chapter")
    .map((candidate) => ({
      candidate,
      operationKey: blueprintChapterOperationKey(sessionId, candidate.id),
    }));
  for (const blueprint of blueprintCandidates) {
    const operationKey = blueprintOperationKey(sessionId, blueprint.id);

    const existingRecord = await repo.getAppliedRecord(operationKey);
    const recovered = existingRecord
      ? { id: existingRecord.target_id }
      : await repo.findExistingTarget({ targetTable: "story_blueprints", operationKey, storyId });

    if (blueprint.status === "applied" && !recovered) {
      missingAppliedRecordError(blueprint, "story_blueprints", operationKey);
    }

    const result = await repo.createBlueprintGraph(storyId, {
      blueprint,
      beats: blueprintBeatCandidates,
      chapters: blueprintChapterCandidates,
    }, operationKey);
    const targetId = result.blueprintId;

    if (blueprint.status !== "applied" || blueprint.applied_target_id !== targetId) {
      await repo.markCandidateApplied(sessionId, blueprint.id, "story_blueprints", targetId);
    }
  }

  for (const candidate of applyableCandidates) {
    if (candidate.candidate_type !== "relationship") continue;
    const operationKey = relationshipOperationKey(sessionId, candidate.id);

    const fromId = findEndpointEntityId(
      candidate.payload,
      "from",
      candidateEntityIdsByName,
      candidateEntityIdsByCandidateId,
    );
    const toId = findEndpointEntityId(
      candidate.payload,
      "to",
      candidateEntityIdsByName,
      candidateEntityIdsByCandidateId,
    );
    if (!fromId || !toId) continue;
    const relationshipInput = {
      from_entity_id: fromId,
      to_entity_id: toId,
      type: relationshipTypeFromPayload(candidate.payload.relationship_type),
      description: stringFromPayload(candidate.payload.description) ?? candidate.summary ?? undefined,
      bidirectional: true,
      evolution: [{ import_operation_key: operationKey }],
    };

    const targetId = await createOrReuse(repo, {
      operationKey,
      sessionId,
      sourceType: "candidate",
      sourceId: candidate.id,
      candidateId: candidate.id,
      targetTable: "relationships",
      recover: { targetTable: "relationships", operationKey, storyId, relationship: relationshipInput },
      onMissingExisting: candidate.status === "applied"
        ? () => missingAppliedRecordError(candidate, "relationships", operationKey)
        : undefined,
      create: () => repo.createRelationship(storyId, relationshipInput),
    });
    if (candidate.status !== "applied" || candidate.applied_target_id !== targetId) {
      await repo.markCandidateApplied(sessionId, candidate.id, "relationships", targetId);
    }
  }

  await repo.clearDuplicateSourceText(sessionId);
  await repo.markSessionCompleted(sessionId, storyId);

  return { storyId, reused: isReapplyingCompletedSession };
}

function isApplyableCandidate(candidate: ImportCandidate): boolean {
  return (
    candidate.status === "pending" ||
    candidate.status === "accepted" ||
    candidate.status === "applied"
  );
}

function createSupabaseImportApplyRepository(): ImportApplyRepository {
  return {
    getSession: getImportSessionById,
    getSections: getImportSections,
    getCandidates: getImportCandidates,
    getAppliedRecord: getImportAppliedRecord,
    createAppliedRecord: createImportAppliedRecord,
    findExistingTarget: findExistingSupabaseTarget,
    createStory,
    createEntity,
    createRelationship,
    createBlueprintGraph: async (storyId, input, rootOperationKey) => {
      const existing = await getImportAppliedRecord(rootOperationKey);
      const recovered = existing
        ? { id: existing.target_id }
        : await findExistingSupabaseTarget({
          targetTable: "story_blueprints",
          operationKey: rootOperationKey,
          storyId,
        });
      let blueprintId = recovered?.id;

      if (!blueprintId) {
        const blueprint = await createBlueprint(storyId, {
          title: input.blueprint.name ?? undefined,
          synopsis: input.blueprint.summary ?? undefined,
          settings: {
            ...input.blueprint.payload,
            import_operation_key: rootOperationKey,
          },
        });
        blueprintId = blueprint.id;
        await createImportAppliedRecord({
          session_id: input.blueprint.session_id,
          source_type: "candidate",
          source_id: input.blueprint.id,
          candidate_id: input.blueprint.id,
          target_table: "story_blueprints",
          target_id: blueprintId,
          operation_key: rootOperationKey,
        });
      } else if (!existing) {
        await createImportAppliedRecord({
          session_id: input.blueprint.session_id,
          source_type: "candidate",
          source_id: input.blueprint.id,
          candidate_id: input.blueprint.id,
          target_table: "story_blueprints",
          target_id: blueprintId,
          operation_key: rootOperationKey,
        });
      }

      for (const [index, beat] of input.beats.entries()) {
        const existingBeat = await findExistingSupabaseTarget({
          targetTable: "blueprint_beats",
          operationKey: beat.operationKey,
          storyId,
          blueprintId,
        });
        if (existingBeat) continue;

        await createBeat(storyId, blueprintId, {
          title: beat.candidate.name ?? `节拍 ${index + 1}`,
          description: beat.candidate.summary ?? undefined,
          content: {
            ...beat.candidate.payload,
            import_operation_key: beat.operationKey,
          },
          sort_order: index,
        });
      }

      for (const [index, chapter] of input.chapters.entries()) {
        const existingChapter = await findExistingSupabaseTarget({
          targetTable: "blueprint_chapters",
          operationKey: chapter.operationKey,
          storyId,
          blueprintId,
        });
        if (existingChapter) continue;

        await createBlueprintChapter(storyId, blueprintId, {
          title: chapter.candidate.name ?? `章节 ${index + 1}`,
          synopsis: chapter.candidate.summary ?? undefined,
          content_guidance: {
            ...chapter.candidate.payload,
            import_operation_key: chapter.operationKey,
          },
          sort_order: index,
        });
      }

      return { blueprintId };
    },
    markSessionApplying: async (sessionId) => {
      await updateImportSession(sessionId, {
        status: "applying",
        current_step: "apply",
        apply_started_at: new Date().toISOString(),
        error_message: null,
      });
    },
    markSessionCompleted: async (sessionId, storyId) => {
      await updateImportSession(sessionId, {
        status: "completed",
        current_step: "apply",
        created_story_id: storyId,
        apply_completed_at: new Date().toISOString(),
        error_message: null,
      });
    },
    markCandidateApplied: markImportCandidateApplied,
    clearDuplicateSourceText: clearImportSourceText,
  };
}

async function createOrReuse(
  repo: ImportApplyRepository,
  input: {
    operationKey: string;
    sessionId: string;
    sourceType: string;
    sourceId?: string | null;
    candidateId?: string | null;
    targetTable: string;
    recover?: FindExistingTargetInput;
    onMissingExisting?: () => never;
    create: () => Promise<{ id: string }>;
  },
): Promise<string> {
  const existing = await repo.getAppliedRecord(input.operationKey);
  if (existing) return existing.target_id;

  if (input.recover) {
    const recovered = await repo.findExistingTarget(input.recover);
    if (recovered) {
      await repo.createAppliedRecord({
        session_id: input.sessionId,
        source_type: input.sourceType,
        source_id: input.sourceId ?? null,
        candidate_id: input.candidateId ?? null,
        target_table: input.targetTable,
        target_id: recovered.id,
        operation_key: input.operationKey,
      });
      return recovered.id;
    }
  }

  input.onMissingExisting?.();

  const created = await input.create();
  await repo.createAppliedRecord({
    session_id: input.sessionId,
    source_type: input.sourceType,
    source_id: input.sourceId ?? null,
    candidate_id: input.candidateId ?? null,
    target_table: input.targetTable,
    target_id: created.id,
    operation_key: input.operationKey,
  });
  return created.id;
}

async function findExistingSupabaseTarget(
  input: FindExistingTargetInput,
): Promise<{ id: string } | null> {
  const supabase = await createClient();

  if (input.targetTable === "stories") {
    const { data } = await supabase
      .from("stories")
      .select("id")
      .eq("settings->>import_operation_key", input.operationKey)
      .maybeSingle();
    return data as { id: string } | null;
  }

  if (input.targetTable === "entities") {
    const { data } = await supabase
      .from("entities")
      .select("id")
      .eq("story_id", input.storyId)
      .eq("data->>import_operation_key", input.operationKey)
      .maybeSingle();
    return data as { id: string } | null;
  }

  if (input.targetTable === "relationships" && input.relationship) {
    const { data } = await supabase
      .from("relationships")
      .select("id")
      .eq("story_id", input.storyId)
      .eq("from_entity_id", input.relationship.from_entity_id)
      .eq("to_entity_id", input.relationship.to_entity_id)
      .eq("type", input.relationship.type)
      .maybeSingle();
    return data as { id: string } | null;
  }

  if (input.targetTable === "story_blueprints") {
    const { data } = await supabase
      .from("story_blueprints")
      .select("id")
      .eq("story_id", input.storyId)
      .eq("settings->>import_operation_key", input.operationKey)
      .maybeSingle();
    return data as { id: string } | null;
  }

  if (input.targetTable === "blueprint_beats") {
    const { data } = await supabase
      .from("blueprint_beats")
      .select("id")
      .eq("story_id", input.storyId)
      .eq("blueprint_id", input.blueprintId)
      .eq("content->>import_operation_key", input.operationKey)
      .maybeSingle();
    return data as { id: string } | null;
  }

  if (input.targetTable === "blueprint_chapters") {
    const { data } = await supabase
      .from("blueprint_chapters")
      .select("id")
      .eq("story_id", input.storyId)
      .eq("blueprint_id", input.blueprintId)
      .eq("content_guidance->>import_operation_key", input.operationKey)
      .maybeSingle();
    return data as { id: string } | null;
  }

  return null;
}

function missingAppliedRecordError(
  candidate: ImportCandidate,
  targetTable: string,
  operationKey: string,
): never {
  throw new ImportApplyError(
    "IMPORT_APPLIED_RECORD_MISSING",
    `Candidate ${candidate.id} is marked applied to ${targetTable}, but no recoverable applied record exists for ${operationKey}.`,
  );
}

function storyOperationKey(sessionId: string) {
  return `${sessionId}:session:${sessionId}:stories`;
}

function chapterOperationKey(sessionId: string, sectionId: string) {
  return `${sessionId}:section:${sectionId}:entities`;
}

function candidateEntityOperationKey(sessionId: string, candidateId: string) {
  return `${sessionId}:candidate:${candidateId}:entities`;
}

function relationshipOperationKey(sessionId: string, candidateId: string) {
  return `${sessionId}:candidate:${candidateId}:relationships`;
}

function blueprintOperationKey(sessionId: string, candidateId: string) {
  return `${sessionId}:candidate:${candidateId}:story_blueprints`;
}

function blueprintBeatOperationKey(sessionId: string, candidateId: string) {
  return `${sessionId}:candidate:${candidateId}:blueprint_beats`;
}

function blueprintChapterOperationKey(sessionId: string, candidateId: string) {
  return `${sessionId}:candidate:${candidateId}:blueprint_chapters`;
}

function stripExtension(filename: string) {
  return filename.replace(/\.[^.]+$/, "") || filename;
}

function chapterSummaryData(section: ImportSection) {
  const summary = stringFromPayload(section.metadata.summary);
  return summary ? { summary } : {};
}

function buildCandidateEntityData(candidate: ImportCandidate) {
  if (candidate.candidate_type === "character") {
    return {
      aliases: [],
      age: "",
      gender: "",
      occupation: "",
      status: "active",
      appearance: {},
      personality_traits: [],
      motivations: [],
      fears: [],
      secrets: [],
      role: "supporting",
      arc: { starting_state: "", ending_state: "", turning_points: [] },
      sensory_symbols: {},
      information_state: { knows: [], doesnt_know: [], information_sources: [] },
      custom_fields: {},
      summary: candidate.summary,
      ...candidate.payload,
    };
  }

  return {
    category: "other",
    atmosphere: "",
    sensory_details: {},
    summary: candidate.summary,
    ...candidate.payload,
  };
}

function findEndpointEntityId(
  payload: Record<string, unknown>,
  side: "from" | "to",
  entityIdsByName: Map<string, string[]>,
  entityIdsByCandidateId: Map<string, string>,
) {
  const candidateId = stringFromPayload(payload[`${side}_candidate_id`]);
  if (candidateId) return entityIdsByCandidateId.get(candidateId);

  const name = stringFromPayload(payload[`${side}_name`]);
  if (!name) return undefined;

  const matches = entityIdsByName.get(name) ?? [];
  if (matches.length > 1) {
    throw new ImportApplyError(
      "IMPORT_RELATIONSHIP_ENDPOINT_AMBIGUOUS",
      `Relationship endpoint "${name}" matches multiple imported entities. Use candidate references or resolve duplicate names.`,
    );
  }
  return matches[0];
}

function stringFromPayload(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function relationshipTypeFromPayload(value: unknown): RelationshipType {
  if (typeof value === "string" && value in RELATIONSHIP_TYPE_LABELS) {
    return value as RelationshipType;
  }
  return "custom";
}

function appendMapValue(map: Map<string, string[]>, key: string, value: string) {
  const values = map.get(key) ?? [];
  values.push(value);
  map.set(key, values);
}
