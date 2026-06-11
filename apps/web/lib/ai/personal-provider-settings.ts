import { z } from "zod";

import { isHeaderSafeApiKey } from "@/lib/ai/api-key-validation";

export const PERSONAL_AI_PROVIDERS = [
  "openai_compatible",
  "anthropic",
  "deepseek",
] as const;

export type PersonalAIProvider = (typeof PERSONAL_AI_PROVIDERS)[number];

export const DEFAULT_PERSONAL_MODELS: Record<PersonalAIProvider, string> = {
  openai_compatible: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-latest",
  deepseek: "deepseek-chat",
};

export type PersonalAISettingsInput = {
  provider: PersonalAIProvider;
  apiKey: string;
  baseUrl?: string | null;
  model?: string | null;
};

export type NormalizedPersonalAISettingsInput = {
  provider: PersonalAIProvider;
  apiKey: string;
  baseUrl: string | null;
  model: string;
};

export type NormalizedPersonalAISettingsDraftInput = Omit<
  NormalizedPersonalAISettingsInput,
  "apiKey"
> & {
  apiKey: string | null;
};

const personalAIProviderSchema = z.enum(PERSONAL_AI_PROVIDERS);

const baseUrlSchema = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((value) => value || null)
  .refine((value) => value === null || z.string().url().safeParse(value).success, {
    message: "Base URL 必须是有效的网址。",
  });

const personalAISettingsSchema = z
  .object({
    provider: personalAIProviderSchema,
    apiKey: z
      .string()
      .trim()
      .min(1, "API Key 不能为空。")
      .refine(isUsablePersonalApiKey, {
        message: "API Key 无效，请填写真实可用的密钥。",
      }),
    baseUrl: baseUrlSchema,
    model: z
      .string()
      .trim()
      .nullable()
      .optional(),
  })
  .transform((value): NormalizedPersonalAISettingsInput => ({
    provider: value.provider,
    apiKey: value.apiKey,
    baseUrl: value.baseUrl,
    model: value.model || DEFAULT_PERSONAL_MODELS[value.provider],
  }));

const optionalPersonalApiKeySchema = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((value) => value || null)
  .refine((value) => value === null || isUsablePersonalApiKey(value), {
    message: "API Key 无效，请填写真实可用的密钥。",
  });

const personalAISettingsDraftSchema = z
  .object({
    provider: personalAIProviderSchema,
    apiKey: optionalPersonalApiKeySchema,
    baseUrl: baseUrlSchema,
    model: z
      .string()
      .trim()
      .nullable()
      .optional(),
  })
  .transform((value): NormalizedPersonalAISettingsDraftInput => ({
    provider: value.provider,
    apiKey: value.apiKey,
    baseUrl: value.baseUrl,
    model: value.model || DEFAULT_PERSONAL_MODELS[value.provider],
  }));

const FAKE_PERSONAL_API_KEYS = new Set([
  "placeholder",
  "changeme",
  "change-me",
  "todo",
  "fake-key",
  "fake_api_key",
  "dummy-key",
  "dummy_api_key",
  "test-key",
  "test_api_key",
  "api-key",
  "sample-key",
  "example-key",
  "demo-key",
  "demo_api_key",
]);

const FAKE_PERSONAL_API_KEY_PREFIXES = [
  "your-",
  "your_",
  "fake-",
  "fake_",
  "dummy-",
  "dummy_",
  "test-",
  "test_",
  "sample-",
  "sample_",
  "example-",
  "example_",
  "demo-",
  "demo_",
];

export function normalizePersonalAISettingsInput(
  input: PersonalAISettingsInput,
): NormalizedPersonalAISettingsInput {
  const apiKey = input.apiKey.trim();
  const baseUrl = input.baseUrl?.trim() || null;
  const model = input.model?.trim() || DEFAULT_PERSONAL_MODELS[input.provider];

  return {
    provider: input.provider,
    apiKey,
    baseUrl,
    model,
  };
}

export function validatePersonalAISettingsInput(input: unknown):
  | { success: true; data: NormalizedPersonalAISettingsInput }
  | { success: false; error: z.ZodError } {
  const result = personalAISettingsSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function validatePersonalAISettingsDraftInput(input: unknown):
  | { success: true; data: NormalizedPersonalAISettingsDraftInput }
  | { success: false; error: z.ZodError } {
  const result = personalAISettingsDraftSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function isUsablePersonalApiKey(
  key: string | null | undefined,
): key is string {
  if (!key) return false;

  const trimmed = key.trim();
  if (!trimmed) return false;
  if (!isHeaderSafeApiKey(trimmed)) return false;

  const normalized = trimmed.toLowerCase();
  if (FAKE_PERSONAL_API_KEYS.has(normalized)) return false;
  return !FAKE_PERSONAL_API_KEY_PREFIXES.some((prefix) =>
    normalized.startsWith(prefix)
  );
}
