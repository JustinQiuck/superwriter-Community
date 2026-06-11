-- Harden import analysis retries against stale workers and make rebuild atomic.

ALTER TABLE import_analysis_jobs
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION rebuild_import_analysis(p_session_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM import_candidates
  WHERE session_id = p_session_id;

  DELETE FROM import_analysis_jobs
  WHERE session_id = p_session_id;

  UPDATE import_sections
  SET
    status = 'confirmed',
    analysis_status = 'pending'
  WHERE session_id = p_session_id
    AND section_type IN ('chapter', 'prologue', 'unknown')
    AND status <> 'ignored';
END;
$$;

CREATE OR REPLACE FUNCTION complete_import_analysis_job_success(
  p_job_id UUID,
  p_worker_id TEXT,
  p_attempts INTEGER,
  p_raw_output JSONB,
  p_candidates JSONB DEFAULT '[]'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_job import_analysis_jobs%ROWTYPE;
  v_candidate JSONB;
BEGIN
  SELECT *
  INTO v_job
  FROM import_analysis_jobs
  WHERE id = p_job_id
    AND status = 'running'
    AND locked_by = p_worker_id
    AND attempts = p_attempts
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  FOR v_candidate IN
    SELECT item.value
    FROM jsonb_array_elements(COALESCE(p_candidates, '[]'::jsonb)) AS item(value)
  LOOP
    INSERT INTO import_candidates (
      user_id,
      session_id,
      candidate_type,
      name,
      summary,
      payload,
      confidence,
      source_section_ids,
      status
    )
    VALUES (
      v_job.user_id,
      v_job.session_id,
      v_candidate ->> 'candidate_type',
      NULLIF(v_candidate ->> 'name', ''),
      NULLIF(v_candidate ->> 'summary', ''),
      COALESCE(v_candidate -> 'payload', '{}'::jsonb),
      COALESCE((v_candidate ->> 'confidence')::real, 0.7),
      ARRAY(
        SELECT section_id.value::uuid
        FROM jsonb_array_elements_text(
          COALESCE(v_candidate -> 'source_section_ids', '[]'::jsonb)
        ) AS section_id(value)
      ),
      'pending'
    );
  END LOOP;

  UPDATE import_analysis_jobs
  SET
    status = 'succeeded',
    raw_output = p_raw_output,
    error_message = NULL,
    locked_at = NULL,
    locked_by = NULL,
    next_attempt_at = NULL,
    completed_at = NOW()
  WHERE id = v_job.id;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION complete_import_analysis_job_failure(
  p_job_id UUID,
  p_worker_id TEXT,
  p_attempts INTEGER,
  p_error_message TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated_id UUID;
BEGIN
  UPDATE import_analysis_jobs
  SET
    status = 'failed',
    error_message = p_error_message,
    locked_at = NULL,
    locked_by = NULL,
    next_attempt_at = NULL,
    completed_at = NOW()
  WHERE id = p_job_id
    AND status = 'running'
    AND locked_by = p_worker_id
    AND attempts = p_attempts
  RETURNING id INTO v_updated_id;

  RETURN v_updated_id IS NOT NULL;
END;
$$;
