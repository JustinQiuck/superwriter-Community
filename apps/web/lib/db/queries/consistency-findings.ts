import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConsistencyFindingStatus } from "@superwriter/shared";

import { addKeyConstraint } from "@/lib/db/queries/memories";
import type { Database, Json } from "@/lib/db/types";
import type {
  ConsistencyFindingSourceType,
  ConsistencyEvidence,
  ConsistencyFinding,
  CreateConsistencyFindingInput,
} from "@/types/consistency";
import type { CoreMemory } from "@/types/memory";

type DbClient = SupabaseClient<Database>;
type ConsistencyFindingRow =
  Database["public"]["Tables"]["consistency_findings"]["Row"];
type ConsistencyFindingInsert =
  Database["public"]["Tables"]["consistency_findings"]["Insert"];

interface ListConsistencyFindingsOptions {
  status?: ConsistencyFindingStatus | "all";
  chapterId?: string | null;
  sourceType?: ConsistencyFindingSourceType;
  sourceId?: string;
  memoryOnly?: boolean;
  limit?: number;
}

export async function listConsistencyFindings(
  supabase: DbClient,
  storyId: string,
  options: ListConsistencyFindingsOptions = {},
): Promise<ConsistencyFinding[]> {
  let query = supabase
    .from("consistency_findings")
    .select("*")
    .eq("story_id", storyId);

  const status = options.status ?? "open";
  if (status !== "all") {
    query = query.eq("status", status);
  }

  if (options.chapterId !== undefined) {
    query = options.chapterId === null
      ? query.is("chapter_id", null)
      : query.eq("chapter_id", options.chapterId);
  }
  if (options.sourceType) query = query.eq("source_type", options.sourceType);
  if (options.sourceId) query = query.eq("source_id", options.sourceId);
  if (options.memoryOnly) query = query.not("memory_key", "is", null);

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 50);

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapConsistencyFinding);
}

export async function listMemoryInboxFindings(
  supabase: DbClient,
  storyId: string,
  options: { status?: ConsistencyFindingStatus | "all"; limit?: number } = {},
): Promise<ConsistencyFinding[]> {
  return listConsistencyFindings(supabase, storyId, {
    status: options.status ?? "open",
    memoryOnly: true,
    limit: options.limit ?? 50,
  });
}

export async function createConsistencyFindings(
  supabase: DbClient,
  inputs: CreateConsistencyFindingInput[],
): Promise<ConsistencyFinding[]> {
  if (inputs.length === 0) return [];

  const rows = dedupeIdempotentInputs(inputs).map(toInsertRow);
  const findings: ConsistencyFinding[] = [];

  for (const row of rows) {
    const { data, error } = await supabase
      .from("consistency_findings")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505" && row.source_id) {
        findings.push(await findExistingIdempotentFinding(supabase, row, error.message));
        continue;
      }
      throw new Error(error.message);
    }

    if (data) findings.push(mapConsistencyFinding(data));
  }

  return findings;
}

export async function updateConsistencyFindingStatus(
  supabase: DbClient,
  findingId: string,
  status: ConsistencyFindingStatus,
  storyId?: string,
): Promise<ConsistencyFinding> {
  const resolvedAt = status === "accepted" || status === "resolved"
    ? new Date().toISOString()
    : null;

  let query = supabase
    .from("consistency_findings")
    .update({ status, resolved_at: resolvedAt })
    .eq("id", findingId);
  if (storyId) query = query.eq("story_id", storyId);

  const { data, error } = await query
    .select("*")
    .single();

  if (error) throwFindingsError(error);
  if (!data) throw new Error("Consistency finding not found");
  return mapConsistencyFinding(data);
}

export async function acceptMemoryInboxItem(
  supabase: DbClient,
  findingId: string,
  storyId?: string,
): Promise<{ finding: ConsistencyFinding; memory: CoreMemory | null }> {
  const finding = await getConsistencyFindingById(supabase, findingId, storyId);

  if (!finding.memoryKey?.trim() || !finding.memoryValue?.trim()) {
    throw new Error("Consistency finding is missing memory key or value");
  }

  const memory = await addKeyConstraint(
    finding.storyId,
    `${finding.memoryKey}: ${finding.memoryValue}`,
  );
  const updatedFinding = await updateConsistencyFindingStatus(
    supabase,
    findingId,
    "accepted",
    storyId,
  );

  return { finding: updatedFinding, memory };
}

async function getConsistencyFindingById(
  supabase: DbClient,
  findingId: string,
  storyId?: string,
): Promise<ConsistencyFinding> {
  let query = supabase
    .from("consistency_findings")
    .select("*")
    .eq("id", findingId);
  if (storyId) query = query.eq("story_id", storyId);

  const { data, error } = await query
    .single();

  if (error) throwFindingsError(error);
  if (!data) throw new Error("Consistency finding not found");
  return mapConsistencyFinding(data);
}

async function findExistingIdempotentFinding(
  supabase: DbClient,
  row: ConsistencyFindingInsert,
  fallbackMessage: string,
): Promise<ConsistencyFinding> {
  const { data, error } = await supabase
    .from("consistency_findings")
    .select("*")
    .eq("story_id", row.story_id)
    .eq("source_type", row.source_type)
    .eq("source_id", row.source_id ?? "")
    .eq("type", row.type)
    .eq("title", row.title)
    .single();

  if (error) throw new Error(error.message || fallbackMessage);
  if (!data) throw new Error(fallbackMessage);
  return mapConsistencyFinding(data);
}

function dedupeIdempotentInputs(
  inputs: CreateConsistencyFindingInput[],
): CreateConsistencyFindingInput[] {
  const seen = new Set<string>();
  const deduped: CreateConsistencyFindingInput[] = [];

  for (const input of inputs) {
    const key = input.sourceId
      ? [
          input.storyId,
          input.sourceType,
          input.sourceId,
          input.type,
          normalizeTitle(input.title),
        ].join("|")
      : null;

    if (key) {
      if (seen.has(key)) continue;
      seen.add(key);
    }

    deduped.push(input);
  }

  return deduped;
}

function toInsertRow(input: CreateConsistencyFindingInput): ConsistencyFindingInsert {
  return {
    story_id: input.storyId,
    chapter_id: input.chapterId ?? null,
    source_type: input.sourceType,
    source_id: input.sourceId ?? null,
    source_route_key: input.sourceRouteKey ?? null,
    source_ref: input.sourceRef ?? null,
    type: input.type,
    severity: input.severity,
    title: input.title,
    detail: input.detail,
    evidence: input.evidence as unknown as Json,
    suggestion: input.suggestion ?? null,
    memory_key: input.memoryKey ?? null,
    memory_value: input.memoryValue ?? null,
  };
}

function mapConsistencyFinding(row: ConsistencyFindingRow): ConsistencyFinding {
  return {
    id: row.id,
    storyId: row.story_id,
    chapterId: row.chapter_id,
    sourceType: row.source_type as ConsistencyFinding["sourceType"],
    sourceId: row.source_id,
    sourceRouteKey: row.source_route_key,
    sourceRef: row.source_ref,
    type: row.type,
    severity: row.severity,
    title: row.title,
    detail: row.detail,
    evidence: Array.isArray(row.evidence)
      ? (row.evidence as unknown as ConsistencyEvidence[])
      : [],
    suggestion: row.suggestion,
    memoryKey: row.memory_key,
    memoryValue: row.memory_value,
    status: row.status,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeTitle(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function throwFindingsError(error: { code?: string; message: string }): never {
  if (error.code === "PGRST116") {
    throw new Error("Consistency finding not found");
  }
  throw new Error(error.message);
}
