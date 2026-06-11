import { NextResponse } from "next/server";
import {
  getStoryById,
  updateStory,
  deleteStory,
} from "@/lib/db/queries/stories";
import { z } from "zod";

const updateStorySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  genre: z.string().max(100).optional(),
  era: z.string().max(100).optional(),
  status: z.enum(["draft", "active", "completed", "archived"]).optional(),
  cover_image_url: z.string().url().optional(),
  settings: z.record(z.unknown()).optional(),
  word_count_goal: z.number().int().min(0).optional(),
  daily_word_goal: z.number().int().min(0).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storyId: string }> },
) {
  try {
    const { storyId } = await params;
    const story = await getStoryById(storyId);

    if (!story) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: story });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch story" } },
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
    const parsed = updateStorySchema.safeParse(body);

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

    const story = await updateStory(storyId, parsed.data);
    return NextResponse.json({ data: story });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update story";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ storyId: string }> },
) {
  try {
    const { storyId } = await params;
    await deleteStory(storyId);
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete story";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
