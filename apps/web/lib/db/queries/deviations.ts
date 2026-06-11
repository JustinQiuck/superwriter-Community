import { createClient } from "@/lib/supabase/server";
import type {
  DeviationType,
  DeviationStatus,
  DeviationReport,
  DeviationResult,
} from "@/types/deviation";

interface DeviationRow {
  story_id: string;
  beat_id: string | null;
  deviation_type: DeviationType;
  severity: DeviationResult["severity"];
  blueprint_value: string;
  actual_value: string;
  status: "pending";
  fingerprint: string;
}

interface ExistingDeviationIdentity {
  beat_id: string | null;
  deviation_type: DeviationType;
  blueprint_value: string;
}

function mapDeviationReport(data: Record<string, unknown>): DeviationReport {
  return {
    id: data.id as string,
    storyId: data.story_id as string,
    beatId: (data.beat_id as string) ?? null,
    deviationType: data.deviation_type as DeviationType,
    severity: data.severity as DeviationReport["severity"],
    blueprintValue: (data.blueprint_value as string) ?? "",
    actualValue: (data.actual_value as string) ?? "",
    aiSuggestion: (data.ai_suggestion as string) ?? null,
    status: data.status as DeviationStatus,
    resolvedAt: (data.resolved_at as string) ?? null,
    createdAt: data.created_at as string,
  };
}

export async function storeDeviationReports(
  storyId: string,
  results: DeviationResult[],
): Promise<void> {
  if (results.length === 0) return;

  const supabase = await createClient();
  const rows = prepareDeviationRows(storyId, results);
  if (rows.length === 0) return;

  for (const row of rows) {
    const { error } = await supabase
      .from("story_deviation_reports")
      .insert(row);
    if (error && error.code !== "23505") throw error;
  }
}

export function prepareDeviationRows(
  storyId: string,
  results: DeviationResult[],
  existing: ExistingDeviationIdentity[] = [],
): DeviationRow[] {
  const seen = new Set(existing.map(buildDeviationFingerprint));
  const rows: DeviationRow[] = [];

  for (const result of results) {
    const row: DeviationRow = {
      story_id: storyId,
      beat_id: result.beatId,
      deviation_type: result.deviationType,
      severity: result.severity,
      blueprint_value: result.blueprintValue,
      actual_value: result.actualValue,
      status: "pending",
      fingerprint: "",
    };
    row.fingerprint = buildDeviationFingerprint(row);
    if (seen.has(row.fingerprint)) continue;
    seen.add(row.fingerprint);
    rows.push(row);
  }

  return rows;
}

export function buildDeviationFingerprint(
  deviation: ExistingDeviationIdentity,
): string {
  return [
    deviation.beat_id ?? "story",
    deviation.deviation_type,
    normalizeFingerprintPart(deviation.blueprint_value),
  ].join("|");
}

function normalizeFingerprintPart(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export async function getDeviationReports(
  storyId: string,
  options?: { status?: DeviationStatus; type?: DeviationType; beatId?: string },
): Promise<DeviationReport[]> {
  const supabase = await createClient();
  let query = supabase
    .from("story_deviation_reports")
    .select("*")
    .eq("story_id", storyId)
    .order("created_at", { ascending: false });

  if (options?.status) query = query.eq("status", options.status);
  if (options?.type) query = query.eq("deviation_type", options.type);
  if (options?.beatId) query = query.eq("beat_id", options.beatId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapDeviationReport);
}

export async function updateDeviationStatus(
  storyId: string,
  reportId: string,
  status: DeviationStatus,
): Promise<DeviationReport | null> {
  const supabase = await createClient();
  const updateData: Record<string, unknown> = { status };
  if (status !== "pending") {
    updateData.resolved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("story_deviation_reports")
    .update(updateData)
    .eq("id", reportId)
    .eq("story_id", storyId)
    .select("*")
    .single();

  if (error) throw error;
  return data ? mapDeviationReport(data) : null;
}

export async function updateDeviationSuggestion(
  reportId: string,
  suggestion: string,
  storyId?: string,
): Promise<void> {
  const supabase = await createClient();
  let query = supabase
    .from("story_deviation_reports")
    .update({ ai_suggestion: suggestion })
    .eq("id", reportId);

  if (storyId) query = query.eq("story_id", storyId);

  const { error } = await query;
  if (error) throw error;
}

export async function getDeviationStats(
  storyId: string,
): Promise<{ pending: number; total: number; byType: Record<string, number> }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("story_deviation_reports")
    .select("status, deviation_type")
    .eq("story_id", storyId);

  if (error) throw error;

  const rows = data ?? [];
  const byType: Record<string, number> = {};
  let pending = 0;

  for (const row of rows) {
    const type = row.deviation_type as string;
    byType[type] = (byType[type] ?? 0) + 1;
    if (row.status === "pending") pending++;
  }

  return { pending, total: rows.length, byType };
}
