import { createClient } from "@/lib/supabase/server";
import { resolveCommunityAIModel } from "@/lib/ai/community-runtime";
import type { AICostBudgetDecision } from "@/lib/ai/cost-budget";
import type { AICreditPreview, AICreditPriceTier } from "@/lib/ai/credit-policy";
import type {
  AIModelCallScope,
  AIModelCapability,
  ResolvedAIModelRoute,
} from "@/lib/ai/model-registry";

const budgetDecision: AICostBudgetDecision = {
  allowPaidFallback: false,
  shouldReject: false,
  degradeAction: null,
  reason: null,
};

function preview(routeKey: string): AICreditPreview {
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

export type PreparedAIRouteCall =
  | {
    status: "disabled";
    routePricePreview: AICreditPreview;
    creditPreview: AICreditPreview;
  }
  | {
    status: "budget_rejected";
    routePricePreview: AICreditPreview;
    creditPreview: AICreditPreview;
    budgetDecision: AICostBudgetDecision;
    budgetEstimatedCostCents: number;
  }
  | {
    status: "ready";
    routePricePreview: AICreditPreview;
    creditPreview: AICreditPreview;
    budgetDecision: AICostBudgetDecision;
    budgetEstimatedCostCents: number;
    requestCost: number;
    estimatedCostCents: number;
    resolvedRoute: ResolvedAIModelRoute;
    model: Awaited<ReturnType<typeof resolveCommunityAIModel>>["model"];
  };

export async function prepareAIRouteCall({
  routeKey,
  capability,
  callScope,
}: {
  routeKey: string;
  plan: string | null;
  capability: AIModelCapability;
  callScope: AIModelCallScope;
  requestedModelId?: string;
  requestedPriceTier?: AICreditPriceTier;
  hasEnhancedContext?: boolean;
}): Promise<PreparedAIRouteCall> {
  const creditPreview = preview(routeKey);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "disabled",
      routePricePreview: { ...creditPreview, isDisabled: true, chargeBehavior: "disabled" },
      creditPreview: { ...creditPreview, isDisabled: true, chargeBehavior: "disabled" },
    };
  }

  const resolved = await resolveCommunityAIModel({ userId: user.id });
  const resolvedRoute: ResolvedAIModelRoute = {
    providerKey: resolved.providerKey,
    modelAlias: resolved.modelAlias,
    modelName: resolved.modelAlias,
    adapterType: resolved.providerKey === "anthropic"
      ? "anthropic"
      : resolved.providerKey === "deepseek"
        ? "deepseek"
        : "openai_compatible",
    baseUrl: null,
    apiKeyEnvVar: null,
    apiKeyPoolEnvVar: null,
    routeKey,
    capability,
    callScope,
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

  return {
    status: "ready",
    routePricePreview: creditPreview,
    creditPreview,
    budgetDecision,
    budgetEstimatedCostCents: 0,
    requestCost: 0,
    estimatedCostCents: 0,
    resolvedRoute,
    model: resolved.model,
  };
}
