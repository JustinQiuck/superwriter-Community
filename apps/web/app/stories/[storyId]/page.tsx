import { getStoryById } from "@/lib/db/queries/stories";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { STORY_STATUS_LABELS, type StoryStatus } from "@superwriter/shared";

export default async function StoryOverviewRedirect({
  params,
}: {
  params: Promise<{ storyId: string }>;
}) {
  const { storyId } = await params;
  const story = await getStoryById(storyId);

  if (!story) notFound();

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold">{story.title}</h1>
        <Badge variant="secondary">
          {STORY_STATUS_LABELS[story.status as StoryStatus] ?? story.status}
        </Badge>
      </div>
      {story.description && (
        <p className="text-muted-foreground">{story.description}</p>
      )}
    </div>
  );
}
