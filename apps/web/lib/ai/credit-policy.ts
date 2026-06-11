export type AICreditPriceTier = "standard" | "stable" | "premium" | "opus";
export type AICreditContextTier = "short" | "standard" | "long" | "extra_long";

export type AICreditPreview = {
  routeKey: string;
  displayLabel: string;
  priceTier: AICreditPriceTier;
  contextTier: AICreditContextTier;
  creditsCost: number;
  chargeBehavior: "explicit" | "system_free" | "disabled";
  isChargeable: boolean;
  isDisabled: boolean;
  configurationError?: {
    code: string;
    reason?: string;
    message: string;
  };
  routeSource?: string | null;
  routeConfigId?: string | null;
  modelConfigId?: string | null;
  channelId?: string | null;
  modelCreditCost?: number | null;
  modelCostTier?: string | null;
  channelCostTier?: string | null;
};

function communityPreview(routeKey: string): AICreditPreview {
  return {
    routeKey,
    displayLabel: "个人 Key",
    priceTier: "standard",
    contextTier: "standard",
    creditsCost: 0,
    chargeBehavior: "system_free",
    isChargeable: false,
    isDisabled: false,
    routeSource: "community",
    routeConfigId: null,
    modelConfigId: null,
    channelId: null,
    modelCreditCost: null,
    modelCostTier: null,
    channelCostTier: null,
  };
}

export function resolveAICreditCostFromModel({
  preview,
}: {
  preview: AICreditPreview;
}): AICreditPreview {
  return { ...preview, ...communityPreview(preview.routeKey) };
}

export async function resolveAICreditPreview({
  routeKey,
}: {
  routeKey: string;
  plan?: string | null;
  hasEnhancedContext?: boolean;
  priceTier?: AICreditPriceTier;
  contextTier?: AICreditContextTier;
}): Promise<AICreditPreview> {
  return communityPreview(routeKey);
}

export function resolveDefaultPriceTierForPlan(_plan?: string | null): AICreditPriceTier {
  return "standard";
}

export function resolveBillingProviderForCreditTier(_priceTier?: AICreditPriceTier): "sw-free" {
  return "sw-free";
}

export function resolveDefaultPriceTier(_provider?: string | null): AICreditPriceTier {
  return "standard";
}
