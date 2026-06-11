import { NextResponse } from "next/server";
import { getTemplates } from "@/lib/db/queries/templates";

export async function GET() {
  try {
    const templates = await getTemplates();
    return NextResponse.json({ data: templates });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch templates";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
