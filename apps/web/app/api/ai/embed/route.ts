import { NextResponse } from "next/server";
import { embedText, segmentText } from "@/lib/ai/embedding";
import { storeArchivalMemory } from "@/lib/db/queries/memories";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { ArchivalSourceType } from "@superwriter/shared";

const embedSchema = z.object({
  storyId: z.string().uuid(),
  sourceType: z.enum(["chapter", "entity", "interaction"]),
  sourceId: z.string().uuid(),
  content: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = embedSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    }

    const { storyId, sourceType, sourceId, content, metadata } = parsed.data;

    const { data: story } = await supabase
      .from("stories")
      .select("id")
      .eq("id", storyId)
      .eq("user_id", user.id)
      .single();
    if (!story) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Story not found or access denied" } },
        { status: 403 },
      );
    }

    const segments = segmentText(content);
    const segmentsWithEmbeddings = [];

    for (const seg of segments) {
      const embedding = await embedText(seg.text);
      segmentsWithEmbeddings.push({ ...seg, embedding });
    }

    await storeArchivalMemory(
      storyId,
      sourceType as ArchivalSourceType,
      sourceId,
      segmentsWithEmbeddings,
      metadata ?? {},
    );

    return NextResponse.json({
      data: {
        segmentsGenerated: segmentsWithEmbeddings.length,
        sourceId,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Embedding generation failed";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
