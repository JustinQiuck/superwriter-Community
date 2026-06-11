-- SuperWriter Database Schema
-- Migration: 001_initial_schema

-- ==========================================
-- PROFILES (extends auth.users)
-- ==========================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  default_language TEXT DEFAULT 'zh',
  ai_provider_preference TEXT DEFAULT 'anthropic',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- STORIES
-- ==========================================
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  genre TEXT,
  era TEXT,
  status TEXT DEFAULT 'draft',
  language TEXT DEFAULT 'zh',
  cover_image_url TEXT,
  settings JSONB DEFAULT '{}',
  word_count_goal INTEGER DEFAULT 50000,
  daily_word_goal INTEGER DEFAULT 1000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stories_user_id ON stories(user_id);
CREATE INDEX idx_stories_status ON stories(user_id, status);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stories"
  ON stories FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own stories"
  ON stories FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stories"
  ON stories FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories"
  ON stories FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- ENTITY TYPE ENUM
-- ==========================================
CREATE TYPE entity_type AS ENUM (
  'character',
  'location',
  'event',
  'chapter',
  'scene',
  'item',
  'culture',
  'book',
  'reference',
  'economy',
  'faction',
  'magic_system'
);

-- ==========================================
-- ENTITIES (unified table + JSONB)
-- ==========================================
CREATE TABLE entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  type entity_type NOT NULL,
  name TEXT NOT NULL,

  status TEXT,
  sort_order INTEGER,
  timeline_date DATE,

  data JSONB NOT NULL DEFAULT '{}',
  content TEXT,

  tags TEXT[] DEFAULT '{}',
  color TEXT,
  cover_image_url TEXT,

  ai_generated BOOLEAN DEFAULT FALSE,
  ai_context TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_entities_story_id ON entities(story_id);
CREATE INDEX idx_entities_story_type ON entities(story_id, type);
CREATE INDEX idx_entities_timeline_date ON entities(story_id, timeline_date) WHERE timeline_date IS NOT NULL;
CREATE INDEX idx_entities_data ON entities USING gin(data);
CREATE INDEX idx_entities_sort_order ON entities(story_id, type, sort_order);

ALTER TABLE entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view entities in their stories"
  ON entities FOR SELECT
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

CREATE POLICY "Users can create entities in their stories"
  ON entities FOR INSERT
  WITH CHECK (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

CREATE POLICY "Users can update entities in their stories"
  ON entities FOR UPDATE
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete entities in their stories"
  ON entities FOR DELETE
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

-- ==========================================
-- RELATIONSHIPS
-- ==========================================
CREATE TABLE relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  from_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  to_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,

  type TEXT NOT NULL,
  description TEXT,
  bidirectional BOOLEAN DEFAULT FALSE,

  evolution JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(from_entity_id, to_entity_id, type)
);

CREATE INDEX idx_relationships_from ON relationships(from_entity_id);
CREATE INDEX idx_relationships_to ON relationships(to_entity_id);
CREATE INDEX idx_relationships_story ON relationships(story_id);

ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view relationships in their stories"
  ON relationships FOR SELECT
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

CREATE POLICY "Users can create relationships in their stories"
  ON relationships FOR INSERT
  WITH CHECK (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

CREATE POLICY "Users can update relationships in their stories"
  ON relationships FOR UPDATE
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete relationships in their stories"
  ON relationships FOR DELETE
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

-- ==========================================
-- TIMELINE EVENTS
-- ==========================================
CREATE TABLE timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,

  start_date DATE,
  end_date DATE,
  start_time TEXT,

  entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
  chapter_id UUID REFERENCES entities(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  description TEXT,
  color TEXT,
  track TEXT DEFAULT 'main',

  information_node BOOLEAN DEFAULT FALSE,
  info_details JSONB,

  sort_order INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_timeline_story ON timeline_events(story_id);
CREATE INDEX idx_timeline_date ON timeline_events(story_id, start_date);

ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view timeline events in their stories"
  ON timeline_events FOR SELECT
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

CREATE POLICY "Users can create timeline events in their stories"
  ON timeline_events FOR INSERT
  WITH CHECK (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

CREATE POLICY "Users can update timeline events in their stories"
  ON timeline_events FOR UPDATE
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete timeline events in their stories"
  ON timeline_events FOR DELETE
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

-- ==========================================
-- WRITING SESSIONS
-- ==========================================
CREATE TABLE writing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,

  words_written INTEGER DEFAULT 0,
  words_deleted INTEGER DEFAULT 0,

  entity_ids_edited UUID[],

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_writing_sessions_user ON writing_sessions(user_id, story_id);

ALTER TABLE writing_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own writing sessions"
  ON writing_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own writing sessions"
  ON writing_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own writing sessions"
  ON writing_sessions FOR UPDATE USING (auth.uid() = user_id);

-- ==========================================
-- AI GENERATIONS
-- ==========================================
CREATE TABLE ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  mode TEXT NOT NULL,
  prompt TEXT NOT NULL,
  context_entity_ids UUID[],
  model TEXT NOT NULL,

  result TEXT,
  tokens_used INTEGER,

  accepted BOOLEAN,
  rating SMALLINT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_generations_user ON ai_generations(user_id, story_id);
CREATE INDEX idx_ai_generations_created ON ai_generations(user_id, created_at DESC);

ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI generations"
  ON ai_generations FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI generations"
  ON ai_generations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI generations"
  ON ai_generations FOR UPDATE USING (auth.uid() = user_id);

-- ==========================================
-- HELPER: updated_at trigger
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_stories_updated_at
  BEFORE UPDATE ON stories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_entities_updated_at
  BEFORE UPDATE ON entities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_relationships_updated_at
  BEFORE UPDATE ON relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
