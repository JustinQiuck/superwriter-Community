import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

import type { PersonalAIProvider } from "@/lib/ai/personal-provider-settings";
import { getPersonalAISettingWithSecret } from "@/lib/db/queries/personal-ai-settings";

export class CommunityAIConfigurationError extends Error {
  code = "AI_PROVIDER_NOT_CONFIGURED" as const;

  constructor() {
    super("请先在设置中填写你的 AI API Key。");
    this.name = "CommunityAIConfigurationError";
  }
}

export type ResolveCommunityAIModelInput = {
  userId: string;
  supabase?: unknown;
};

export type ResolvedCommunityAIModel = {
  providerKey: PersonalAIProvider;
  modelAlias: string;
  model: LanguageModel;
};

export async function resolveCommunityAIModel({
  userId,
}: ResolveCommunityAIModelInput): Promise<ResolvedCommunityAIModel> {
  const setting = await getPersonalAISettingWithSecret(userId);
  if (!setting) throw new CommunityAIConfigurationError();

  const providerOptions = {
    apiKey: setting.apiKey,
    baseURL: setting.base_url ?? undefined,
  };

  switch (setting.provider) {
    case "openai_compatible":
      return {
        providerKey: setting.provider,
        modelAlias: setting.model,
        model: createOpenAI(providerOptions)(setting.model) as unknown as LanguageModel,
      };
    case "anthropic":
      return {
        providerKey: setting.provider,
        modelAlias: setting.model,
        model: createAnthropic(providerOptions)(setting.model) as unknown as LanguageModel,
      };
    case "deepseek":
      return {
        providerKey: setting.provider,
        modelAlias: setting.model,
        model: createDeepSeek(providerOptions)(setting.model) as unknown as LanguageModel,
      };
  }
}
