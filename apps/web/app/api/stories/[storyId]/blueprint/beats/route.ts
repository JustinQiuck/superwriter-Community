import { NextResponse } from "next/server";
import {
  getBeats,
  createBeat,
  createBeats,
  updateBeat,
  deleteBeat,
  reorderBeats,
  getBlueprint,
} from "@/lib/db/queries/blueprints";
import { rebuildCoreMemory } from "@/lib/ai/core-memory-builder";
import { addRecallMemory } from "@/lib/db/queries/memories";
import { z } from "zod";
import type { BeatType, BeatStatus } from "@superwriter/shared";

const beatInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  beat_type: z.enum([
    "setup", "inciting_incident", "rising_action", "midpoint",
    "crisis", "climax", "falling_action", "resolution",
    "turning_point", "reveal", "custom",
  ]).optional(),
  position_pct: z.number().min(0).max(100).optional(),
  emotion_target: z.number().int().min(-10).max(10).optional(),
  suggested_character_ids: z.array(z.string().uuid()).optional(),
  suggested_location_ids: z.array(z.string().uuid()).optional(),
  synopsis: z.string().max(5000).optional(),
  content: z.record(z.unknown()).optional(),
  sort_order: z.number().int().min(0).optional(),
});

const updateBeatSchema = beatInputSchema.partial().extend({
  status: z.enum(["planned", "writing", "completed"]).optional(),
});

const reorderSchema = z.object({
  ordered_ids: z.array(z.string().uuid()),
});

const batchCreateSchema = z.object({
  beats: z.array(beatInputSchema),
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

    const beats = await getBeats(storyId, blueprint.id);
    return NextResponse.json({ data: beats });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch beats" } },
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

    if (body.beats && Array.isArray(body.beats)) {
      const parsed = batchCreateSchema.safeParse(body);
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
      const beats = await createBeats(storyId, blueprint.id, parsed.data.beats);
      return NextResponse.json({ data: beats }, { status: 201 });
    }

    const parsed = beatInputSchema.safeParse(body);
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

    const beat = await createBeat(storyId, blueprint.id, {
      ...parsed.data,
      beat_type: parsed.data.beat_type as BeatType | undefined,
    });
    return NextResponse.json({ data: beat }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create beat";
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

    if (body.ordered_ids) {
      const parsed = reorderSchema.safeParse(body);
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
      await reorderBeats(storyId, parsed.data.ordered_ids);
      return NextResponse.json({ data: { reordered: true } });
    }

    const beatIdResult = z.string().uuid().safeParse(body.beat_id);
    if (!beatIdResult.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "beat_id must be a valid UUID" } },
        { status: 400 },
      );
    }

    const parsed = updateBeatSchema.safeParse(body);
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

    const beat = await updateBeat(storyId, beatIdResult.data, {
      ...parsed.data,
      beat_type: parsed.data.beat_type as BeatType | undefined,
      status: parsed.data.status as BeatStatus | undefined,
    });

    if (parsed.data.status !== undefined) {
      rebuildCoreMemory(storyId).catch((err) =>
        console.error("[Memory] Core rebuild failed:", err),
      );
      addRecallMemory(
        storyId,
        "blueprint_change",
        `节拍「${beat?.title ?? ""}」状态变更为${parsed.data.status}`,
        { beatId: beatIdResult.data, beatTitle: beat?.title, newStatus: parsed.data.status },
      ).catch((err) =>
        console.error("[Memory] Recall add failed:", err),
      );
    }

    return NextResponse.json({ data: beat });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update beat";
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
    const beatId = searchParams.get("beat_id");

    if (!beatId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "beat_id is required" } },
        { status: 400 },
      );
    }

    await deleteBeat(storyId, beatId);
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete beat";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
