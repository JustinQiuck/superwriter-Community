import { NextResponse } from "next/server";
import { getStories, createStory } from "@/lib/db/queries/stories";
import { z } from "zod";

const createStorySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  genre: z.string().max(100).optional(),
  era: z.string().max(100).optional(),
});

export async function GET() {
  try {
    const stories = await getStories();
    return NextResponse.json({ data: stories });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch stories" } },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createStorySchema.safeParse(body);

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

    const story = await createStory(parsed.data);
    return NextResponse.json({ data: story }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create story";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
