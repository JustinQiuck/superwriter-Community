import type { SupabaseClient } from "@supabase/supabase-js";
import type { AIPlan } from "@superwriter/shared";

export type AIPlanProfile = {
  ai_plan: AIPlan;
  ai_credits_used: number;
  ai_credits: number;
  ai_plan_expires_at: string | null;
};

export type PlanDisplayConfig = {
  plan_key: AIPlan;
  display_name: string;
  description: string | null;
  monthly_credits: number;
  tier_rank: number;
  highlight_features: string[];
  is_enabled: boolean;
};

export type EffectivePlanResult = {
  effectivePlan: AIPlan;
  profile: AIPlanProfile | null;
};

export function fallbackPlanDisplayConfigs(): PlanDisplayConfig[] {
  return [];
}

export async function listPlanDisplayConfigs(): Promise<PlanDisplayConfig[]> {
  return [];
}

export async function resolveEffectivePlan(
  _supabase: SupabaseClient,
  _userId: string,
): Promise<EffectivePlanResult> {
  return { effectivePlan: "free", profile: null };
}

export function isQuotaExceeded(): boolean {
  return false;
}

export async function redeemCode() {
  return {
    success: false as const,
    code: "COMMUNITY_UNAVAILABLE",
    message: "社区版不提供此功能",
  };
}
