import type { AIModelCapability } from "@/lib/ai/model-registry";

export type SimpleProCallSource = {
  id: string;
  sourceKey: string;
  displayName: string;
  baseUrl: string;
  adapterType: "openai_compatible" | "openai" | "anthropic" | "deepseek";
  hasStoredKey: boolean;
  keyStatus: "missing" | "saved" | "legacy_saved" | "cannot_decrypt";
  isEnabled: boolean;
};

export type SimpleProModel = {
  id: string;
  displayName: string;
  modelAlias: string;
  upstreamModelId: string;
  sourceId: string;
  sourceLabel: string;
  pointsCost: number;
  isEnabled: boolean;
};

export type SimpleProFeatureAssignment = {
  routeId: string | null;
  routeKey: string;
  featureLabel: string;
  capability: AIModelCapability;
  modelId: string | null;
  modelLabel: string | null;
  pointsCost: number;
  isEnabled: boolean;
  status: "ready" | "warning" | "blocked";
  statusLabel: string;
};

export type HiddenSourceDefaults = {
  providerKey: string;
  apiKeyEnvVar: string;
  dataPolicyLabel: string;
  allowsUserContent: boolean;
  trainingOptOut: boolean;
  retentionPolicyUrl: string | null;
};

export function buildHiddenSourceDefaults({
  sourceKey,
}: {
  sourceKey: string;
  displayName: string;
}): HiddenSourceDefaults {
  const normalized = sourceKey.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  return {
    providerKey: sourceKey.trim(),
    apiKeyEnvVar: `SW_CHANNEL_${normalized}_API_KEY`,
    dataPolicyLabel: "管理员配置的付费模型来源",
    allowsUserContent: true,
    trainingOptOut: true,
    retentionPolicyUrl: null,
  };
}

export function normalizeProModelLabel({
  displayName,
  upstreamModelId,
}: {
  displayName: string;
  upstreamModelId: string;
}): string {
  return `${displayName.trim()} / ${upstreamModelId.trim()}`;
}

export function buildProRouteStatus(input: {
  featureLabel: string;
  modelLabel: string | null;
  sourceLabel: string | null;
  hasUsableKey: boolean;
  pointsCost: number;
  enabled: boolean;
}): { status: SimpleProFeatureAssignment["status"]; label: string } {
  if (!input.enabled) {
    return {
      status: "blocked",
      label: `${input.featureLabel} -> 未启用`,
    };
  }
  if (!input.modelLabel || !input.sourceLabel) {
    return {
      status: "blocked",
      label: `${input.featureLabel} -> 缺少 Pro 模型`,
    };
  }
  if (!input.hasUsableKey) {
    const label = `${input.featureLabel} -> Pro -> ${input.modelLabel} -> ${input.sourceLabel} -> 请重新填写 API Key`;
    return {
      status: "blocked",
      label,
    };
  }

  const label = `${input.featureLabel} -> Pro -> ${input.modelLabel} -> ${input.sourceLabel} -> Key 已保存 -> ${input.pointsCost} 点`;
  return {
    status: "ready",
    label,
  };
}
