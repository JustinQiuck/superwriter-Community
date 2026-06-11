import { create } from "zustand";
import type {
  StoryBlueprint,
  BlueprintBeat,
} from "@/types/entity";
import type { BeatStatus } from "@superwriter/shared";

interface BlueprintState {
  blueprint: StoryBlueprint | null;
  beats: BlueprintBeat[];
  selectedBeatId: string | null;
  viewMode: "kanban" | "list" | "deviation" | "arc" | "foreshadowing";
  isDetailOpen: boolean;
  isLoading: boolean;

  setBlueprint: (blueprint: StoryBlueprint | null) => void;
  setBeats: (beats: BlueprintBeat[]) => void;
  selectBeat: (beatId: string | null) => void;
  setViewMode: (mode: "kanban" | "list" | "deviation" | "arc" | "foreshadowing") => void;
  setDetailOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
  updateBeat: (beatId: string, updates: Partial<BlueprintBeat>) => void;
  removeBeat: (beatId: string) => void;
  addBeat: (beat: BlueprintBeat) => void;
  reorderBeats: (orderedIds: string[]) => void;
}

export const useBlueprintStore = create<BlueprintState>((set, get) => ({
  blueprint: null,
  beats: [],
  selectedBeatId: null,
  viewMode: "kanban",
  isDetailOpen: false,
  isLoading: true,

  setBlueprint: (blueprint) => set({ blueprint }),
  setBeats: (beats) => set({ beats }),
  selectBeat: (beatId) => set({ selectedBeatId: beatId, isDetailOpen: !!beatId }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setDetailOpen: (open) => set({ isDetailOpen: open, selectedBeatId: open ? get().selectedBeatId : null }),
  setLoading: (loading) => set({ isLoading: loading }),

  updateBeat: (beatId, updates) =>
    set((state) => ({
      beats: state.beats.map((b) => (b.id === beatId ? { ...b, ...updates } : b)),
    })),

  removeBeat: (beatId) =>
    set((state) => ({
      beats: state.beats.filter((b) => b.id !== beatId),
      selectedBeatId: state.selectedBeatId === beatId ? null : state.selectedBeatId,
      isDetailOpen: state.selectedBeatId === beatId ? false : state.isDetailOpen,
    })),

  addBeat: (beat) =>
    set((state) => ({ beats: [...state.beats, beat] })),

  reorderBeats: (orderedIds) =>
    set((state) => {
      const beatMap = new Map(state.beats.map((b) => [b.id, b]));
      const reordered = orderedIds
        .map((id, index) => {
          const beat = beatMap.get(id);
          return beat ? { ...beat, sort_order: index } : null;
        })
        .filter(Boolean) as BlueprintBeat[];
      return { beats: reordered };
    }),
}));
