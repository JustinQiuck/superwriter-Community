export type AICostBudgetDegradeAction =
  | "disable_paid_fallback"
  | "downgrade_model"
  | "queue_or_retry"
  | "reject";

export type AICostBudgetDecision = {
  allowPaidFallback: boolean;
  shouldReject: boolean;
  degradeAction: AICostBudgetDegradeAction | null;
  reason: string | null;
};

export async function resolveAICostBudgetDecision(): Promise<AICostBudgetDecision> {
  return {
    allowPaidFallback: false,
    shouldReject: false,
    degradeAction: null,
    reason: null,
  };
}
