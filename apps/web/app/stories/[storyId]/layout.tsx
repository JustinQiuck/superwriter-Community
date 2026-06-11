import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStoryById } from "@/lib/db/queries/stories";
import { StoryWorkspaceSidebar } from "@/components/layout/story-workspace-sidebar";
import { StoryWorkspaceHeader } from "@/components/layout/story-workspace-header";
import { FocusModeWrapper } from "@/components/layout/focus-mode-wrapper";
import { WritingFocusInitializer } from "@/components/story/writing-focus-initializer";

export default async function StoryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ storyId: string }>;
}) {
  const { storyId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const story = await getStoryById(storyId);
  if (!story) redirect("/dashboard");

  return (
    <div className="workspace-shell flex h-screen flex-col overflow-hidden">
      <WritingFocusInitializer storyId={storyId} />
      <StoryWorkspaceHeader story={story} />
      <FocusModeWrapper sidebar={<StoryWorkspaceSidebar storyId={storyId} />}>
        {children}
      </FocusModeWrapper>
    </div>
  );
}
