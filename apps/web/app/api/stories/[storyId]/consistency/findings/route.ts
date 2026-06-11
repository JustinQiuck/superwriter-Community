import { NextResponse } from "next/server";
import { z } from "zod";

import { listConsistencyFindings } from "@/lib/db/queries/consistency-findings";
import { createClient } from "@/lib/supabase/server";
import { assertStoryAccess } from "../access";

const querySchema = z.object({
  status: z.enum(["open", "accepted", "dismissed", "resolved", "all"]).default("open"),
  chapterId: z.string().trim().min(1).nullable().optional(),
  sourceType: z.enum(["ai_generation", "chapter_scan", "manual", "memory_inbox"]).optional(),
  sourceId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(
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

  const parsed = querySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "查询参数无效" } },
      { status: 400 },
    );
  }

  const data = await listConsistencyFindings(supabase, storyId, {
    status: parsed.data.status,
    chapterId: parsed.data.chapterId,
    sourceType: parsed.data.sourceType,
    sourceId: parsed.data.sourceId,
    limit: parsed.data.limit,
  });

  return NextResponse.json({ data });
}
