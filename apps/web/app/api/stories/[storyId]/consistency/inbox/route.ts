import { NextResponse } from "next/server";
import { z } from "zod";

import {
  acceptMemoryInboxItem,
  listMemoryInboxFindings,
  updateConsistencyFindingStatus,
} from "@/lib/db/queries/consistency-findings";
import { createClient } from "@/lib/supabase/server";
import { assertStoryAccess } from "../access";

const querySchema = z.object({
  status: z.enum(["open", "accepted", "dismissed", "resolved", "all"]).default("open"),
  limit: z.coerce.number().int().min(1).max(50).default(50),
});

const patchSchema = z.object({
  findingId: z.string().uuid().or(z.string().min(1)),
  decision: z.enum(["accepted", "dismissed"]),
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
  const data = await listMemoryInboxFindings(supabase, storyId, {
    status: parsed.success ? parsed.data.status : "open",
    limit: parsed.success ? parsed.data.limit : 50,
  });

  return NextResponse.json({ data });
}

export async function PATCH(
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
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "参数无效" } },
      { status: 400 },
    );
  }

  const data = parsed.data.decision === "accepted"
    ? await acceptMemoryInboxItem(supabase, parsed.data.findingId, storyId)
    : await updateConsistencyFindingStatus(
        supabase,
        parsed.data.findingId,
        "dismissed",
        storyId,
      );

  return NextResponse.json({ data });
}
