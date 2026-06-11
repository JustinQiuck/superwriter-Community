import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  theme: "light" | "dark" | "system";
  focusMode: boolean;
  activePanel: "ai" | "references" | "outline" | null;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  toggleFocusMode: () => void;
  setActivePanel: (panel: "ai" | "references" | "outline" | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  theme: "system",
  focusMode: false,
  activePanel: null,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setTheme: (theme) => set({ theme }),
  toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
  setActivePanel: (panel) =>
    set((s) => ({ activePanel: s.activePanel === panel ? null : panel })),
}));
