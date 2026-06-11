import type { AIModelCapability } from "@/lib/ai/model-registry";

export type AIFeatureDefinition = {
  routeKey: string;
  displayName: string;
  category: string;
  capability: AIModelCapability;
  defaultCost: number;
};

export function getAIFeature(routeKey: string): AIFeatureDefinition {
  return {
    routeKey,
    displayName: routeKey,
    category: "community",
    capability: "general",
    defaultCost: 0,
  };
}

export function listAIFeatures(): AIFeatureDefinition[] {
  return [];
}
