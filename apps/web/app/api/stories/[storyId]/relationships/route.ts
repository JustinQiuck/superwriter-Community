import { NextResponse } from "next/server";
import {
  getRelationships,
  createRelationship,
} from "@/lib/db/queries/relationships";
import type { RelationshipType } from "@superwriter/shared";
import { z } from "zod";

const relationshipTypes = [
  "family", "romantic", "friendship", "rivalry", "mentor",
  "colleague", "student", "threatens", "protects", "manipulates",
  "informs", "knows_secret", "lives_in", "visits", "works_at",
  "participates", "causes", "affected_by", "owns", "uses",
  "occurs_at", "references", "custom",
] as const;

const createRelationshipSchema = z.object({
  from_entity_id: z.string().uuid(),
  to_entity_id: z.string().uuid(),
  type: z.enum(relationshipTypes),
  description: z.string().optional(),
  bidirectional: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storyId: string }> },
) {
  try {
    const { storyId } = await params;
    const relationships = await getRelationships(storyId);
    return NextResponse.json({ data: relationships });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch relationships" } },
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
    const parsed = createRelationshipSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } },
        { status: 400 },
      );
    }

    const relationship = await createRelationship(storyId, {
      ...parsed.data,
      type: parsed.data.type as RelationshipType,
    });
    return NextResponse.json({ data: relationship }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create relationship";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
