import type { AICreditPriceTier } from "@/lib/ai/credit-policy";

export function estimateAIUsageCostCents(_input?: {
  providerKey?: string | null;
  priceTier?: AICreditPriceTier | null;
  modelCostTier?: string | null;
  channelCostTier?: string | null;
  [key: string]: unknown;
}): number {
  return 0;
}

export function billingProviderKeyForPriceTier(_priceTier?: AICreditPriceTier): "sw-free" {
  return "sw-free";
}

export function resolvePriceTierFromRouteCost({
  requestedPriceTier,
}: {
  requestedPriceTier?: AICreditPriceTier;
  modelCostTier?: string | null;
  channelCostTier?: string | null;
  fallbackPriceTier?: AICreditPriceTier | null;
}): AICreditPriceTier {
  return requestedPriceTier ?? "standard";
}
