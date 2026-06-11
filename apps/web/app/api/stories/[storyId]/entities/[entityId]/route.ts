import { NextResponse } from "next/server";
import {
  getEntityById,
  updateEntity,
  deleteEntity,
} from "@/lib/db/queries/entities";
import {
  prepareEntitySaveSideEffects,
  runEntitySaveSideEffects,
} from "@/lib/writing/save-side-effects";
import { z } from "zod";

const updateEntitySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  data: z.record(z.unknown()).optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
  color: z.string().optional(),
  sort_order: z.number().int().optional(),
  status: z.string().optional(),
  timeline_date: z.string().optional(),
  cover_image_url: z.string().optional(),
  ai_context: z.string().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storyId: string; entityId: string }> },
) {
  try {
    const { storyId, entityId } = await params;
    const entity = await getEntityById(storyId, entityId);

    if (!entity) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Entity not found" } },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: entity });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch entity" } },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storyId: string; entityId: string }> },
) {
  try {
    const { storyId, entityId } = await params;
    const body = await request.json();
    const parsed = updateEntitySchema.safeParse(body);

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

    const previousEntity = await getEntityById(storyId, entityId);
    if (!previousEntity) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Entity not found" } },
        { status: 404 },
      );
    }

    const sideEffects = prepareEntitySaveSideEffects({
      storyId,
      entityId,
      previousEntity,
      updateInput: parsed.data,
    });
    const entity = await updateEntity(storyId, entityId, sideEffects.updateInput);

    runEntitySaveSideEffects(sideEffects).catch((err) =>
      console.error("[Writing] Save side effects failed:", err),
    );

    return NextResponse.json({ data: entity });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update entity";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ storyId: string; entityId: string }> },
) {
  try {
    const { storyId, entityId } = await params;
    await deleteEntity(storyId, entityId);
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete entity";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
