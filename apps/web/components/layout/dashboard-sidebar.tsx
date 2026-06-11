"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Library,
  GraduationCap,
  Settings,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { CreateStoryDialog } from "@/components/layout/create-story-dialog";
import { BrandLogo } from "@/components/brand-logo";

interface DashboardSidebarProps {
  displayName: string;
  avatarUrl?: string | null;
  email: string;
  isAdmin?: boolean;
}

export function DashboardSidebar({
  displayName,
  email,
  isAdmin: _isAdmin = false,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const navItems = [
    {
      label: "故事列表",
      href: "/dashboard",
      icon: Library,
    },
    {
      label: "迁移工作台",
      href: "/dashboard/imports",
      icon: Upload,
    },
    {
      label: "作品学习",
      href: "/dashboard/learning",
      icon: GraduationCap,
    },
    {
      label: "写作统计",
      href: "/dashboard/writing-stats",
      icon: BarChart3,
    },
    {
      label: "设置",
      href: "/dashboard/settings",
      icon: Settings,
    },
  ];

  const adminItems: typeof navItems = [];

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-sidebar-background transition-all duration-200",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex items-center gap-2 border-b p-4">
        <BrandLogo />
        {!collapsed && <span className="font-bold">SuperWriter</span>}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-6 w-6"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <nav className="space-y-1 p-2">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Button
                key={item.href}
                variant={isActive ? "secondary" : "ghost"}
                className={cn("w-full justify-start", collapsed && "px-2")}
                asChild
              >
                <Link href={item.href}>
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="ml-2">{item.label}</span>}
                </Link>
              </Button>
            );
          })}
          {adminItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Button
                key={item.href}
                variant={isActive ? "secondary" : "ghost"}
                className={cn("w-full justify-start", collapsed && "px-2")}
                asChild
              >
                <Link href={item.href}>
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="ml-2">{item.label}</span>}
                </Link>
              </Button>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="border-t p-2">
        <CreateStoryDialog
          triggerClassName={cn("w-full", collapsed ? "px-2" : "justify-start")}
          showTriggerLabel={!collapsed}
        />
      </div>

      <Separator />

      <div className="p-2">
        <div className={cn("flex items-center gap-2 px-2 py-1", collapsed && "justify-center")}>
          {!collapsed && (
            <div className="flex-1 truncate">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            </div>
          )}
          {collapsed && <ThemeToggle />}
        </div>
        <div className="flex items-center gap-1 mt-1">
          {!collapsed && <ThemeToggle />}
          <Button
            variant="ghost"
            className={cn("flex-1", collapsed ? "px-2" : "justify-start")}
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="ml-2">退出登录</span>}
          </Button>
        </div>
      </div>
    </aside>
  );
}
