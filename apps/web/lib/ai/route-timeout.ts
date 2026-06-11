export const AI_ROUTE_DEFAULT_ABORT_AFTER_MS = 55_000;
export const AI_ROUTE_MAX_ABORT_AFTER_MS = 110_000;
export const AI_ROUTE_MAX_RETRIES = 0;

type RouteTimeoutPolicy = {
  primaryTimeoutMs?: number | null;
} | null | undefined;

export function resolveAIRouteAbortAfterMs(policy?: RouteTimeoutPolicy): number {
  const configured = policy?.primaryTimeoutMs;
  if (typeof configured !== "number" || !Number.isFinite(configured)) {
    return AI_ROUTE_DEFAULT_ABORT_AFTER_MS;
  }
  return Math.min(
    AI_ROUTE_MAX_ABORT_AFTER_MS,
    Math.max(1_000, Math.round(configured)),
  );
}

export function createAIRouteTimeout(policyOrTimeoutMs?: RouteTimeoutPolicy | number) {
  const abortAfterMs = typeof policyOrTimeoutMs === "number"
    ? Math.min(AI_ROUTE_MAX_ABORT_AFTER_MS, Math.max(1_000, Math.round(policyOrTimeoutMs)))
    : resolveAIRouteAbortAfterMs(policyOrTimeoutMs);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), abortAfterMs);

  return {
    signal: controller.signal,
    abortAfterMs,
    clear: () => clearTimeout(timeout),
  };
}
