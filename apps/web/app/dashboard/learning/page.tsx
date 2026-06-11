import { getStories } from "@/lib/db/queries/stories";
import { WorkLearningClient } from "@/components/work-learning/work-learning-client";

export default async function WorkLearningPage() {
  const stories = await getStories();

  return (
    <WorkLearningClient
      stories={stories.map((story) => ({
        id: story.id,
        title: story.title,
      }))}
    />
  );
}
