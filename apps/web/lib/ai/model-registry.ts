import type { AICreditPriceTier } from "@/lib/ai/credit-policy";

export type AIProviderAdapterType = "openai_compatible" | "anthropic" | "deepseek";
export type AIModelCapability = string;
export type AIModelCallScope = string;

export type AIRouteFallbackPolicy = {
  fallbackMode?: string | null;
  primaryTimeoutMs?: number | null;
  fallbackTimeoutMs?: number | null;
} | null;

export type ResolvedAIModelRoute = {
  providerKey: string;
  modelAlias: string;
  modelName: string;
  adapterType: AIProviderAdapterType;
  baseUrl: string | null;
  apiKeyEnvVar: string | null;
  apiKeyPoolEnvVar: string | null;
  routeKey: string;
  capability: AIModelCapability;
  callScope: AIModelCallScope;
  source: "community" | "database" | "database-fallback";
  channelId: string | null;
  modelConfigId: string | null;
  routeConfigId: string | null;
  fallbackPolicy: AIRouteFallbackPolicy;
  runtimeFallbackRoute?: ResolvedAIModelRoute | null;
  fallbackPriceTier: AICreditPriceTier | null;
  modelCreditCost: number | null;
  modelCostTier: string | null;
  channelCostTier: string | null;
  modelQualityTier: string | null;
  modelContextTier: string | null;
};

export function resolveAIModeCapability(mode?: string): AIModelCapability {
  if (mode?.includes("check") || mode?.includes("analyze")) return "analysis";
  if (mode?.includes("outline") || mode?.includes("generate")) return "creative_writing";
  return "general";
}

export async function resolveAIModelRoute(input: {
  routeKey: string;
  plan?: string | null;
  capability?: AIModelCapability;
  callScope?: AIModelCallScope;
  requestedModelId?: string;
}): Promise<ResolvedAIModelRoute> {
  return {
    providerKey: "openai_compatible",
    modelAlias: input.requestedModelId ?? "gpt-4o-mini",
    modelName: input.requestedModelId ?? "gpt-4o-mini",
    adapterType: "openai_compatible",
    baseUrl: null,
    apiKeyEnvVar: null,
    apiKeyPoolEnvVar: null,
    routeKey: input.routeKey,
    capability: input.capability ?? "general",
    callScope: input.callScope ?? "user_plan_scoped",
    source: "community",
    channelId: null,
    modelConfigId: null,
    routeConfigId: null,
    fallbackPolicy: null,
    runtimeFallbackRoute: null,
    fallbackPriceTier: null,
    modelCreditCost: null,
    modelCostTier: null,
    channelCostTier: null,
    modelQualityTier: null,
    modelContextTier: null,
  };
}
