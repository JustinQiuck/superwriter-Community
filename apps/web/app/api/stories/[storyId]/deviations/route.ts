import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getDeviationReports,
  getDeviationStats,
  updateDeviationStatus,
} from "@/lib/db/queries/deviations";
import type { DeviationStatus, DeviationType } from "@/types/deviation";
import { z } from "zod";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storyId: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 },
      );
    }

    const { storyId } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as DeviationStatus | null;
    const type = searchParams.get("type") as DeviationType | null;
    const beatIdParam = searchParams.get("beatId");
    const view = searchParams.get("view");

    if (view === "stats") {
      const stats = await getDeviationStats(storyId);
      return NextResponse.json({ data: stats });
    }

    let beatId: string | undefined;
    if (beatIdParam) {
      const parsedBeatId = z.string().uuid().safeParse(beatIdParam);
      if (!parsedBeatId.success) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "Invalid beatId" } },
          { status: 400 },
        );
      }
      beatId = parsedBeatId.data;
    }

    const reports = await getDeviationReports(storyId, {
      status: status ?? undefined,
      type: type ?? undefined,
      beatId,
    });
    return NextResponse.json({ data: reports });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch deviations";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}

const updateStatusSchema = z.object({
  reportId: z.string().uuid(),
  status: z.enum(["pending", "ignored", "fixed"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storyId: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 },
      );
    }

    const { storyId } = await params;
    const body = await request.json();
    const parsed = updateStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 },
      );
    }

    const updated = await updateDeviationStatus(
      storyId,
      parsed.data.reportId,
      parsed.data.status,
    );
    return NextResponse.json({ data: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update deviation";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
