import { NextResponse } from "next/server";
import { getEntities, createEntity } from "@/lib/db/queries/entities";
import { z } from "zod";
import type { EntityType } from "@superwriter/shared";

const createEntitySchema = z.object({
  type: z.enum([
    "character",
    "location",
    "event",
    "chapter",
    "scene",
    "item",
    "culture",
    "book",
    "reference",
    "economy",
    "faction",
    "magic_system",
  ]),
  name: z.string().min(1).max(200),
  data: z.record(z.unknown()).optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
  color: z.string().optional(),
  sort_order: z.number().int().optional(),
  status: z.string().optional(),
  timeline_date: z.string().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storyId: string }> },
) {
  try {
    const { storyId } = await params;
    const url = new URL(_request.url);
    const type = url.searchParams.get("type") as EntityType | null;

    const entities = await getEntities(storyId, type ?? undefined);
    return NextResponse.json({
      data: entities,
      meta: { total: entities.length },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch entities" } },
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
    const body = await request.json();
    const parsed = createEntitySchema.safeParse(body);

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

    const entity = await createEntity(storyId, parsed.data);
    return NextResponse.json({ data: entity }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create entity";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
