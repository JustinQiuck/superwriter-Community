import type {
  NormalizedPersonalAISettingsInput,
  PersonalAIProvider,
} from "@/lib/ai/personal-provider-settings";
import {
  decryptSecret,
  encryptSecret,
  maskSecret,
} from "@/lib/ai/secret-store";
import { createServiceClient } from "@/lib/supabase/service";

export type PersonalAISettingTestStatus = "success" | "failed";

export type PersonalAISettingSafeRow = {
  id: string;
  user_id: string;
  provider: PersonalAIProvider;
  base_url: string | null;
  model: string;
  api_key_preview: string;
  is_enabled: boolean;
  last_tested_at: string | null;
  last_test_status: PersonalAISettingTestStatus | null;
  last_test_error: string | null;
  created_at: string;
  updated_at: string;
};

export type PersonalAISettingWithSecretRow = {
  provider: PersonalAIProvider;
  base_url: string | null;
  model: string;
  apiKey: string;
};

export type PersonalAISettingWithSecret = PersonalAISettingWithSecretRow;

export type PersonalAISettingMetadataInput = {
  provider: PersonalAIProvider;
  baseUrl: string | null;
  model: string;
};

type PersonalAISettingSecretRow = {
  provider: PersonalAIProvider;
  base_url: string | null;
  model: string;
  api_key_ciphertext: string;
  is_enabled: boolean;
};

type QueryResult<T> = PromiseLike<{
  data: T | null;
  error: { message: string } | null;
}>;

type PersonalAISettingsFilterQuery = {
  select(columns: string): PersonalAISettingsFilterQuery;
  eq(column: string, value: unknown): PersonalAISettingsFilterQuery;
  maybeSingle<T = unknown>(): QueryResult<T>;
  single<T = unknown>(): QueryResult<T>;
};

type PersonalAISettingsTableQuery = {
  select(columns: string): PersonalAISettingsFilterQuery;
  upsert(
    payload: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): PersonalAISettingsFilterQuery;
  update(payload: Record<string, unknown>): PersonalAISettingsFilterQuery;
  delete(): PersonalAISettingsFilterQuery;
};

export type PersonalAISettingsClient = {
  from(table: "user_ai_provider_settings"): PersonalAISettingsTableQuery;
};

const TABLE_NAME = "user_ai_provider_settings";
const SAFE_COLUMNS = [
  "id",
  "user_id",
  "provider",
  "base_url",
  "model",
  "api_key_preview",
  "is_enabled",
  "last_tested_at",
  "last_test_status",
  "last_test_error",
  "created_at",
  "updated_at",
].join(", ");

export async function getPersonalAISetting(
  supabase: PersonalAISettingsClient,
  userId: string,
): Promise<PersonalAISettingSafeRow | null> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select(SAFE_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle<PersonalAISettingSafeRow>();

  if (error) throw new Error(`读取个人 AI 设置失败：${error.message}`);
  return data;
}

export async function savePersonalAISetting(
  supabase: PersonalAISettingsClient,
  userId: string,
  normalizedInput: NormalizedPersonalAISettingsInput,
): Promise<PersonalAISettingSafeRow> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .upsert(
      {
        user_id: userId,
        provider: normalizedInput.provider,
        base_url: normalizedInput.baseUrl,
        model: normalizedInput.model,
        api_key_ciphertext: encryptSecret(normalizedInput.apiKey),
        api_key_preview: maskSecret(normalizedInput.apiKey),
        is_enabled: true,
        last_tested_at: null,
        last_test_status: null,
        last_test_error: null,
      },
      { onConflict: "user_id" },
    )
    .select(SAFE_COLUMNS)
    .single<PersonalAISettingSafeRow>();

  if (error) throw new Error(`保存个人 AI 设置失败：${error.message}`);
  if (!data) throw new Error("保存个人 AI 设置失败：未返回设置。");
  return data;
}

export async function deletePersonalAISetting(
  supabase: PersonalAISettingsClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq("user_id", userId)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) throw new Error(`删除个人 AI 设置失败：${error.message}`);
}

export async function updatePersonalAISettingMetadata(
  supabase: PersonalAISettingsClient,
  userId: string,
  input: PersonalAISettingMetadataInput,
): Promise<PersonalAISettingSafeRow> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({
      provider: input.provider,
      base_url: input.baseUrl,
      model: input.model,
      is_enabled: true,
      last_tested_at: null,
      last_test_status: null,
      last_test_error: null,
    })
    .eq("user_id", userId)
    .select(SAFE_COLUMNS)
    .single<PersonalAISettingSafeRow>();

  if (error) throw new Error(`更新个人 AI 设置失败：${error.message}`);
  if (!data) throw new Error("更新个人 AI 设置失败：未返回设置。");
  return data;
}

export async function updatePersonalAISettingTestStatus(
  supabase: PersonalAISettingsClient,
  userId: string,
  status: PersonalAISettingTestStatus,
  errorMessage?: string,
): Promise<PersonalAISettingSafeRow> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({
      last_tested_at: new Date().toISOString(),
      last_test_status: status,
      last_test_error: status === "failed" ? normalizeTestError(errorMessage) : null,
    })
    .eq("user_id", userId)
    .select(SAFE_COLUMNS)
    .single<PersonalAISettingSafeRow>();

  if (error) throw new Error(`更新个人 AI 设置测试状态失败：${error.message}`);
  if (!data) throw new Error("更新个人 AI 设置测试状态失败：未返回设置。");
  return data;
}

export async function getPersonalAISettingWithSecret(
  userId: string,
): Promise<PersonalAISettingWithSecret | null> {
  const supabase = createServiceClient() as unknown as PersonalAISettingsClient;
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("provider, base_url, model, api_key_ciphertext, is_enabled")
    .eq("user_id", userId)
    .eq("is_enabled", true)
    .maybeSingle<PersonalAISettingSecretRow>();

  if (error) throw new Error(`读取个人 AI 密钥失败：${error.message}`);
  if (!data) return null;

  return {
    provider: data.provider,
    base_url: data.base_url,
    model: data.model,
    apiKey: decryptSecret(data.api_key_ciphertext),
  };
}

function normalizeTestError(errorMessage: string | undefined): string {
  const fallback = "连接测试失败";
  const normalized = redactCommonSecrets(errorMessage ?? fallback)
    .replace(/\s+/g, " ")
    .trim() || fallback;
  return normalized.slice(0, 300);
}

function redactCommonSecrets(message: string): string {
  return message
    .replace(/(authorization\s*[:=]\s*bearer\s+)[^\s,;"']+/gi, "$1[已隐藏]")
    .replace(/\bbearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, "Bearer [已隐藏]")
    .replace(/\bsk-[A-Za-z0-9._-]{8,}/gi, "[已隐藏]")
    .replace(/([?&](?:api[_-]?key|key|token|access_token)=)[^&\s]+/gi, "$1[已隐藏]");
}
