import type { AICreditPriceTier } from "@/lib/ai/credit-policy";

export type CreditLedgerClient = unknown;

export function createCreditLedgerClient(): CreditLedgerClient {
  return null;
}

export async function reserveAIUsageCredits(input: {
  requestId?: string;
  priceTier?: AICreditPriceTier | null;
  [key: string]: unknown;
}) {
  return {
    ok: true as const,
    usageId: input.requestId ?? crypto.randomUUID(),
    creditsLimit: 0,
    creditsUsed: 0,
  };
}

export async function settleAIUsageCredits(_input?: Record<string, unknown>): Promise<void> {}
export async function refundAIUsageCredits(_input?: Record<string, unknown>): Promise<void> {}
export async function markAIUsageBillingFailed(_input?: Record<string, unknown>): Promise<void> {}
