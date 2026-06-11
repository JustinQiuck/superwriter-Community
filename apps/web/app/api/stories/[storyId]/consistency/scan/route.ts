import { NextResponse } from "next/server";
import { z } from "zod";
import { AI_PLAN_PROVIDER } from "@superwriter/shared";

import { buildMemoryContext } from "@/lib/ai/context-builder";
import {
  createCreditLedgerClient,
  refundAIUsageCredits,
  reserveAIUsageCredits,
  settleAIUsageCredits,
} from "@/lib/ai/credit-ledger";
import { resolveAICreditPreview } from "@/lib/ai/credit-policy";
import { runConsistencyCheck } from "@/lib/ai/consistency/checker";
import { createConsistencyFindings } from "@/lib/db/queries/consistency-findings";
import { resolveEffectivePlan } from "@/lib/db/queries/plans";
import { createClient } from "@/lib/supabase/server";
import { assertStoryAccess } from "../access";

const scanSchema = z.object({
  chapterId: z.string().uuid().or(z.string().min(1)),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storyId: string }> },
) {
  const { storyId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "请先登录" } },
      { status: 401 },
    );
  }

  const accessError = await assertStoryAccess(supabase, storyId, user.id);
  if (accessError) return accessError;

  const body = await request.json().catch(() => null);
  const parsed = scanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "请选择要检查的章节" } },
      { status: 400 },
    );
  }

  const { data: chapter, error: chapterError } = await supabase
    .from("entities")
    .select("id, name, content")
    .eq("story_id", storyId)
    .eq("id", parsed.data.chapterId)
    .eq("type", "chapter")
    .single();

  if (chapterError || !chapter) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "章节不存在" } },
      { status: 404 },
    );
  }

  const { effectivePlan } = await resolveEffectivePlan(supabase, user.id);
  const provider = AI_PLAN_PROVIDER[effectivePlan];
  const preview = await resolveAICreditPreview({
    routeKey: "consistency_chapter_scan",
    plan: effectivePlan,
    provider,
    hasEnhancedContext: effectivePlan === "pro",
    priceTier: effectivePlan === "pro" ? "stable" : "standard",
    contextTier: effectivePlan === "pro" ? "long" : "standard",
  });

  if (preview.isDisabled) {
    return NextResponse.json(
      { error: { code: "AI_ACTION_DISABLED", message: "本章一致性检查当前不可用" } },
      { status: 403 },
    );
  }

  const ledger = createCreditLedgerClient();
  const startedAt = Date.now();
  const reservation = await reserveAIUsageCredits({
    supabase: ledger,
    requestId: crypto.randomUUID(),
    userId: user.id,
    storyId,
    provider,
    model: "consistency-checker",
    mode: "consistency_chapter_scan",
    routeKey: "consistency_chapter_scan",
    creditsCost: preview.creditsCost,
    billingReason: preview.chargeBehavior,
    planKey: effectivePlan,
    callScope: "user_plan_scoped",
    priceTier: preview.priceTier,
    contextTier: preview.contextTier,
    telemetryMetadata: { consistency_scan_scope: "current_chapter" },
  });

  if (!reservation.ok) {
    return NextResponse.json(
      { error: { code: "QUOTA_EXCEEDED", message: "AI 调用暂不可用" } },
      { status: 429 },
    );
  }

  try {
    const chapterText = String(chapter.content ?? "");
    const memoryContext = await buildMemoryContext(storyId, chapterText);
    const findings = await runConsistencyCheck({
      storyId,
      chapterId: String(chapter.id),
      sourceType: "chapter_scan",
      sourceId: String(chapter.id),
      sourceRouteKey: "consistency_chapter_scan",
      sourceRef: String(chapter.name ?? "当前章节"),
      generatedText: chapterText,
      memoryContext,
    });
    const data = await createConsistencyFindings(supabase, findings);

    await settleAIUsageCredits({
      supabase: ledger,
      usageId: reservation.usageId,
      userId: user.id,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - startedAt,
      telemetryMetadata: {
        finish_state: "settled",
        consistency_findings_count: data.length,
      },
    });

    return NextResponse.json({ data });
  } catch (error) {
    await refundAIUsageCredits({
      supabase: ledger,
      usageId: reservation.usageId,
      userId: user.id,
      reason: "consistency_scan_failed",
      latencyMs: Date.now() - startedAt,
      telemetryMetadata: {
        failure_reason: error instanceof Error ? error.message : "unknown",
      },
    }).catch(() => {});

    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "一致性检查失败" } },
      { status: 500 },
    );
  }
}
