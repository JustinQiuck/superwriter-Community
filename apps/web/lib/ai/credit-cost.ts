import {
  AI_MODE_CREDIT_COSTS,
  DEFAULT_AI_MODE_CREDIT_COST,
  type AIMode,
  type AIProvider,
} from "@superwriter/shared";

type ResolveCreditCostInput = {
  mode: AIMode;
  provider: AIProvider;
  hasExtendedContext?: boolean;
};

type ResolveGenerateCreditCostInput = {
  mode: AIMode;
  provider: AIProvider;
  hasEnhancedContext?: boolean;
};

const GENERATE_EXTENDED_CONTEXT_SURCHARGE_MODES: AIMode[] = [
  "chapter_continue",
  "chapter_rewrite",
  "blueprint_expand",
];

export function resolveCreditCost({
  mode,
  provider,
  hasExtendedContext = false,
}: ResolveCreditCostInput): number {
  const baseCost = AI_MODE_CREDIT_COSTS[mode] ?? DEFAULT_AI_MODE_CREDIT_COST;
  const providerCost = provider === "sw-pro" ? 1 : 0;
  const extendedContextCost = hasExtendedContext ? 1 : 0;

  return baseCost + providerCost + extendedContextCost;
}

export function resolveGenerateCreditCost({
  mode,
  provider,
  hasEnhancedContext = false,
}: ResolveGenerateCreditCostInput): number {
  const providerForCost = mode === "chapter_completion_review" ? "sw-free" : provider;
  const hasExtendedContext =
    GENERATE_EXTENDED_CONTEXT_SURCHARGE_MODES.includes(mode) ||
    (mode !== "chapter_completion_review" && hasEnhancedContext);

  return resolveCreditCost({
    mode,
    provider: providerForCost,
    hasExtendedContext,
  });
}
