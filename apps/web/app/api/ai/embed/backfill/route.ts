import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { segmentText, embedText } from "@/lib/ai/embedding";
import { storeArchivalMemory } from "@/lib/db/queries/memories";

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

    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get("storyId");
    if (!storyId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "storyId is required" } },
        { status: 400 },
      );
    }

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

    const { data: chapters } = await supabase
      .from("entities")
      .select("id, name, content, data")
      .eq("story_id", storyId)
      .eq("type", "chapter")
      .order("sort_order");

    if (!chapters || chapters.length === 0) {
      return NextResponse.json({
        data: { processed: 0, message: "没有找到章节内容" },
      });
    }

    let processed = 0;
    const errors: string[] = [];

    for (const chapter of chapters) {
      if (!chapter.content || chapter.content.trim().length === 0) continue;

      try {
        const segments = segmentText(chapter.content);
        const segmentsWithEmbeddings = [];

        for (const seg of segments) {
          const embedding = await embedText(seg.text);
          segmentsWithEmbeddings.push({ ...seg, embedding });
        }

        await storeArchivalMemory(storyId, "chapter", chapter.id, segmentsWithEmbeddings, {
          chapter_number: (chapter.data as Record<string, unknown>)?.chapter_number,
          chapter_name: chapter.name,
        });

        processed++;
      } catch (err) {
        errors.push(
          `Chapter ${chapter.name}: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      }
    }

    return NextResponse.json({
      data: {
        totalChapters: chapters.length,
        processed,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Backfill failed";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
