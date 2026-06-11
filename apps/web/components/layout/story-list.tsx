"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STORY_STATUS_LABELS, type StoryStatus } from "@superwriter/shared";
import type { Story } from "@/types/entity";
import { BookOpen, MoreHorizontal, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface StoryListProps {
  stories: Story[];
}

export function StoryList({ stories }: StoryListProps) {
  const router = useRouter();

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`确定要删除「${title}」吗？此操作不可撤销。`)) return;

    try {
      await fetch(`/api/stories/${id}`, { method: "DELETE" });
      toast.success(`已删除「${title}」`);
      router.refresh();
    } catch {
      toast.error("删除失败");
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stories.map((story) => (
        <Card
          key={story.id}
          className="cursor-pointer transition-shadow hover:shadow-md"
          onClick={() => router.push(`/stories/${story.id}/overview`)}
        >
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="line-clamp-1 text-base">
                {story.title}
              </CardTitle>
              <Badge variant="secondary">
                {STORY_STATUS_LABELS[story.status as StoryStatus] ?? story.status}
              </Badge>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(story.id, story.title);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent>
            {story.description ? (
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {story.description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                暂无描述
              </p>
            )}
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <BookOpen className="h-3 w-3" />
              {story.genre && <span>{story.genre}</span>}
              {story.era && <span>· {story.era}</span>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
