import { getStories } from "@/lib/db/queries/stories";
import { StoryList } from "@/components/layout/story-list";
import { CreateStoryDialog } from "@/components/layout/create-story-dialog";

export default async function DashboardPage() {
  const stories = await getStories();

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">我的故事</h1>
          <p className="text-muted-foreground">
            {stories.length} 个故事
          </p>
        </div>
        <CreateStoryDialog />
      </div>

      {stories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <h2 className="text-lg font-semibold">还没有故事</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            点击「新建故事」开始你的创作之旅
          </p>
          <CreateStoryDialog />
        </div>
      ) : (
        <StoryList stories={stories} />
      )}
    </div>
  );
}
