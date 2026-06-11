import type { AIProviderAdapterType } from "@/lib/ai/model-registry";

export type AIProviderChannelHealthStatus = "unknown" | "healthy" | "degraded" | "cooling_down" | "down";
export type AIProviderChannel = {
  channelKey: string;
  adapterType: AIProviderAdapterType;
  healthStatus: AIProviderChannelHealthStatus;
};
