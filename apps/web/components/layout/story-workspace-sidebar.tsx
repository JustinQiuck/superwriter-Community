"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BookOpen,
  Users,
  MapPin,
  Calendar,
  GitBranch,
  Clock,
  FileText,
  Settings,
  BarChart3,
  Sparkles,
  Download,
  LayoutGrid,
} from "lucide-react";

interface StoryWorkspaceSidebarProps {
  storyId: string;
}

const navGroups = [
  {
    label: "写作",
    items: [
      { label: "概览", href: "/overview", icon: BookOpen, accent: "var(--workspace-accent)" },
      { label: "编辑器", href: "/editor", icon: FileText, accent: "var(--module-editor)" },
      { label: "蓝图", href: "/blueprint", icon: LayoutGrid, accent: "var(--module-blueprint)" },
    ],
  },
  {
    label: "世界",
    items: [
      { label: "角色", href: "/entities/characters", icon: Users, accent: "var(--module-character)" },
      { label: "地点", href: "/entities/locations", icon: MapPin, accent: "var(--module-location)" },
      { label: "阵营", href: "/entities/factions", icon: Users, accent: "var(--module-character)" },
      { label: "规则设定", href: "/entities/magic-systems", icon: Sparkles, accent: "var(--workspace-ai)" },
      { label: "事件", href: "/entities/events", icon: Calendar, accent: "var(--module-timeline)" },
      { label: "关系图谱", href: "/graph", icon: GitBranch, accent: "var(--module-blueprint)" },
      { label: "时间线", href: "/timeline", icon: Clock, accent: "var(--module-timeline)" },
    ],
  },
  {
    label: "输出",
    items: [
      { label: "写作统计", href: "/stats", icon: BarChart3, accent: "var(--module-editor)" },
      { label: "编译导出", href: "/compile", icon: Download, accent: "var(--module-timeline)" },
    ],
  },
  {
    label: "设置",
    items: [
      { label: "AI 助手", href: "/ai", icon: Sparkles, accent: "var(--workspace-ai)" },
      { label: "设置", href: "/settings", icon: Settings, accent: "var(--workspace-accent)" },
    ],
  },
];

type NavItemStyle = CSSProperties & {
  "--item-accent": string;
};

export function StoryWorkspaceSidebar({ storyId }: StoryWorkspaceSidebarProps) {
  const pathname = usePathname();
  const basePath = `/stories/${storyId}`;

  return (
    <aside className="studio-rail w-56 shrink-0 overflow-hidden rounded-[1.35rem]">
      <ScrollArea className="h-full">
        <nav className="space-y-4 p-3">
          {navGroups.map((group) => (
            <section key={group.label} className="space-y-1.5">
              <p className="px-2.5 text-[11px] font-semibold text-muted-foreground/72">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const href = `${basePath}${item.href}`;
                  const isActive =
                    pathname === href ||
                    (item.href === "/overview" && pathname === basePath) ||
                    (item.href !== "/overview" && pathname.startsWith(`${href}/`));

                  return (
                    <Button
                      key={item.href}
                      asChild
                      variant="ghost"
                      size="sm"
                      style={{ "--item-accent": item.accent } as NavItemStyle}
                      className={cn(
                        "relative h-9 w-full justify-start rounded-xl px-2.5 text-sm text-foreground/78 transition-all",
                        "hover:bg-workspace-paper/70 hover:text-foreground dark:hover:bg-workspace-muted",
                        "before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-[var(--item-accent)] before:opacity-0",
                        isActive &&
                          "bg-workspace-paper text-foreground shadow-[0_8px_20px_rgb(60_49_38_/_0.07)] before:opacity-100 dark:bg-workspace-surface-strong dark:shadow-[0_10px_24px_rgb(0_0_0_/_0.24)]",
                      )}
                    >
                      <Link href={href}>
                        <item.icon
                          className={cn(
                            "mr-2 h-4 w-4 text-muted-foreground transition-colors",
                            isActive && "text-[var(--item-accent)]",
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </Button>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}
