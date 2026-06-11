-- SuperWriter Memory System
-- Phase 2: Three-layer memory architecture (Core / Archival / Recall)

-- ==========================================
-- VECTOR EXTENSION
-- ==========================================

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- ==========================================
-- ENUMS
-- ==========================================

CREATE TYPE archival_source_type AS ENUM (
  'chapter',
  'entity',
  'interaction'
);

CREATE TYPE recall_operation_type AS ENUM (
  'chapter_save',
  'entity_update',
  'blueprint_change',
  'ai_interaction',
  'preference_change'
);

-- ==========================================
-- CORE MEMORY (1:1 with stories)
-- ==========================================

CREATE TABLE story_core_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE UNIQUE,

  -- 4 information blocks stored as JSONB
  story_settings JSONB NOT NULL DEFAULT '{}',
  current_snapshot JSONB NOT NULL DEFAULT '{}',
  creator_preferences JSONB NOT NULL DEFAULT '{}',
  key_constraints JSONB NOT NULL DEFAULT '[]',

  token_estimate INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_core_memories_story ON story_core_memories(story_id);

ALTER TABLE story_core_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view core memory in their stories"
  ON story_core_memories FOR SELECT
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

CREATE POLICY "Users can create core memory in their stories"
  ON story_core_memories FOR INSERT
  WITH CHECK (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

CREATE POLICY "Users can update core memory in their stories"
  ON story_core_memories FOR UPDATE
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete core memory in their stories"
  ON story_core_memories FOR DELETE
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

-- ==========================================
-- ARCHIVAL MEMORY (vector search)
-- ==========================================

CREATE TABLE story_archival_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,

  source_type archival_source_type NOT NULL,
  source_id UUID NOT NULL,
  segment_index INTEGER NOT NULL DEFAULT 0,

  content TEXT NOT NULL,
  content_embedding vector(1536),

  metadata JSONB NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index for cosine similarity search
CREATE INDEX idx_archival_embedding ON story_archival_memories
  USING hnsw (content_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_archival_story ON story_archival_memories(story_id);
CREATE INDEX idx_archival_source ON story_archival_memories(story_id, source_type, source_id);

ALTER TABLE story_archival_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view archival memory in their stories"
  ON story_archival_memories FOR SELECT
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

CREATE POLICY "Users can create archival memory in their stories"
  ON story_archival_memories FOR INSERT
  WITH CHECK (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

CREATE POLICY "Users can update archival memory in their stories"
  ON story_archival_memories FOR UPDATE
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete archival memory in their stories"
  ON story_archival_memories FOR DELETE
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

-- ==========================================
-- RECALL MEMORY (operation log)
-- ==========================================

CREATE TABLE story_recall_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,

  operation_type recall_operation_type NOT NULL,
  summary TEXT NOT NULL,
  context JSONB NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recall_story ON story_recall_memories(story_id);
CREATE INDEX idx_recall_created ON story_recall_memories(story_id, created_at DESC);

ALTER TABLE story_recall_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recall memory in their stories"
  ON story_recall_memories FOR SELECT
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

CREATE POLICY "Users can create recall memory in their stories"
  ON story_recall_memories FOR INSERT
  WITH CHECK (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete recall memory in their stories"
  ON story_recall_memories FOR DELETE
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

-- ==========================================
-- VECTOR SEARCH RPC FUNCTION
-- ==========================================

CREATE OR REPLACE FUNCTION match_archival_memories(
  p_story_id UUID,
  p_query_embedding vector(1536),
  p_match_threshold FLOAT DEFAULT 0.7,
  p_match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  source_type TEXT,
  source_id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql STABLE SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sam.id,
    sam.source_type::TEXT,
    sam.source_id,
    sam.content,
    sam.metadata,
    1 - (sam.content_embedding <=> p_query_embedding) AS similarity
  FROM story_archival_memories sam
  WHERE sam.story_id = p_story_id
    AND sam.story_id IN (SELECT id FROM stories WHERE user_id = auth.uid())
    AND sam.content_embedding IS NOT NULL
    AND 1 - (sam.content_embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY sam.content_embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$;

-- ==========================================
-- UPDATED_AT TRIGGERS
-- ==========================================

CREATE TRIGGER set_core_memories_updated_at
  BEFORE UPDATE ON story_core_memories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
