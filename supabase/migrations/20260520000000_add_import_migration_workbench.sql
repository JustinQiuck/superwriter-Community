-- Import migration workbench
-- Stores dashboard-level manuscript imports, review candidates, and idempotent apply records.

CREATE TABLE import_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (
    status IN (
      'uploaded',
      'parsed',
      'sections_confirmed',
      'analyzing',
      'ready_for_review',
      'applying',
      'completed',
      'failed',
      'cancelled'
    )
  ),
  current_step TEXT NOT NULL DEFAULT 'file' CHECK (
    current_step IN ('file', 'sections', 'analysis', 'review', 'apply')
  ),
  source_filename TEXT NOT NULL,
  source_file_type TEXT NOT NULL CHECK (source_file_type IN ('txt', 'md', 'docx')),
  source_file_size INTEGER NOT NULL DEFAULT 0 CHECK (source_file_size >= 0),
  source_word_count INTEGER NOT NULL DEFAULT 0 CHECK (source_word_count >= 0),
  inferred_title TEXT,
  created_story_id UUID REFERENCES stories(id) ON DELETE SET NULL,
  apply_started_at TIMESTAMPTZ,
  apply_completed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE import_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('txt', 'md', 'docx')),
  file_hash TEXT NOT NULL,
  raw_text TEXT,
  raw_text_deleted_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE import_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES import_documents(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL CHECK (
    section_type IN ('chapter', 'prologue', 'note', 'appendix', 'unknown')
  ),
  title TEXT,
  volume_title TEXT,
  content TEXT,
  content_deleted_at TIMESTAMPTZ,
  word_count INTEGER NOT NULL DEFAULT 0 CHECK (word_count >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'confirmed', 'ignored')
  ),
  analysis_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    analysis_status IN ('pending', 'running', 'succeeded', 'failed', 'skipped')
  ),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE import_analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
  section_id UUID REFERENCES import_sections(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (
    job_type IN (
      'chapter_summary',
      'asset_extraction',
      'relationship_extraction',
      'aggregate_summary',
      'blueprint_inference'
    )
  ),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'running', 'succeeded', 'failed', 'skipped')
  ),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
  depends_on_job_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  raw_output JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE import_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
  candidate_type TEXT NOT NULL CHECK (
    candidate_type IN (
      'story_summary',
      'character',
      'location',
      'relationship',
      'blueprint',
      'blueprint_beat',
      'blueprint_chapter'
    )
  ),
  name TEXT,
  summary TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence REAL NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'accepted', 'ignored', 'merged', 'applied')
  ),
  source_section_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  merged_into_candidate_id UUID REFERENCES import_candidates(id) ON DELETE SET NULL,
  applied_target_type TEXT,
  applied_target_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE import_candidate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
  from_candidate_id UUID NOT NULL REFERENCES import_candidates(id) ON DELETE CASCADE,
  to_candidate_id UUID NOT NULL REFERENCES import_candidates(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE import_applied_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id UUID,
  candidate_id UUID REFERENCES import_candidates(id) ON DELETE SET NULL,
  target_table TEXT NOT NULL,
  target_id UUID NOT NULL,
  operation_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_import_sessions_user_status_updated
  ON import_sessions(user_id, status, updated_at DESC);

CREATE INDEX idx_import_sections_session_sort
  ON import_sections(session_id, sort_order);

CREATE INDEX idx_import_jobs_session_status
  ON import_analysis_jobs(session_id, status, created_at);

CREATE UNIQUE INDEX idx_import_jobs_unique_scope
  ON import_analysis_jobs(
    session_id,
    COALESCE(section_id, '00000000-0000-0000-0000-000000000000'::uuid),
    job_type
  );

CREATE INDEX idx_import_candidates_session_type_status
  ON import_candidates(session_id, candidate_type, status);

CREATE UNIQUE INDEX idx_import_applied_records_operation_key
  ON import_applied_records(operation_key);

CREATE UNIQUE INDEX idx_import_applied_records_source_target
  ON import_applied_records(session_id, source_type, source_id, target_table);

CREATE UNIQUE INDEX idx_import_applied_records_source_target_null_source
  ON import_applied_records(session_id, source_type, target_table)
  WHERE source_id IS NULL;

ALTER TABLE import_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_candidate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_applied_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own import sessions"
  ON import_sessions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own import documents"
  ON import_documents
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own import sections"
  ON import_sections
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own import analysis jobs"
  ON import_analysis_jobs
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own import candidates"
  ON import_candidates
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own import candidate links"
  ON import_candidate_links
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own import applied records"
  ON import_applied_records
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_import_sessions_updated_at
  BEFORE UPDATE ON import_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_import_sections_updated_at
  BEFORE UPDATE ON import_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_import_analysis_jobs_updated_at
  BEFORE UPDATE ON import_analysis_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_import_candidates_updated_at
  BEFORE UPDATE ON import_candidates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
