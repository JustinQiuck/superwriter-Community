import { NextResponse } from "next/server";
import { z } from "zod";
import {
  listTechniqueCards,
  saveTechniqueCards,
} from "@/lib/db/queries/work-learning";
import { createClient } from "@/lib/supabase/server";
import { saveTechniqueCardsSchema } from "@/lib/work-learning/schema";

const querySchema = z.object({
  skillId: z.string().optional(),
  targetStoryId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 },
      );
    }

    const params = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = querySchema.safeParse(params);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "查询参数无效",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    }

    const cards = await listTechniqueCards(user.id, parsed.data);
    return NextResponse.json({ data: cards });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list technique cards";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = saveTechniqueCardsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "套路卡数据无效",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    }

    if (parsed.data.targetStoryId) {
      const { data: story, error: storyError } = await supabase
        .from("stories")
        .select("id")
        .eq("id", parsed.data.targetStoryId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (storyError) throw storyError;
      if (!story) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "目标故事不存在或无权访问" } },
          { status: 404 },
        );
      }
    }

    const cards = await saveTechniqueCards(
      user.id,
      parsed.data.cards.map((card) => ({
        card,
        sourceTitle: parsed.data.sourceTitle,
        sourceHash: parsed.data.sourceHash,
        sourceLength: parsed.data.sourceLength,
        targetStoryId: parsed.data.targetStoryId,
        tags: parsed.data.tags,
      })),
    );

    return NextResponse.json({ data: cards }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save technique cards";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
