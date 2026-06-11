CREATE TABLE IF NOT EXISTS technique_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  title TEXT NOT NULL,
  source_title TEXT,
  source_hash TEXT NOT NULL,
  source_length INTEGER NOT NULL DEFAULT 0,
  target_story_id UUID REFERENCES stories(id) ON DELETE SET NULL,
  card JSONB NOT NULL,
  application_intents TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT technique_cards_skill_id_check CHECK (
    skill_id IN (
      'chapter_hook',
      'conflict_escalation',
      'satisfaction_pacing',
      'character_desire_chain',
      'reversal_information_gap',
      'emotional_pull',
      'reverse_outline',
      'functional_story_dna'
    )
  ),
  CONSTRAINT technique_cards_source_length_check CHECK (source_length >= 0)
);

CREATE INDEX IF NOT EXISTS idx_technique_cards_user_created
  ON technique_cards(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_technique_cards_user_skill
  ON technique_cards(user_id, skill_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_technique_cards_user_target_story
  ON technique_cards(user_id, target_story_id, created_at DESC)
  WHERE target_story_id IS NOT NULL;

ALTER TABLE technique_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own technique cards"
  ON technique_cards FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own technique cards"
  ON technique_cards FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own technique cards"
  ON technique_cards FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own technique cards"
  ON technique_cards FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_technique_cards_updated_at ON technique_cards;
CREATE TRIGGER set_technique_cards_updated_at
  BEFORE UPDATE ON technique_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
