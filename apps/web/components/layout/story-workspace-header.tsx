"use client";

import Link from "next/link";
import type { Story } from "@/types/entity";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";
import {
  ChevronRight,
  Settings,
  Maximize2,
  Minimize2,
  PenLine,
} from "lucide-react";

interface StoryWorkspaceHeaderProps {
  story: Story;
}

export function StoryWorkspaceHeader({ story }: StoryWorkspaceHeaderProps) {
  const { focusMode, toggleFocusMode } = useUIStore();

  if (focusMode) {
    return (
      <div className="absolute right-4 top-3 z-50 flex items-center gap-1 opacity-0 transition-opacity hover:opacity-100 focus-within:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="studio-command-button h-9 w-9 rounded-full"
          onClick={toggleFocusMode}
          title="退出专注模式 (Esc)"
        >
          <Minimize2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <header className="z-30 flex h-[60px] shrink-0 items-center justify-between px-4 pt-3">
      <div className="studio-glass studio-command-pill flex min-w-0 items-center gap-1.5 px-2 py-1">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-8 rounded-full px-3 text-foreground/82 hover:bg-workspace-paper/70 hover:text-foreground"
        >
          <Link href="/dashboard">
            <BrandLogo size="sm" />
            SuperWriter
          </Link>
        </Button>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/65" />
        <div className="flex min-w-0 items-center gap-2 pr-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--workspace-accent)]/10 text-[var(--workspace-accent)]">
            <PenLine className="h-3.5 w-3.5" />
          </span>
          <span
            className="max-w-[42vw] truncate text-sm font-semibold text-foreground md:max-w-[360px]"
            title={story.title}
          >
            {story.title}
          </span>
        </div>
      </div>
      <div className="studio-glass studio-command-pill flex items-center gap-1 p-1">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "studio-command-button h-8 w-8 rounded-full border-0 shadow-none",
            "focus-visible:ring-workspace-accent/35",
          )}
          onClick={toggleFocusMode}
          title="专注模式 (Ctrl+\\)"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
        <ThemeToggle />
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="studio-command-button h-8 w-8 rounded-full border-0 shadow-none"
        >
          <Link href={`/stories/${story.id}/settings`}>
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
