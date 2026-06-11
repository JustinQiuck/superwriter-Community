ALTER TABLE ai_generations
  ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES entities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS applied_target JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ;

ALTER TABLE ai_generations
  DROP CONSTRAINT IF EXISTS ai_generations_source_check,
  ADD CONSTRAINT ai_generations_source_check
    CHECK (source IN ('free_chat', 'quick_action', 'editor_selection', 'blueprint', 'unknown'));

ALTER TABLE ai_generations
  DROP CONSTRAINT IF EXISTS ai_generations_content_type_check,
  ADD CONSTRAINT ai_generations_content_type_check
    CHECK (content_type IN ('draft', 'dialogue', 'setting', 'plot', 'inspiration', 'analysis', 'title', 'summary', 'chat'));

ALTER TABLE ai_generations
  DROP CONSTRAINT IF EXISTS ai_generations_status_check,
  ADD CONSTRAINT ai_generations_status_check
    CHECK (status IN ('pending', 'applied', 'saved', 'discarded'));

UPDATE ai_generations
SET
  chapter_id = (
    SELECT entities.id
    FROM entities
    WHERE entities.id = ai_generations.context_entity_ids[1]
      AND entities.story_id = ai_generations.story_id
      AND entities.type = 'chapter'
    LIMIT 1
  ),
  source = CASE WHEN mode = 'free_chat' THEN 'free_chat' ELSE 'quick_action' END,
  content_type = CASE
    WHEN mode = 'free_chat' THEN 'chat'
    WHEN mode = 'character_dialogue' THEN 'dialogue'
    WHEN mode IN ('voice_check', 'chapter_drift_check', 'chapter_completion_review', 'foreshadowing_check', 'consistency_check') THEN 'analysis'
    WHEN mode IN ('character_generate', 'location_generate', 'relationship_suggest', 'timeline_fill', 'information_track', 'story_asset_needs') THEN 'setting'
    WHEN mode IN ('event_suggest', 'outline_generate', 'synopsis_candidates', 'blueprint_generate', 'blueprint_expand', 'story_outline_generate', 'blueprint_reverse_sync', 'beat_suggest', 'deviation_suggest', 'arc_suggest', 'foreshadowing_suggest') THEN 'plot'
    ELSE 'draft'
  END,
  status = CASE
    WHEN accepted IS TRUE THEN 'applied'
    WHEN accepted IS FALSE THEN 'discarded'
    WHEN mode = 'free_chat' THEN 'saved'
    WHEN mode IN ('chapter_continue', 'chapter_rewrite', 'sensory_expand', 'conflict_intensify', 'pacing_tighten', 'hook_boost', 'character_dialogue') THEN 'pending'
    ELSE 'saved'
  END
WHERE applied_target = '{}'::jsonb
  AND applied_at IS NULL
  AND source = 'unknown'
  AND NOT EXISTS (
    SELECT 1
    FROM supabase_migrations.schema_migrations
    WHERE version = '20260513000000'
  );

CREATE INDEX IF NOT EXISTS idx_ai_generations_artifact_workbench
  ON ai_generations(user_id, story_id, chapter_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_generations_artifact_type
  ON ai_generations(user_id, story_id, content_type, created_at DESC);
