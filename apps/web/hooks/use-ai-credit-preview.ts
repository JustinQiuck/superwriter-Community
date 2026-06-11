"use client";

import { useMemo } from "react";

export type AICreditPreviewItem = {
  clientKey: string;
  routeKey: string;
  displayLabel: string;
  priceTier: "standard" | "stable" | "premium" | "opus";
  contextTier: "short" | "standard" | "long" | "extra_long";
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

export function useAICreditPreview(
  items: {
    clientKey?: string;
    routeKey: string;
    hasEnhancedContext?: boolean;
    priceTier?: AICreditPreviewItem["priceTier"];
    contextTier?: AICreditPreviewItem["contextTier"];
  }[],
) {
  const previews = useMemo<Record<string, AICreditPreviewItem>>(() => {
    return Object.fromEntries(
      items.map((item) => {
        const clientKey = item.clientKey ?? `${item.routeKey}:${Boolean(item.hasEnhancedContext)}`;
        return [
          clientKey,
          {
            clientKey,
            routeKey: item.routeKey,
            displayLabel: "个人 Key",
            priceTier: item.priceTier ?? "standard",
            contextTier: item.contextTier ?? "standard",
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
          } satisfies AICreditPreviewItem,
        ];
      }),
    );
  }, [items]);

  return { previews, loading: false };
}
