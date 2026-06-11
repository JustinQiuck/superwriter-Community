import type { AIProviderChannelHealthStatus } from "@/lib/ai/provider-channels";

const FAILURE_COOLDOWN_MS = 5 * 60 * 1000;
const MAX_ERROR_CODE_LENGTH = 120;
const MAX_ERROR_MESSAGE_LENGTH = 500;

export type ChannelFailureHealth = {
  status: AIProviderChannelHealthStatus;
  consecutiveFailures: number;
  lastFailureAt: string;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  cooldownUntil: string | null;
};

export type ChannelSuccessHealth = {
  status: AIProviderChannelHealthStatus;
  consecutiveFailures: number;
  lastSuccessAt: string;
  rollingLatencyMs: number;
  cooldownUntil: null;
  lastErrorCode: null;
  lastErrorMessage: null;
};

export function nextChannelHealthOnFailure({
  consecutiveFailures,
  now,
  errorCode,
  errorMessage,
}: {
  consecutiveFailures: number;
  now: Date;
  errorCode?: string | null;
  errorMessage?: string | null;
}): ChannelFailureHealth {
  const nextFailures = Math.max(0, Math.trunc(consecutiveFailures)) + 1;
  const isCoolingDown = nextFailures >= 3;

  return {
    status: isCoolingDown ? "cooling_down" : "degraded",
    consecutiveFailures: nextFailures,
    lastFailureAt: now.toISOString(),
    lastErrorCode: truncate(errorCode, MAX_ERROR_CODE_LENGTH),
    lastErrorMessage: truncate(errorMessage, MAX_ERROR_MESSAGE_LENGTH),
    cooldownUntil: isCoolingDown
      ? new Date(now.getTime() + FAILURE_COOLDOWN_MS).toISOString()
      : null,
  };
}

export function nextChannelHealthOnSuccess({
  now,
  latencyMs,
}: {
  now: Date;
  latencyMs?: number | null;
}): ChannelSuccessHealth {
  return {
    status: "healthy",
    consecutiveFailures: 0,
    lastSuccessAt: now.toISOString(),
    rollingLatencyMs: normalizeLatencyMs(latencyMs),
    cooldownUntil: null,
    lastErrorCode: null,
    lastErrorMessage: null,
  };
}

function normalizeLatencyMs(value: number | null | undefined): number {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.max(0, Math.round(numericValue));
}

function truncate(value: string | null | undefined, maxLength: number): string | null {
  if (!value) return null;
  return value.slice(0, maxLength);
}
