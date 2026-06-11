"use client";

import { useEffect } from "react";

import { useWritingFocus } from "@/stores/writing-focus-store";

interface WritingFocusInitializerProps {
  storyId: string;
}

export function WritingFocusInitializer({ storyId }: WritingFocusInitializerProps) {
  const setStoryFocus = useWritingFocus((state) => state.setStoryFocus);
  const clearFocus = useWritingFocus((state) => state.clearFocus);

  useEffect(() => {
    setStoryFocus(storyId);

    return () => {
      clearFocus();
    };
  }, [clearFocus, setStoryFocus, storyId]);

  return null;
}
