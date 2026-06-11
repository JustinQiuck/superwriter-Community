import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createOpenAI } from "@ai-sdk/openai";

import type { ResolvedAIModelRoute } from "@/lib/ai/model-registry";

export type ResolvedModelProviderConfig = Partial<ResolvedAIModelRoute> & {
  providerKey: string;
  modelAlias: string;
};

export function buildProviderKeyPool(): string[] {
  return [];
}

export function getModel(provider: ResolvedModelProviderConfig) {
  const model = provider.modelAlias || provider.modelName || "gpt-4o-mini";
  const apiKey = provider.apiKeyEnvVar ? process.env[provider.apiKeyEnvVar] : process.env.OPENAI_API_KEY;
  const baseURL = provider.baseUrl ?? undefined;

  if (provider.adapterType === "anthropic") {
    return createAnthropic({ apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY, baseURL })(model);
  }
  if (provider.adapterType === "deepseek") {
    return createDeepSeek({ apiKey: apiKey ?? process.env.DEEPSEEK_API_KEY, baseURL })(model);
  }
  return createOpenAI({ apiKey, baseURL })(model);
}
