import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveEffectivePlan } from "@/lib/db/queries/plans";
import { AI_PLAN_PROVIDER } from "@superwriter/shared";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }

    const [{ data: profile }, { effectivePlan }] = await Promise.all([
      supabase
        .from("profiles")
        .select("ai_provider_preference, ai_model_preference")
        .eq("id", user.id)
        .single(),
      resolveEffectivePlan(supabase, user.id),
    ]);

    return NextResponse.json({
      ai_provider_preference: profile?.ai_provider_preference ?? "sw-free",
      ai_model_preference: profile?.ai_model_preference ?? "",
      ai_billing_provider: AI_PLAN_PROVIDER[effectivePlan],
    });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch preferences" } },
      { status: 500 },
    );
  }
}
