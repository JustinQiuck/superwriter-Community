import { generateText, type LanguageModel } from "ai";

import { resolveAIModelRoute } from "@/lib/ai/model-registry";
import { getModel } from "@/lib/ai/providers";
import {
  calculateImportProgress,
  claimNextImportJobs,
  completeImportJobFailed,
  completeImportJobSucceeded,
  createAnalysisJobs,
  getImportCandidates,
  getImportJobs,
  getImportSections,
  getImportSessionById,
  resetStaleRunningImportJobsForRetry,
  scheduleImportJobRetry,
  type CreateImportCandidateInput,
  type ImportProgress,
} from "@/lib/db/queries/imports";
import {
  parseAggregateAnalysisJson,
  parseBlueprintAnalysisJson,
  parseChapterAnalysisJson,
  type CandidateDraft,
} from "@/lib/import/candidate-schemas";
import {
  buildAggregateAnalysisPrompt,
  buildBlueprintInferencePrompt,
  buildChapterAnalysisPrompt,
} from "@/lib/import/prompts";
import { resolveEffectivePlan } from "@/lib/db/queries/plans";
import { createClient } from "@/lib/supabase/server";
import type {
  ImportAnalysisJob,
  ImportCandidate,
  ImportJobType,
  ImportSection,
} from "@/types/import";

const PER_SECTION_JOB_TYPES: ImportJobType[] = [
  "chapter_summary",
  "asset_extraction",
  "relationship_extraction",
];
const COMPLETE_STATUSES = new Set(["succeeded", "skipped", "failed"]);
const MIGRATABLE_SECTION_TYPES = new Set(["chapter", "prologue", "unknown"]);
const RATE_LIMIT_RETRY_BASE_MS = 60 * 1000;
const RATE_LIMIT_RETRY_MAX_MS = 10 * 60 * 1000;

export async function ensureImportAnalysisJobs(
  sessionId: string,
): Promise<ImportAnalysisJob[]> {
  const session = await getImportSessionById(sessionId);
  if (!session) throw new Error("Import session not found");

  const sections = await getImportSections(sessionId);
  const confirmedSections = confirmedImportSections(sections);
  let jobs = await getImportJobs(sessionId);
  if (confirmedSections.length === 0) return [];

  const missingPerSectionJobs = confirmedSections.flatMap((section) =>
    PER_SECTION_JOB_TYPES
      .filter((jobType) => !findJob(jobs, jobType, section.id))
      .map((jobType) => ({
        session_id: sessionId,
        section_id: section.id,
        job_type: jobType,
        user_id: session.user_id,
      }))
  );

  if (missingPerSectionJobs.length > 0) {
    await createAnalysisJobs(missingPerSectionJobs);
    jobs = await getImportJobs(sessionId);
  }

  const perSectionJobIds = confirmedSections.flatMap((section) =>
    PER_SECTION_JOB_TYPES
      .map((jobType) => findJob(jobs, jobType, section.id)?.id)
      .filter((id): id is string => Boolean(id))
  );

  let aggregateJob = findJob(jobs, "aggregate_summary", null);
  if (!aggregateJob) {
    await createAnalysisJobs([{
      session_id: sessionId,
      section_id: null,
      job_type: "aggregate_summary",
      depends_on_job_ids: perSectionJobIds,
      user_id: session.user_id,
    }]);
    jobs = await getImportJobs(sessionId);
    aggregateJob = findJob(jobs, "aggregate_summary", null);
  }

  if (!findJob(jobs, "blueprint_inference", null)) {
    await createAnalysisJobs([{
      session_id: sessionId,
      section_id: null,
      job_type: "blueprint_inference",
      depends_on_job_ids: aggregateJob ? [aggregateJob.id] : [],
      user_id: session.user_id,
    }]);
    jobs = await getImportJobs(sessionId);
  }

  return getImportJobs(sessionId);
}

export async function processImportAnalysisBatch(input: {
  sessionId: string;
  workerId: string;
  limit?: number;
}): Promise<{
  processed: number;
  progress: ImportProgress;
  readyForReview: boolean;
}> {
  await resetStaleRunningImportJobsForRetry(input.sessionId);
  const claimedJobs = await claimNextImportJobs(
    input.sessionId,
    input.limit ?? 3,
    input.workerId,
  );

  for (const job of claimedJobs) {
    await processJob(input.sessionId, job, input.workerId);
  }

  const jobs = await getImportJobs(input.sessionId);
  const progress = calculateImportProgress(jobs);
  return {
    processed: claimedJobs.length,
    progress,
    readyForReview: jobs.length > 0 && jobs.every((job) => COMPLETE_STATUSES.has(job.status)),
  };
}

export async function generateImportAnalysisText(
  prompt: string,
  userId: string,
): Promise<string> {
  const model = await resolveImportAnalysisModel(userId);
  const { text } = await generateText({
    model,
    prompt,
  });
  return text;
}

export async function resolveImportAnalysisModel(userId: string): Promise<LanguageModel> {
  const supabase = await createClient();
  const { effectivePlan } = await resolveEffectivePlan(supabase, userId);
  const resolvedRoute = await resolveAIModelRoute({
    routeKey: "import_migration_analyze",
    plan: effectivePlan,
    capability: "analysis",
    callScope: "user_plan_scoped",
  });
  return getModel(resolvedRoute) as LanguageModel;
}

async function processJob(
  sessionId: string,
  job: ImportAnalysisJob,
  workerId: string,
): Promise<void> {
  try {
    const session = await getImportSessionById(sessionId);
    if (!session) throw new Error("Import session not found");

    const sections = await getImportSections(sessionId);
    const candidates = await getImportCandidates(sessionId);
    const prompt = buildPromptForJob(job, session, sections, candidates);
    const text = await generateImportAnalysisText(prompt, session.user_id);
    const drafts = parseCandidatesForJob(job, text, sections);

    await completeImportJobSucceeded({
      jobId: job.id,
      workerId,
      attempts: job.attempts,
      rawOutput: { text },
      candidates: drafts.map(toCreateCandidateInput),
    });
  } catch (error) {
    if (isRateLimitError(error)) {
      await scheduleImportJobRetry({
        jobId: job.id,
        workerId,
        attempts: job.attempts,
        message: "模型服务繁忙，系统稍后会自动继续分析",
        retryAfterMs: rateLimitRetryAfterMs(job.attempts),
      });
      return;
    }

    const message = error instanceof Error ? error.message : "Import analysis job failed";
    await completeImportJobFailed({
      jobId: job.id,
      workerId,
      attempts: job.attempts,
      message,
    });
  }
}

function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  return (
    normalized.includes("too many requests") ||
    normalized.includes("rate limit") ||
    normalized.includes("rate_limit") ||
    normalized.includes("status code: 429") ||
    normalized.includes("status: 429") ||
    /\b429\b/.test(normalized)
  );
}

function rateLimitRetryAfterMs(attempts: number): number {
  const exponent = Math.max(0, Math.min(4, attempts - 1));
  return Math.min(RATE_LIMIT_RETRY_MAX_MS, RATE_LIMIT_RETRY_BASE_MS * 2 ** exponent);
}

function buildPromptForJob(
  job: ImportAnalysisJob,
  session: NonNullable<Awaited<ReturnType<typeof getImportSessionById>>>,
  sections: ImportSection[],
  candidates: ImportCandidate[],
): string {
  if (job.section_id) {
    const section = sections.find((item) => item.id === job.section_id);
    if (!section) throw new Error("Import section not found");
    if (!section.content) throw new Error("Import section content has been cleared");
    return buildChapterAnalysisPrompt(section);
  }

  if (job.job_type === "aggregate_summary") {
    return buildAggregateAnalysisPrompt(confirmedImportSections(sections), candidates);
  }

  if (job.job_type === "blueprint_inference") {
    return buildBlueprintInferencePrompt(session, confirmedImportSections(sections), candidates);
  }

  throw new Error(`Unsupported import analysis job type: ${job.job_type}`);
}

function parseCandidatesForJob(
  job: ImportAnalysisJob,
  text: string,
  sections: ImportSection[],
): CandidateDraft[] {
  if (job.section_id) {
    const section = sections.find((item) => item.id === job.section_id);
    const parsed = parseChapterAnalysisJson(text, [job.section_id]);
    const summaryDraft: CandidateDraft = {
      candidate_type: "story_summary",
      name: section?.title ?? "章节摘要",
      summary: parsed.summary,
      payload: {
        summary: parsed.summary,
        key_events: parsed.keyEvents,
        job_type: job.job_type,
      },
      confidence: 1,
      source_section_ids: [job.section_id],
    };

    if (job.job_type === "chapter_summary") {
      return [summaryDraft];
    }
    if (job.job_type === "asset_extraction") {
      return parsed.candidates.filter((candidate) =>
        candidate.candidate_type === "character" || candidate.candidate_type === "location"
      );
    }
    if (job.job_type === "relationship_extraction") {
      return parsed.candidates.filter((candidate) => candidate.candidate_type === "relationship");
    }
    return [];
  }

  const sourceSectionIds = confirmedImportSections(sections).map((section) => section.id);
  if (job.job_type === "aggregate_summary") {
    return parseAggregateAnalysisJson(text, sourceSectionIds);
  }
  if (job.job_type === "blueprint_inference") {
    return parseBlueprintAnalysisJson(text, sourceSectionIds);
  }
  return [];
}

function toCreateCandidateInput(draft: CandidateDraft): CreateImportCandidateInput {
  return {
    candidate_type: draft.candidate_type,
    name: draft.name,
    summary: draft.summary,
    payload: draft.payload,
    confidence: draft.confidence,
    source_section_ids: draft.source_section_ids,
  };
}

function findJob(
  jobs: ImportAnalysisJob[],
  jobType: ImportJobType,
  sectionId: string | null,
): ImportAnalysisJob | undefined {
  return jobs.find((job) =>
    job.job_type === jobType && (job.section_id ?? null) === sectionId
  );
}

function confirmedImportSections(sections: ImportSection[]): ImportSection[] {
  return sections.filter((section) =>
    section.status === "confirmed" && MIGRATABLE_SECTION_TYPES.has(section.section_type)
  );
}
