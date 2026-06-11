CREATE TABLE public.user_ai_provider_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('openai_compatible', 'anthropic', 'deepseek')),
  base_url TEXT,
  model TEXT NOT NULL,
  api_key_ciphertext TEXT NOT NULL,
  api_key_preview TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_tested_at TIMESTAMPTZ,
  last_test_status TEXT CHECK (last_test_status IN ('success', 'failed')),
  last_test_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

COMMENT ON TABLE public.user_ai_provider_settings
  IS 'Stores each user''s local personal AI provider settings. API key ciphertext must stay server-side.';

COMMENT ON COLUMN public.user_ai_provider_settings.api_key_ciphertext
  IS 'Server-encrypted local personal API key ciphertext. Never expose this value to clients.';

-- Column grants prevent direct client reads of encrypted personal API keys.
REVOKE ALL PRIVILEGES ON TABLE public.user_ai_provider_settings FROM anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.user_ai_provider_settings TO service_role;

GRANT SELECT (
  id,
  user_id,
  provider,
  base_url,
  model,
  api_key_preview,
  is_enabled,
  last_tested_at,
  last_test_status,
  last_test_error,
  created_at,
  updated_at
) ON TABLE public.user_ai_provider_settings TO authenticated;

GRANT INSERT (
  user_id,
  provider,
  base_url,
  model,
  api_key_ciphertext,
  api_key_preview,
  is_enabled,
  last_tested_at,
  last_test_status,
  last_test_error,
  updated_at
) ON TABLE public.user_ai_provider_settings TO authenticated;

GRANT UPDATE (
  user_id,
  provider,
  base_url,
  model,
  api_key_ciphertext,
  api_key_preview,
  is_enabled,
  last_tested_at,
  last_test_status,
  last_test_error,
  updated_at
) ON TABLE public.user_ai_provider_settings TO authenticated;

GRANT DELETE ON TABLE public.user_ai_provider_settings TO authenticated;

CREATE INDEX idx_user_ai_provider_settings_user_id
  ON public.user_ai_provider_settings(user_id);

ALTER TABLE public.user_ai_provider_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own AI provider settings"
  ON public.user_ai_provider_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own AI provider settings"
  ON public.user_ai_provider_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI provider settings"
  ON public.user_ai_provider_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI provider settings"
  ON public.user_ai_provider_settings FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER set_user_ai_provider_settings_updated_at
  BEFORE UPDATE ON public.user_ai_provider_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
