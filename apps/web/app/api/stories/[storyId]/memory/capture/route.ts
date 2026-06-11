import { NextResponse } from "next/server";
import { z } from "zod";
import { rebuildCoreMemory } from "@/lib/ai/core-memory-builder";
import { addRecallMemory } from "@/lib/db/queries/memories";
import { createClient } from "@/lib/supabase/server";
import { buildMemoryCaptureSummary } from "@/lib/writing/memory-capture";

const MAX_CAPTURE_BODY_BYTES = 8 * 1024;

const captureSchema = z.object({
  type: z.enum([
    "character_state",
    "foreshadowing",
    "rule",
    "location_detail",
    "author_preference",
  ]),
  text: z.string().trim().min(1).max(2000),
  source: z.enum(["selection", "ai_draft", "manual"]).default("manual"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storyId: string }> },
) {
  try {
    const { storyId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Unauthenticated" } },
        { status: 401 },
      );
    }

    const { data: story, error: storyError } = await supabase
      .from("stories")
      .select("id")
      .eq("id", storyId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (storyError) throw storyError;

    if (!story) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 },
      );
    }

    const contentLength = request.headers.get("content-length");
    const contentLengthBytes = contentLength ? Number(contentLength) : 0;

    if (
      Number.isFinite(contentLengthBytes) &&
      contentLengthBytes > MAX_CAPTURE_BODY_BYTES
    ) {
      return NextResponse.json(
        { error: { code: "PAYLOAD_TOO_LARGE", message: "Payload too large" } },
        { status: 413 },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = captureSchema.safeParse(body);

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

    const summary = buildMemoryCaptureSummary(parsed.data);

    await addRecallMemory(storyId, "ai_interaction", summary, {
      captureType: parsed.data.type,
      source: parsed.data.source,
      capturedByUser: true,
      capturedText: parsed.data.text,
    });

    try {
      await rebuildCoreMemory(storyId);
    } catch (err) {
      console.error("[Memory] Core rebuild failed:", err);
    }

    return NextResponse.json({ data: { summary } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to capture memory";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
