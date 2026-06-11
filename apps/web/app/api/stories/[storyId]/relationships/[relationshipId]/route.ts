import { NextResponse } from "next/server";
import { updateRelationship, deleteRelationship } from "@/lib/db/queries/relationships";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storyId: string; relationshipId: string }> },
) {
  try {
    const { storyId, relationshipId } = await params;
    const body = await request.json();
    const relationship = await updateRelationship(storyId, relationshipId, body);
    return NextResponse.json({ data: relationship });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update relationship";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ storyId: string; relationshipId: string }> },
) {
  try {
    const { storyId, relationshipId } = await params;
    await deleteRelationship(storyId, relationshipId);
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete relationship";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
