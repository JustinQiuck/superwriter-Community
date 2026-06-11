import { countChineseWords, type DraftImportSection } from "@/lib/import/chapter-splitter";
import { createClient } from "@/lib/supabase/server";
import type {
  ImportAnalysisJob,
  ImportAnalysisStatus,
  ImportAppliedRecord,
  ImportCandidate,
  ImportCandidateType,
  ImportCandidateStatus,
  ImportDocument,
  ImportJobType,
  ImportSection,
  ImportSectionStatus,
  ImportSectionType,
  ImportSession,
  ImportSessionStatus,
  ImportSourceFileType,
  ImportCurrentStep,
} from "@/types/import";

export const IMPORT_RUNNING_JOB_STALE_AFTER_MS = 5 * 60 * 1000;

export interface ImportProgress {
  completed: number;
  total: number;
  percent: number;
}

export interface CreateImportSessionInput {
  source_filename: string;
  source_file_type: ImportSourceFileType;
  source_file_size: number;
  inferred_title?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateImportSessionInput {
  status?: ImportSessionStatus;
  current_step?: ImportCurrentStep;
  source_word_count?: number;
  inferred_title?: string | null;
  created_story_id?: string | null;
  apply_started_at?: string | null;
  apply_completed_at?: string | null;
  error_message?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CreateImportDocumentInput {
  session_id: string;
  filename: string;
  file_type: ImportSourceFileType;
  file_hash: string;
  raw_text: string;
  metadata?: Record<string, unknown>;
  user_id?: string;
}

export interface UpdateImportSectionInput {
  id?: string;
  document_id?: string;
  section_type: ImportSectionType;
  title: string | null;
  volume_title?: string | null;
  content: string | null;
  sort_order: number;
  status: ImportSectionStatus;
  metadata?: Record<string, unknown>;
}

export interface CreateImportJobInput {
  session_id: string;
  section_id?: string | null;
  job_type: ImportJobType;
  depends_on_job_ids?: string[];
  max_attempts?: number;
  user_id?: string;
}

export interface CreateImportCandidateInput {
  candidate_type: ImportCandidateType;
  name: string | null;
  summary?: string | null;
  payload?: Record<string, unknown>;
  confidence?: number;
  source_section_ids?: string[];
  user_id?: string;
}

export interface CompleteImportJobSucceededInput {
  jobId: string;
  workerId: string;
  attempts: number;
  rawOutput: unknown;
  candidates: CreateImportCandidateInput[];
}

export interface CompleteImportJobFailedInput {
  jobId: string;
  workerId: string;
  attempts: number;
  message: string;
}

export interface ScheduleImportJobRetryInput {
  jobId: string;
  workerId: string;
  attempts: number;
  message: string;
  retryAfterMs: number;
}

export interface UpdateImportCandidateInput {
  id: string;
  status?: ImportCandidateStatus;
  name?: string | null;
  summary?: string | null;
  merged_into_candidate_id?: string | null;
}

export interface CreateImportAppliedRecordInput {
  session_id: string;
  source_type: string;
  source_id?: string | null;
  candidate_id?: string | null;
  target_table: string;
  target_id: string;
  operation_key: string;
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export function calculateImportProgress(
  jobs: Pick<ImportAnalysisJob, "status">[],
): ImportProgress {
  const total = jobs.length;
  if (total === 0) return { completed: 0, total: 0, percent: 0 };

  const completed = jobs.filter((job) =>
    job.status === "succeeded" || job.status === "skipped" || job.status === "failed",
  ).length;

  return {
    completed,
    total,
    percent: Math.round((completed / total) * 100),
  };
}

export function buildImportOperationKey(
  sessionId: string,
  sourceType: string,
  sourceId: string,
  targetTable: string,
): string {
  return [sessionId, sourceType, sourceId, targetTable].join(":");
}

export async function getImportSessions(): Promise<ImportSession[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("import_sessions")
    .select("*")
    .order("updated_at", { ascending: false });

  return (data ?? []) as ImportSession[];
}

export async function getImportSessionById(
  sessionId: string,
): Promise<ImportSession | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("import_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  return data as ImportSession | null;
}

export async function createImportSession(
  input: CreateImportSessionInput,
): Promise<ImportSession> {
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);

  const { data, error } = await supabase
    .from("import_sessions")
    .insert({
      ...input,
      user_id: userId,
      metadata: input.metadata ?? {},
    })
    .select()
    .single();

  if (error) throw error;
  return data as ImportSession;
}

export async function updateImportSession(
  sessionId: string,
  input: UpdateImportSessionInput,
): Promise<ImportSession> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("import_sessions")
    .update(input)
    .eq("id", sessionId)
    .select()
    .single();

  if (error) throw error;
  return data as ImportSession;
}

export async function createImportDocument(
  input: CreateImportDocumentInput,
): Promise<ImportDocument> {
  const supabase = await createClient();
  const userId = input.user_id ?? await getAuthenticatedUserId(supabase);

  const { data, error } = await supabase
    .from("import_documents")
    .insert({
      session_id: input.session_id,
      filename: input.filename,
      file_type: input.file_type,
      file_hash: input.file_hash,
      raw_text: input.raw_text,
      metadata: input.metadata ?? {},
      user_id: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ImportDocument;
}

export async function replaceImportSections(
  sessionId: string,
  sections: DraftImportSection[],
): Promise<ImportSection[]> {
  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("import_sections")
    .delete()
    .eq("session_id", sessionId);
  if (deleteError) throw deleteError;

  if (sections.length === 0) return [];

  const userId = await getAuthenticatedUserId(supabase);
  const documentId = await getSessionDocumentId(supabase, sessionId);

  const rows = sections.map((section) => ({
    user_id: userId,
    session_id: sessionId,
    document_id: documentId,
    section_type: section.section_type,
    title: section.title,
    volume_title: section.volume_title ?? null,
    content: section.content,
    word_count: section.word_count,
    sort_order: section.sort_order,
    status: defaultImportSectionStatus(section.section_type),
    analysis_status: "pending" as const,
    metadata: section.metadata ?? {},
  }));

  const { data, error } = await supabase
    .from("import_sections")
    .insert(rows)
    .select()
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ImportSection[];
}

export async function updateImportSections(
  sessionId: string,
  sections: UpdateImportSectionInput[],
): Promise<ImportSection[]> {
  const supabase = await createClient();
  const submittedIds = new Set(
    sections
      .map((section) => section.id)
      .filter((id): id is string => Boolean(id)),
  );
  const { data: existingRows, error: existingError } = await supabase
    .from("import_sections")
    .select("id")
    .eq("session_id", sessionId);
  if (existingError) throw existingError;

  const existingIds = ((existingRows ?? []) as { id: string }[]).map((row) => row.id);
  const newSections = sections.filter((section) => !section.id);

  for (const section of sections) {
    if (!section.id) continue;

    const { error } = await supabase
      .from("import_sections")
      .update(buildImportSectionUpdate(section))
      .eq("session_id", sessionId)
      .eq("id", section.id);

    if (error) throw error;
  }

  if (newSections.length > 0) {
    const userId = await getAuthenticatedUserId(supabase);
    const documentId = await getSessionDocumentId(supabase, sessionId);
    const rows = newSections.map((section) => ({
      user_id: userId,
      session_id: sessionId,
      document_id: section.document_id ?? documentId,
      ...buildImportSectionUpdate(section),
      analysis_status: "pending" as ImportAnalysisStatus,
    }));

    const { error } = await supabase
      .from("import_sections")
      .insert(rows);

    if (error) throw error;
  }

  const staleIds = existingIds.filter((id) => !submittedIds.has(id));
  if (staleIds.length > 0) {
    const { error } = await supabase
      .from("import_sections")
      .delete()
      .eq("session_id", sessionId)
      .in("id", staleIds);

    if (error) throw error;
  }

  return getImportSections(sessionId);
}

function buildImportSectionUpdate(section: UpdateImportSectionInput) {
  return {
    section_type: section.section_type,
    title: section.title,
    volume_title: section.volume_title ?? null,
    content: section.content,
    word_count: section.content ? countChineseWords(section.content) : 0,
    sort_order: section.sort_order,
    status: section.status,
    metadata: section.metadata ?? {},
  };
}

function defaultImportSectionStatus(sectionType: ImportSectionType): ImportSectionStatus {
  return sectionType === "chapter" || sectionType === "prologue" ? "confirmed" : "pending";
}

export async function getImportSections(
  sessionId: string,
): Promise<ImportSection[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("import_sections")
    .select("*")
    .eq("session_id", sessionId)
    .order("sort_order", { ascending: true });

  return (data ?? []) as ImportSection[];
}

export async function getImportJobs(
  sessionId: string,
): Promise<ImportAnalysisJob[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("import_analysis_jobs")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  return (data ?? []) as ImportAnalysisJob[];
}

export async function getImportCandidates(
  sessionId: string,
): Promise<ImportCandidate[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("import_candidates")
    .select("*")
    .eq("session_id", sessionId)
    .order("candidate_type", { ascending: true })
    .order("name", { ascending: true })
    .order("created_at", { ascending: true });

  return (data ?? []) as ImportCandidate[];
}

export async function updateImportCandidates(
  sessionId: string,
  updates: UpdateImportCandidateInput[],
): Promise<ImportCandidate[]> {
  if (updates.length === 0) return [];

  const supabase = await createClient();
  for (const update of updates) {
    const { id, ...changes } = update;
    const { error } = await supabase
      .from("import_candidates")
      .update(changes)
      .eq("session_id", sessionId)
      .eq("id", id);
    if (error) throw error;
  }

  return getImportCandidates(sessionId);
}

export async function markImportCandidateApplied(
  sessionId: string,
  candidateId: string,
  targetTable: string,
  targetId: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("import_candidates")
    .update({
      status: "applied",
      applied_target_type: targetTable,
      applied_target_id: targetId,
    })
    .eq("session_id", sessionId)
    .eq("id", candidateId);

  if (error) throw error;
}

export async function createImportCandidates(
  sessionId: string,
  input: CreateImportCandidateInput[],
): Promise<ImportCandidate[]> {
  if (input.length === 0) return [];

  const supabase = await createClient();
  const fallbackUserId = input.some((candidate) => !candidate.user_id)
    ? await getAuthenticatedUserId(supabase)
    : null;

  const rows = input.map((candidate) => ({
    user_id: candidate.user_id ?? fallbackUserId,
    session_id: sessionId,
    candidate_type: candidate.candidate_type,
    name: candidate.name,
    summary: candidate.summary ?? null,
    payload: candidate.payload ?? {},
    confidence: candidate.confidence ?? 0.7,
    source_section_ids: candidate.source_section_ids ?? [],
    status: "pending" as const,
  }));

  const { data, error } = await supabase
    .from("import_candidates")
    .insert(rows)
    .select()
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ImportCandidate[];
}

export async function createAnalysisJobs(
  input: CreateImportJobInput[],
): Promise<ImportAnalysisJob[]> {
  if (input.length === 0) return [];

  const supabase = await createClient();
  const fallbackUserId = input.some((job) => !job.user_id)
    ? await getAuthenticatedUserId(supabase)
    : null;

  const created: ImportAnalysisJob[] = [];
  for (const job of input) {
    const { data, error } = await supabase
      .from("import_analysis_jobs")
      .insert({
        user_id: job.user_id ?? fallbackUserId,
        session_id: job.session_id,
        section_id: job.section_id ?? null,
        job_type: job.job_type,
        status: "pending" as const,
        attempts: 0,
        max_attempts: job.max_attempts ?? 3,
        depends_on_job_ids: job.depends_on_job_ids ?? [],
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") continue;
      throw error;
    }
    if (data) created.push(data as ImportAnalysisJob);
  }

  return created;
}

export async function claimNextImportJobs(
  sessionId: string,
  limit: number,
  workerId: string,
): Promise<ImportAnalysisJob[]> {
  if (limit <= 0) return [];

  const supabase = await createClient();
  const jobs = await getImportJobs(sessionId);
  const statusById = new Map(jobs.map((job) => [job.id, job.status]));
  const now = new Date();
  const runnableJobs = jobs
    .filter((job) => job.status === "pending")
    .filter((job) => importJobIsReadyToClaim(job, now))
    .filter((job) => importJobDependenciesAreComplete(job.depends_on_job_ids, statusById))
    .slice(0, limit);

  const claimed: ImportAnalysisJob[] = [];
  for (const job of runnableJobs) {
    const lockedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("import_analysis_jobs")
      .update({
        status: "running",
        attempts: job.attempts + 1,
        locked_at: lockedAt,
        locked_by: workerId,
        next_attempt_at: null,
        error_message: null,
        started_at: job.started_at ?? lockedAt,
      })
      .eq("id", job.id)
      .eq("session_id", sessionId)
      .eq("status", "pending")
      .or(`next_attempt_at.is.null,next_attempt_at.lte.${lockedAt}`)
      .select()
      .maybeSingle();

    if (error) throw error;
    // Another worker may have claimed the guarded pending row first.
    if (data) claimed.push(data as ImportAnalysisJob);
  }

  return claimed;
}

export async function resetFailedImportJobsForRetry(
  sessionId: string,
): Promise<ImportAnalysisJob[]> {
  const jobs = await getImportJobs(sessionId);
  const resetIds = collectImportRetryJobIds(jobs);
  if (resetIds.length === 0) return [];

  const supabase = await createClient();
  const { error } = await supabase
    .from("import_analysis_jobs")
    .update({
      status: "pending",
      locked_at: null,
      locked_by: null,
      next_attempt_at: null,
      raw_output: null,
      error_message: null,
      started_at: null,
      completed_at: null,
    })
    .eq("session_id", sessionId)
    .in("id", resetIds);

  if (error) throw error;
  return getImportJobs(sessionId);
}

export async function rebuildImportAnalysis(
  sessionId: string,
): Promise<ImportSection[]> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("rebuild_import_analysis", {
    p_session_id: sessionId,
  });
  if (error) throw error;

  return getImportSections(sessionId);
}

export async function resetStaleRunningImportJobsForRetry(
  sessionId: string,
  now: Date = new Date(),
): Promise<ImportAnalysisJob[]> {
  const jobs = await getImportJobs(sessionId);
  const retryIds = collectStaleRunningImportRetryJobIds(jobs, now);
  const failedIds = collectStaleRunningImportFailedJobIds(jobs, now);

  if (retryIds.length === 0 && failedIds.length === 0) return jobs;

  const supabase = await createClient();
  if (retryIds.length > 0) {
    const { error } = await supabase
      .from("import_analysis_jobs")
      .update({
        status: "pending",
        locked_at: null,
        locked_by: null,
        next_attempt_at: null,
        error_message: null,
        started_at: null,
        completed_at: null,
      })
      .eq("session_id", sessionId)
      .in("id", retryIds);

    if (error) throw error;
  }

  if (failedIds.length > 0) {
    const { error } = await supabase
      .from("import_analysis_jobs")
      .update({
        status: "failed",
        locked_at: null,
        locked_by: null,
        next_attempt_at: null,
        error_message: "分析任务超时，请重试分析",
        completed_at: now.toISOString(),
      })
      .eq("session_id", sessionId)
      .in("id", failedIds);

    if (error) throw error;
  }

  return getImportJobs(sessionId);
}

export async function completeImportJobSucceeded(
  input: CompleteImportJobSucceededInput,
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("complete_import_analysis_job_success", {
    p_job_id: input.jobId,
    p_worker_id: input.workerId,
    p_attempts: input.attempts,
    p_raw_output: input.rawOutput,
    p_candidates: input.candidates.map((candidate) => ({
      candidate_type: candidate.candidate_type,
      name: candidate.name,
      summary: candidate.summary ?? null,
      payload: candidate.payload ?? {},
      confidence: candidate.confidence ?? 0.7,
      source_section_ids: candidate.source_section_ids ?? [],
    })),
  });

  if (error) throw error;
  return data === true;
}

export async function completeImportJobFailed(
  input: CompleteImportJobFailedInput,
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("complete_import_analysis_job_failure", {
    p_job_id: input.jobId,
    p_worker_id: input.workerId,
    p_attempts: input.attempts,
    p_error_message: input.message,
  });

  if (error) throw error;
  return data === true;
}

export async function scheduleImportJobRetry(
  input: ScheduleImportJobRetryInput,
): Promise<boolean> {
  const retryAt = new Date(Date.now() + input.retryAfterMs).toISOString();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("import_analysis_jobs")
    .update({
      status: "pending",
      locked_at: null,
      locked_by: null,
      next_attempt_at: retryAt,
      error_message: input.message,
      completed_at: null,
    })
    .eq("id", input.jobId)
    .eq("status", "running")
    .eq("locked_by", input.workerId)
    .eq("attempts", input.attempts)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function getImportAppliedRecord(
  operationKey: string,
): Promise<ImportAppliedRecord | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("import_applied_records")
    .select("*")
    .eq("operation_key", operationKey)
    .single();

  return data as ImportAppliedRecord | null;
}

export async function createImportAppliedRecord(
  input: CreateImportAppliedRecordInput,
): Promise<ImportAppliedRecord> {
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);

  const { data, error } = await supabase
    .from("import_applied_records")
    .insert({
      ...input,
      source_id: input.source_id ?? null,
      candidate_id: input.candidate_id ?? null,
      user_id: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ImportAppliedRecord;
}

export async function clearImportSourceText(sessionId: string): Promise<void> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error: documentError } = await supabase
    .from("import_documents")
    .update({
      raw_text: null,
      raw_text_deleted_at: now,
    })
    .eq("session_id", sessionId);
  if (documentError) throw documentError;

  const { error: sectionError } = await supabase
    .from("import_sections")
    .update({
      content: null,
      content_deleted_at: now,
    })
    .eq("session_id", sessionId);
  if (sectionError) throw sectionError;
}

export async function deleteImportSession(sessionId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("import_sessions")
    .delete()
    .eq("id", sessionId);

  if (error) throw error;
}

async function getAuthenticatedUserId(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");
  return user.id;
}

async function getSessionDocumentId(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("import_documents")
    .select("id")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (error) throw error;
  if (!data?.id) throw new Error("Import document not found");
  return data.id as string;
}

export function importJobDependenciesAreComplete(
  dependencyIds: string[],
  statusById: Map<string, ImportAnalysisStatus>,
): boolean {
  return dependencyIds.every((id) => {
    const status = statusById.get(id);
    return status === "succeeded" || status === "skipped" || status === "failed";
  });
}

export function collectImportRetryJobIds(
  jobs: ReadonlyArray<{
    id: string;
    status: ImportAnalysisStatus;
    depends_on_job_ids: readonly string[];
  }>,
): string[] {
  return jobs
    .filter((job) => job.status === "failed")
    .map((job) => job.id);
}

export function collectStaleRunningImportRetryJobIds(
  jobs: ReadonlyArray<{
    id: string;
    status: ImportAnalysisStatus;
    locked_at: string | null;
    attempts: number;
    max_attempts: number;
  }>,
  now: Date = new Date(),
): string[] {
  return collectStaleRunningImportJobIds(jobs, now, "retry");
}

export function collectStaleRunningImportFailedJobIds(
  jobs: ReadonlyArray<{
    id: string;
    status: ImportAnalysisStatus;
    locked_at: string | null;
    attempts: number;
    max_attempts: number;
  }>,
  now: Date = new Date(),
): string[] {
  return collectStaleRunningImportJobIds(jobs, now, "failed");
}

export function importJobIsReadyToClaim(
  job: { next_attempt_at?: string | null },
  now: Date = new Date(),
): boolean {
  if (!job.next_attempt_at) return true;
  const nextAttemptAtMs = Date.parse(job.next_attempt_at);
  return Number.isFinite(nextAttemptAtMs) && nextAttemptAtMs <= now.getTime();
}

function collectStaleRunningImportJobIds(
  jobs: ReadonlyArray<{
    id: string;
    status: ImportAnalysisStatus;
    locked_at: string | null;
    attempts: number;
    max_attempts: number;
  }>,
  now: Date,
  target: "retry" | "failed",
): string[] {
  const nowMs = now.getTime();

  return jobs
    .filter((job) => {
      if (job.status !== "running" || !job.locked_at) return false;
      const lockedAtMs = Date.parse(job.locked_at);
      if (!Number.isFinite(lockedAtMs)) return false;
      if (nowMs - lockedAtMs < IMPORT_RUNNING_JOB_STALE_AFTER_MS) return false;
      return target === "retry"
        ? job.attempts < job.max_attempts
        : job.attempts >= job.max_attempts;
    })
    .map((job) => job.id);
}
