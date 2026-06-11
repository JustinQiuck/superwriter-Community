"use client";

import { useUIStore } from "@/stores/ui-store";
import { useEffect } from "react";

export function FocusModeWrapper({
  children,
  sidebar,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}) {
  const focusMode = useUIStore((s) => s.focusMode);
  const toggleFocusMode = useUIStore((s) => s.toggleFocusMode);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        toggleFocusMode();
      }
      if (e.key === "Escape" && focusMode) {
        toggleFocusMode();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [focusMode, toggleFocusMode]);

  return (
    <div className="min-h-0 flex flex-1 gap-3 overflow-hidden px-4 pb-4 pt-1">
      {!focusMode && sidebar}
      <main
        className={`min-w-0 flex-1 overflow-auto ${
          focusMode ? "mx-auto max-w-4xl px-6 py-8" : ""
        }`}
      >
        {children}
      </main>
    </div>
  );
}
