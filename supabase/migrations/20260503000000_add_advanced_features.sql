-- SuperWriter Phase 4: Advanced Features
-- Genre profiles + Cold storage + Foreshadowing support

-- Genre profiles table
CREATE TABLE genre_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',

  recommended_template TEXT NOT NULL DEFAULT 'custom',
  required_entity_types TEXT[] NOT NULL DEFAULT '{}',
  custom_field_templates JSONB NOT NULL DEFAULT '{}',
  ai_prompt_overrides JSONB NOT NULL DEFAULT '{}',

  is_builtin BOOLEAN NOT NULL DEFAULT false,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_genre_profiles_user ON genre_profiles(user_id) WHERE user_id IS NOT NULL;

ALTER TABLE genre_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view builtin genre profiles"
  ON genre_profiles FOR SELECT
  USING (is_builtin = true OR user_id = auth.uid());

CREATE POLICY "Users can create custom genre profiles"
  ON genre_profiles FOR INSERT
  WITH CHECK (is_builtin = false AND user_id = auth.uid());

CREATE POLICY "Users can update their custom genre profiles"
  ON genre_profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their custom genre profiles"
  ON genre_profiles FOR DELETE
  USING (user_id = auth.uid());

-- Cold storage for compressed archival memories
CREATE TABLE story_archival_memories_cold (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  original_id UUID NOT NULL,

  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  segment_index INTEGER NOT NULL DEFAULT 0,

  original_content TEXT NOT NULL,
  compressed_content TEXT,
  content_embedding vector(1536),

  metadata JSONB NOT NULL DEFAULT '{}',
  compressed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cold_story ON story_archival_memories_cold(story_id);
CREATE INDEX idx_cold_original ON story_archival_memories_cold(original_id);

ALTER TABLE story_archival_memories_cold ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cold storage in their stories"
  ON story_archival_memories_cold FOR SELECT
  USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

-- Insert builtin genre profiles
INSERT INTO genre_profiles (name, display_name, description, recommended_template, required_entity_types, custom_field_templates, ai_prompt_overrides, is_builtin) VALUES
('xuanhuan', '玄幻/武侠', '东方玄幻和武侠小说，包含修炼体系、宗门阵营等元素', 'seven_point',
  ARRAY['character', 'location', 'faction', 'magic_system', 'item'],
  '{"character": {"cultivation_level": "修为等级", "sect": "所属宗门", "techniques": "功法技能"}, "location": {"danger_level": "危险等级", "resources": "灵气资源"}}',
  '{"style": "保持修炼体系和战力层级的一致性。描述战斗场景时注重招式名称和境界对比。"}',
  true),
('mystery', '悬疑/推理', '推理悬疑小说，包含线索收集、逻辑推演等元素', 'three_act',
  ARRAY['character', 'location', 'item', 'event'],
  '{"character": {"role_in_case": "案件角色", "alibi": "不在场证明", "secret": "隐藏秘密"}, "item": {"is_evidence": "是否为证据", "reliability": "可靠程度"}}',
  '{"style": "注意线索的逻辑链完整性。每个证据必须有合理的来源和链式推导。避免信息泄露（读者不应在揭秘前猜到真相）。"}',
  true),
('romance', '现代言情', '现代都市言情，包含情感发展、关系变化等元素', 'save_the_cat',
  ARRAY['character', 'location', 'event'],
  '{"character": {"occupation": "职业", "personality": "性格特点", "love_language": "爱的语言"}, "location": {"atmosphere": "氛围", "romantic_score": "浪漫指数"}}',
  '{"style": "注重情感描写和内心独白的细腻度。角色之间的对话要体现性格差异和感情递进。"}',
  true);

-- Updated_at trigger for genre_profiles
CREATE TRIGGER set_genre_profiles_updated_at
  BEFORE UPDATE ON genre_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
