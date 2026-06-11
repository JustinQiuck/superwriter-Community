import { NextResponse } from "next/server";
import {
  getVolumes,
  createVolume,
  updateVolume,
  deleteVolume,
} from "@/lib/db/queries/blueprints";
import { getBlueprint } from "@/lib/db/queries/blueprints";
import { z } from "zod";

const createVolumeSchema = z.object({
  title: z.string().min(1).max(200),
  synopsis: z.string().max(5000).optional(),
  sort_order: z.number().int().min(0).optional(),
});

const updateVolumeSchema = z.object({
  volume_id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  synopsis: z.string().max(5000).optional(),
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

    const volumes = await getVolumes(storyId, blueprint.id);
    return NextResponse.json({ data: volumes });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch volumes" } },
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
    const parsed = createVolumeSchema.safeParse(body);

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

    const volume = await createVolume(storyId, blueprint.id, parsed.data);
    return NextResponse.json({ data: volume }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create volume";
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
    const parsed = updateVolumeSchema.safeParse(body);

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

    const { volume_id, ...updates } = parsed.data;
    const volume = await updateVolume(storyId, volume_id, updates);
    return NextResponse.json({ data: volume });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update volume";
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
    const volumeId = searchParams.get("volume_id");

    if (!volumeId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "volume_id is required" } },
        { status: 400 },
      );
    }

    await deleteVolume(storyId, volumeId);
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete volume";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
