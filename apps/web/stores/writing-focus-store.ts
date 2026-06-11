"use client";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { CursorContext, FocusPayload } from "@/types/ai";

export type FocusSource = "editor" | "blueprint" | "manual";

interface WritingFocusState {
  storyId: string | null;
  chapterId: string | null;
  beatId: string | null;
  cursorContext: CursorContext | null;
  focusSource: FocusSource | null;
  setStoryFocus: (storyId: string) => void;
  setEditorFocus: (chapterId: string, cursorContext?: CursorContext | null) => void;
  setBlueprintFocus: (beatId: string | null) => void;
  setDerivedBeatFocus: (beatId: string | null) => void;
  updateCursorContext: (cursorContext: CursorContext | null) => void;
  clearFocus: () => void;
}

export function selectFocusPayload(state: WritingFocusState): FocusPayload | null {
  if (!state.storyId) return null;

  return {
    storyId: state.storyId,
    chapterId: state.chapterId,
    beatId: state.beatId,
    cursorContext: state.cursorContext,
  };
}

export function useFocusPayload() {
  return useWritingFocus(useShallow(selectFocusPayload));
}

export const useWritingFocus = create<WritingFocusState>((set) => ({
  storyId: null,
  chapterId: null,
  beatId: null,
  cursorContext: null,
  focusSource: null,

  setStoryFocus: (storyId) =>
    set((state) => {
      if (state.storyId === storyId) return state;

      return {
        storyId,
        chapterId: null,
        beatId: null,
        cursorContext: null,
        focusSource: "manual",
      };
    }),

  setEditorFocus: (chapterId, cursorContext) =>
    set((state) => {
      const chapterChanged = state.chapterId !== chapterId;

      return {
        chapterId,
        cursorContext:
          cursorContext === undefined
            ? chapterChanged
              ? null
              : state.cursorContext
            : cursorContext,
        focusSource: "editor",
      };
    }),

  setBlueprintFocus: (beatId) =>
    set({
      beatId,
      focusSource: "blueprint",
    }),

  setDerivedBeatFocus: (beatId) =>
    set((state) => ({
      beatId,
      focusSource: state.focusSource,
    })),

  updateCursorContext: (cursorContext) =>
    set({
      cursorContext,
      focusSource: "editor",
    }),

  clearFocus: () =>
    set({
      storyId: null,
      chapterId: null,
      beatId: null,
      cursorContext: null,
      focusSource: null,
    }),
}));
