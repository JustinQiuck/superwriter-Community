import { create } from "zustand";

interface StoryState {
  currentStoryId: string | null;
  currentChapterId: string | null;

  setCurrentStory: (storyId: string | null) => void;
  setCurrentChapter: (chapterId: string | null) => void;
}

export const useStoryStore = create<StoryState>((set) => ({
  currentStoryId: null,
  currentChapterId: null,

  setCurrentStory: (storyId) =>
    set({ currentStoryId: storyId, currentChapterId: null }),
  setCurrentChapter: (chapterId) => set({ currentChapterId: chapterId }),
}));
