export const IMPORT_SESSION_STATUSES = [
  "uploaded",
  "parsed",
  "sections_confirmed",
  "analyzing",
  "ready_for_review",
  "applying",
  "completed",
  "failed",
  "cancelled",
] as const;

export const IMPORT_SECTION_TYPES = [
  "chapter",
  "prologue",
  "note",
  "appendix",
  "unknown",
] as const;

export const IMPORT_SECTION_STATUSES = ["pending", "confirmed", "ignored"] as const;

export const IMPORT_ANALYSIS_STATUSES = [
  "pending",
  "running",
  "succeeded",
  "failed",
  "skipped",
] as const;

export const IMPORT_JOB_TYPES = [
  "chapter_summary",
  "asset_extraction",
  "relationship_extraction",
  "aggregate_summary",
  "blueprint_inference",
] as const;

export const IMPORT_CANDIDATE_TYPES = [
  "story_summary",
  "character",
  "location",
  "relationship",
  "blueprint",
  "blueprint_beat",
  "blueprint_chapter",
] as const;

export const IMPORT_CANDIDATE_STATUSES = [
  "pending",
  "accepted",
  "ignored",
  "merged",
  "applied",
] as const;

export type ImportSessionStatus =
  | "uploaded"
  | "parsed"
  | "sections_confirmed"
  | "analyzing"
  | "ready_for_review"
  | "applying"
  | "completed"
  | "failed"
  | "cancelled";

export type ImportSectionType = "chapter" | "prologue" | "note" | "appendix" | "unknown";
export type ImportSectionStatus = "pending" | "confirmed" | "ignored";
export type ImportAnalysisStatus = "pending" | "running" | "succeeded" | "failed" | "skipped";

export type ImportJobType =
  | "chapter_summary"
  | "asset_extraction"
  | "relationship_extraction"
  | "aggregate_summary"
  | "blueprint_inference";

export type ImportCandidateType =
  | "story_summary"
  | "character"
  | "location"
  | "relationship"
  | "blueprint"
  | "blueprint_beat"
  | "blueprint_chapter";

export type ImportCandidateStatus = "pending" | "accepted" | "ignored" | "merged" | "applied";

export type ImportCurrentStep = "file" | "sections" | "analysis" | "review" | "apply";
export type ImportSourceFileType = "txt" | "md" | "docx";

export interface ImportSession {
  id: string;
  user_id: string;
  status: ImportSessionStatus;
  current_step: ImportCurrentStep;
  source_filename: string;
  source_file_type: ImportSourceFileType;
  source_file_size: number;
  source_word_count: number;
  inferred_title: string | null;
  created_story_id: string | null;
  apply_started_at: string | null;
  apply_completed_at: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ImportDocument {
  id: string;
  user_id: string;
  session_id: string;
  filename: string;
  file_type: ImportSourceFileType;
  file_hash: string;
  raw_text: string | null;
  raw_text_deleted_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ImportSection {
  id: string;
  user_id: string;
  session_id: string;
  document_id: string;
  section_type: ImportSectionType;
  title: string | null;
  volume_title: string | null;
  content: string | null;
  content_deleted_at: string | null;
  word_count: number;
  sort_order: number;
  status: ImportSectionStatus;
  analysis_status: ImportAnalysisStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ImportAnalysisJob {
  id: string;
  user_id: string;
  session_id: string;
  section_id: string | null;
  job_type: ImportJobType;
  status: ImportAnalysisStatus;
  attempts: number;
  max_attempts: number;
  depends_on_job_ids: string[];
  locked_at: string | null;
  locked_by: string | null;
  next_attempt_at: string | null;
  raw_output: Record<string, unknown> | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportCandidate {
  id: string;
  user_id: string;
  session_id: string;
  candidate_type: ImportCandidateType;
  name: string | null;
  summary: string | null;
  payload: Record<string, unknown>;
  confidence: number;
  status: ImportCandidateStatus;
  source_section_ids: string[];
  merged_into_candidate_id: string | null;
  applied_target_type: string | null;
  applied_target_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportCandidateLink {
  id: string;
  user_id: string;
  session_id: string;
  from_candidate_id: string;
  to_candidate_id: string;
  link_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ImportAppliedRecord {
  id: string;
  user_id: string;
  session_id: string;
  source_type: string;
  source_id: string | null;
  candidate_id: string | null;
  target_table: string;
  target_id: string;
  operation_key: string;
  created_at: string;
}
