import { getBlueprintChapters, getBlueprintWithBeats } from "@/lib/db/queries/blueprints";
import { getStoryById } from "@/lib/db/queries/stories";
import { BlueprintKanban } from "@/components/blueprint/blueprint-kanban";
import type { BlueprintBeat, BlueprintChapter } from "@/types/entity";

export default async function BlueprintPage({
  params,
}: {
  params: Promise<{ storyId: string }>;
}) {
  const { storyId } = await params;
  const [result, story] = await Promise.all([
    getBlueprintWithBeats(storyId),
    getStoryById(storyId),
  ]);
  const chapters = result?.blueprint
    ? await getBlueprintChapters(storyId, result.blueprint.id)
    : [];

  return (
    <BlueprintKanban
      storyId={storyId}
      story={story}
      blueprint={result?.blueprint ?? null}
      beats={(result?.beats ?? []) as BlueprintBeat[]}
      blueprintChapters={chapters as BlueprintChapter[]}
    />
  );
}
