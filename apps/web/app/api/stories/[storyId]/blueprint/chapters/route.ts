import { NextResponse } from "next/server";
import {
  getBlueprintChapters,
  createBlueprintChapter,
  updateBlueprintChapter,
  deleteBlueprintChapter,
} from "@/lib/db/queries/blueprints";
import { getBlueprint } from "@/lib/db/queries/blueprints";
import { z } from "zod";

const createChapterSchema = z.object({
  volume_id: z.string().uuid().optional(),
  beat_id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  synopsis: z.string().max(5000).optional(),
  target_word_count: z.number().int().min(0).optional(),
  target_emotion: z.number().int().min(-10).max(10).optional(),
  content_guidance: z.record(z.unknown()).optional(),
  sort_order: z.number().int().min(0).optional(),
});

const updateChapterSchema = z.object({
  chapter_id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  synopsis: z.string().max(5000).optional(),
  beat_id: z.string().uuid().nullable().optional(),
  target_word_count: z.number().int().min(0).optional(),
  target_emotion: z.number().int().min(-10).max(10).optional(),
  content_guidance: z.record(z.unknown()).optional(),
  sort_order: z.number().int().min(0).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storyId: string }> },
) {
  try {
    const { storyId } = await params;
    const blueprint = await getBlueprint(storyId);

    if (!blueprint) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Blueprint not found" } },
        { status: 404 },
      );
    }

    const chapters = await getBlueprintChapters(storyId, blueprint.id);
    return NextResponse.json({ data: chapters });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch blueprint chapters" } },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storyId: string }> },
) {
  try {
    const { storyId } = await params;
    const blueprint = await getBlueprint(storyId);

    if (!blueprint) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Blueprint not found" } },
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = createChapterSchema.safeParse(body);

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

    const chapter = await createBlueprintChapter(storyId, blueprint.id, parsed.data);
    return NextResponse.json({ data: chapter }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create blueprint chapter";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storyId: string }> },
) {
  try {
    const { storyId } = await params;
    const body = await request.json();
    const parsed = updateChapterSchema.safeParse(body);

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

    const { chapter_id, ...updates } = parsed.data;
    const cleanUpdates = { ...updates, beat_id: updates.beat_id ?? undefined };
    const chapter = await updateBlueprintChapter(storyId, chapter_id, cleanUpdates);
    return NextResponse.json({ data: chapter });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update blueprint chapter";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ storyId: string }> },
) {
  try {
    const { storyId } = await params;
    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get("chapter_id");

    if (!chapterId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "chapter_id is required" } },
        { status: 400 },
      );
    }

    await deleteBlueprintChapter(storyId, chapterId);
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete blueprint chapter";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
