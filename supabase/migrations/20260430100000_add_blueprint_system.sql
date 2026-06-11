-- SuperWriter Blueprint System

-- ==========================================
-- ENUMS
-- ==========================================

CREATE TYPE beat_type AS ENUM (
  'setup',
  'inciting_incident',
  'rising_action',
  'midpoint',
  'crisis',
  'climax',
  'falling_action',
  'resolution',
  'turning_point',
  'reveal',
  'custom'
);

CREATE TYPE beat_status AS ENUM (
  'planned',
  'writing',
  'completed'
);

CREATE TYPE narrative_template_type AS ENUM (
  'three_act',
  'heros_journey',
  'save_the_cat',
  'snowflake',
  'seven_point',
  'dan_harmon_story',
  'custom'
);

-- ==========================================
-- STORY TEMPLATES
-- ==========================================

CREATE TABLE story_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_type narrative_template_type NOT NULL,
  is_preset BOOLEAN DEFAULT FALSE,
  beat_definitions JSONB NOT NULL DEFAULT '[]',
  default_settings JSONB DEFAULT '{}',

  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_story_templates_type ON story_templates(template_type);
CREATE INDEX idx_story_templates_user ON story_templates(user_id) WHERE user_id IS NOT NULL;

ALTER TABLE story_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view preset templates"
  ON story_templates FOR SELECT
  USING (is_preset = TRUE);

-- Users can view their own custom templates
CREATE POLICY "Users can view own templates"
  ON story_templates FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own templates
CREATE POLICY "Users can create own templates"
  ON story_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON story_templates FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates"
  ON story_templates FOR DELETE
  USING (auth.uid() = user_id);

-- ==========================================
-- STORY BLUEPRINTS
-- ==========================================

CREATE TABLE story_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  template_id UUID REFERENCES story_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '叙事蓝图',
  synopsis TEXT,
  health_metrics JSONB DEFAULT '{"coverage": 0, "emotion_health": 0, "character_balance": 0, "overall": 0}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id)
);

CREATE INDEX idx_blueprints_story ON story_blueprints(story_id);

ALTER TABLE story_blueprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view blueprints in their stories"
  ON story_blueprints FOR SELECT
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

CREATE POLICY "Users can create blueprints in their stories"
  ON story_blueprints FOR INSERT
  WITH CHECK (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

CREATE POLICY "Users can update blueprints in their stories"
  ON story_blueprints FOR UPDATE
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete blueprints in their stories"
  ON story_blueprints FOR DELETE
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

-- ==========================================
-- BLUEPRINT BEATS
-- ==========================================

CREATE TABLE blueprint_beats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID NOT NULL REFERENCES story_blueprints(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,

  beat_type beat_type NOT NULL DEFAULT 'custom',
  status beat_status NOT NULL DEFAULT 'planned',

  position_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
  emotion_target INTEGER DEFAULT 0 CHECK (emotion_target >= -10 AND emotion_target <= 10),
  suggested_character_ids UUID[] DEFAULT '{}',
  suggested_location_ids UUID[] DEFAULT '{}',
  synopsis TEXT,
  content JSONB DEFAULT '{}',

  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_beats_blueprint ON blueprint_beats(blueprint_id);
CREATE INDEX idx_beats_story ON blueprint_beats(story_id);
CREATE INDEX idx_beats_status ON blueprint_beats(blueprint_id, status);
CREATE INDEX idx_beats_sort ON blueprint_beats(blueprint_id, sort_order);

ALTER TABLE blueprint_beats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view beats in their stories"
  ON blueprint_beats FOR SELECT
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

CREATE POLICY "Users can create beats in their stories"
  ON blueprint_beats FOR INSERT
  WITH CHECK (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

CREATE POLICY "Users can update beats in their stories"
  ON blueprint_beats FOR UPDATE
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete beats in their stories"
  ON blueprint_beats FOR DELETE
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

-- ==========================================
-- BLUEPRINT VOLUMES
-- ==========================================

CREATE TABLE blueprint_volumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID NOT NULL REFERENCES story_blueprints(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  synopsis TEXT,

  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_volumes_blueprint ON blueprint_volumes(blueprint_id);
CREATE INDEX idx_volumes_story ON blueprint_volumes(story_id);

ALTER TABLE blueprint_volumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view volumes in their stories"
  ON blueprint_volumes FOR SELECT
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

CREATE POLICY "Users can create volumes in their stories"
  ON blueprint_volumes FOR INSERT
  WITH CHECK (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

CREATE POLICY "Users can update volumes in their stories"
  ON blueprint_volumes FOR UPDATE
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete volumes in their stories"
  ON blueprint_volumes FOR DELETE
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

-- ==========================================
-- BLUEPRINT CHAPTERS
-- ==========================================

CREATE TABLE blueprint_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volume_id UUID REFERENCES blueprint_volumes(id) ON DELETE CASCADE,
  blueprint_id UUID NOT NULL REFERENCES story_blueprints(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  beat_id UUID REFERENCES blueprint_beats(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  synopsis TEXT,
  target_word_count INTEGER,
  target_emotion INTEGER DEFAULT 0 CHECK (target_emotion >= -10 AND target_emotion <= 10),
  content_guidance JSONB DEFAULT '{}',

  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bp_chapters_blueprint ON blueprint_chapters(blueprint_id);
CREATE INDEX idx_bp_chapters_volume ON blueprint_chapters(volume_id);
CREATE INDEX idx_bp_chapters_beat ON blueprint_chapters(beat_id);
CREATE INDEX idx_bp_chapters_story ON blueprint_chapters(story_id);

ALTER TABLE blueprint_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view blueprint chapters in their stories"
  ON blueprint_chapters FOR SELECT
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

CREATE POLICY "Users can create blueprint chapters in their stories"
  ON blueprint_chapters FOR INSERT
  WITH CHECK (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

CREATE POLICY "Users can update blueprint chapters in their stories"
  ON blueprint_chapters FOR UPDATE
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete blueprint chapters in their stories"
  ON blueprint_chapters FOR DELETE
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

-- ==========================================
-- UPDATED_AT TRIGGERS
-- ==========================================

CREATE TRIGGER set_story_templates_updated_at
  BEFORE UPDATE ON story_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_story_blueprints_updated_at
  BEFORE UPDATE ON story_blueprints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_blueprint_beats_updated_at
  BEFORE UPDATE ON blueprint_beats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_blueprint_volumes_updated_at
  BEFORE UPDATE ON blueprint_volumes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_blueprint_chapters_updated_at
  BEFORE UPDATE ON blueprint_chapters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
