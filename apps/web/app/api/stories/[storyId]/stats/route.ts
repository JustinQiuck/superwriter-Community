import { getWritingStats } from "@/lib/db/queries/stats";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storyId: string }> },
) {
  const { storyId } = await params;
  const stats = await getWritingStats(storyId);
  if (!stats) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: stats });
}
