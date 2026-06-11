-- SuperWriter Deviation Detection System
-- Phase 3: Story self-awareness — blueprint vs actual comparison

CREATE TYPE deviation_type AS ENUM (
  'emotion',
  'character_absence',
  'pacing',
  'setting_contradiction'
);

CREATE TYPE deviation_severity AS ENUM (
  'low',
  'medium',
  'high'
);

CREATE TYPE deviation_status AS ENUM (
  'pending',
  'ignored',
  'fixed'
);

CREATE TABLE story_deviation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  beat_id UUID,

  deviation_type deviation_type NOT NULL,
  severity deviation_severity NOT NULL DEFAULT 'medium',

  blueprint_value TEXT NOT NULL DEFAULT '',
  actual_value TEXT NOT NULL DEFAULT '',
  ai_suggestion TEXT,

  status deviation_status NOT NULL DEFAULT 'pending',
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deviation_story_status ON story_deviation_reports(story_id, status);
CREATE INDEX idx_deviation_story_created ON story_deviation_reports(story_id, created_at DESC);
CREATE INDEX idx_deviation_story_type ON story_deviation_reports(story_id, deviation_type);

ALTER TABLE story_deviation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view deviation reports in their stories"
  ON story_deviation_reports FOR SELECT
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

CREATE POLICY "Users can create deviation reports in their stories"
  ON story_deviation_reports FOR INSERT
  WITH CHECK (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

CREATE POLICY "Users can update deviation reports in their stories"
  ON story_deviation_reports FOR UPDATE
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete deviation reports in their stories"
  ON story_deviation_reports FOR DELETE
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));
