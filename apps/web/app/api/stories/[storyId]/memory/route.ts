import { NextResponse } from "next/server";
import {
  getCoreMemory,
  upsertCoreMemory,
  getArchivalMemoryStats,
} from "@/lib/db/queries/memories";
import { rebuildCoreMemory } from "@/lib/ai/core-memory-builder";
import type { CreatorPreferences } from "@/types/memory";
import { z } from "zod";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storyId: string }> },
) {
  try {
    const { storyId } = await params;
    const [coreMemory, archivalStats] = await Promise.all([
      getCoreMemory(storyId),
      getArchivalMemoryStats(storyId),
    ]);
    return NextResponse.json({
      data: {
        coreMemory,
        archivalStats,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch memory";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}

const updatePreferencesSchema = z.object({
  creatorPreferences: z
    .object({
      writingStyle: z.string(),
      tonePreference: z.string(),
      avgSentenceLength: z.string(),
      customNotes: z.string(),
    })
    .optional(),
  keyConstraints: z.array(z.string()).optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ storyId: string }> },
) {
  try {
    const { storyId } = await params;
    const body = await request.json();
    const parsed = updatePreferencesSchema.safeParse(body);

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

    await rebuildCoreMemory(storyId);

    const current = await getCoreMemory(storyId);
    const existingPrefs = current?.creatorPreferences;
    const inputPrefs = parsed.data.creatorPreferences;
    const mergedPreferences: CreatorPreferences = {
      writingStyle: inputPrefs?.writingStyle ?? existingPrefs?.writingStyle ?? "",
      tonePreference: inputPrefs?.tonePreference ?? existingPrefs?.tonePreference ?? "",
      avgSentenceLength: inputPrefs?.avgSentenceLength ?? existingPrefs?.avgSentenceLength ?? "",
      customNotes: inputPrefs?.customNotes ?? existingPrefs?.customNotes ?? "",
    };
    const mergedConstraints = parsed.data.keyConstraints ?? current?.keyConstraints;
    const updated = await upsertCoreMemory(storyId, {
      creatorPreferences: mergedPreferences,
      keyConstraints: mergedConstraints,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update memory";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
