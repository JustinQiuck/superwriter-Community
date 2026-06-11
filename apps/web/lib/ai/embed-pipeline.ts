import { embedText, segmentText } from "@/lib/ai/embedding";
import { storeArchivalMemory } from "@/lib/db/queries/memories";
import type { ArchivalSourceType } from "@superwriter/shared";

export function fireAndForgetEmbed(
  storyId: string,
  sourceType: ArchivalSourceType,
  sourceId: string,
  content: string,
  metadata: Record<string, unknown> = {},
): void {
  generateAndStoreEmbeddings(storyId, sourceType, sourceId, content, metadata)
    .catch((err) => console.error("[Memory] Embedding pipeline failed:", err));
}

async function generateAndStoreEmbeddings(
  storyId: string,
  sourceType: ArchivalSourceType,
  sourceId: string,
  content: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const segments = segmentText(content);

  const segmentsWithEmbeddings = [];
  for (const seg of segments) {
    const embedding = await embedText(seg.text);
    segmentsWithEmbeddings.push({ ...seg, embedding });
  }

  await storeArchivalMemory(
    storyId,
    sourceType,
    sourceId,
    segmentsWithEmbeddings,
    metadata,
  );
}
