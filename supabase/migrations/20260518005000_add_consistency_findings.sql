-- Memory consistency findings
-- Persists cross-memory contradictions and reviewable consistency scan output.

DO $$
BEGIN
  CREATE TYPE consistency_finding_type AS ENUM (
    'contradiction',
    'missing_detail',
    'timeline_conflict',
    'tone_drift',
    'promise_unresolved'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE consistency_finding_severity AS ENUM ('low', 'medium', 'high');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE consistency_finding_status AS ENUM (
    'open',
    'accepted',
    'dismissed',
    'resolved'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS consistency_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES entities(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL CHECK (
    source_type IN ('ai_generation', 'chapter_scan', 'manual', 'memory_inbox')
  ),
  source_id UUID,
  source_route_key TEXT,
  source_ref TEXT,
  type consistency_finding_type NOT NULL,
  severity consistency_finding_severity NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggestion TEXT,
  memory_key TEXT,
  memory_value TEXT,
  status consistency_finding_status NOT NULL DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consistency_findings_story_status_created
  ON consistency_findings(story_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_consistency_findings_story_chapter_status_created
  ON consistency_findings(story_id, chapter_id, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_consistency_findings_idempotent_source
  ON consistency_findings(story_id, source_type, source_id, type, title)
  WHERE source_id IS NOT NULL;

ALTER TABLE consistency_findings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own consistency findings" ON consistency_findings;
CREATE POLICY "Users can manage own consistency findings"
  ON consistency_findings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = consistency_findings.story_id
        AND stories.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = consistency_findings.story_id
        AND stories.user_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS set_consistency_findings_updated_at ON consistency_findings;
CREATE TRIGGER set_consistency_findings_updated_at
  BEFORE UPDATE ON consistency_findings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
