import { createClient } from "@/lib/supabase/server";
import { getStoryById } from "@/lib/db/queries/stories";
import { notFound } from "next/navigation";
import { StorySettingsClient } from "./settings-client";

export default async function StorySettingsPage({
  params,
}: {
  params: Promise<{ storyId: string }>;
}) {
  const { storyId } = await params;
  const story = await getStoryById(storyId);

  if (!story) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || story.user_id !== user.id) notFound();

  return (
    <StorySettingsClient
      storyId={storyId}
      title={story.title}
      description={story.description ?? ""}
      genre={story.genre ?? ""}
      era={story.era ?? ""}
      status={story.status}
      language={story.language ?? "zh"}
      wordCountGoal={story.word_count_goal ?? 50000}
      dailyWordGoal={story.daily_word_goal ?? 1000}
    />
  );
}
