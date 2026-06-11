import { NextResponse } from "next/server";
import {
  getBlueprintWithBeats,
  createBlueprint,
  updateBlueprint,
  deleteBlueprint,
} from "@/lib/db/queries/blueprints";
import { z } from "zod";

const createBlueprintSchema = z.object({
  template_id: z.string().uuid().optional(),
  title: z.string().min(1).max(200).optional(),
  synopsis: z.string().max(5000).optional(),
  settings: z.record(z.unknown()).optional(),
});

const updateBlueprintSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  synopsis: z.string().max(5000).optional(),
  settings: z.record(z.unknown()).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storyId: string }> },
) {
  try {
    const { storyId } = await params;
    const result = await getBlueprintWithBeats(storyId);

    if (!result) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({ data: result });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch blueprint" } },
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
    const parsed = createBlueprintSchema.safeParse(body);

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

    const blueprint = await createBlueprint(storyId, parsed.data);
    return NextResponse.json({ data: blueprint }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create blueprint";
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
    const parsed = updateBlueprintSchema.safeParse(body);

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

    const blueprint = await updateBlueprint(storyId, parsed.data);
    return NextResponse.json({ data: blueprint });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update blueprint";
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
    await deleteBlueprint(storyId);
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete blueprint";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
