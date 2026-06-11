"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AICreditBadge } from "@/components/ai/ai-credit-badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TechniqueCard } from "@/lib/work-learning/types";
import { useAICreditPreview } from "@/hooks/use-ai-credit-preview";
import { Loader2 } from "lucide-react";

interface StoryOption {
  id: string;
  title: string;
}

interface ChapterOption {
  id: string;
  name: string;
}

interface ApplyCardDialogProps {
  card: TechniqueCard | null;
  stories: StoryOption[];
  open: boolean;
  applying?: boolean;
  result?: string | null;
  onOpenChange: (open: boolean) => void;
  onApply: (payload: {
    card: TechniqueCard;
    target: { type: "blueprint"; storyId: string } | { type: "chapter"; storyId: string; chapterId: string };
  }) => void;
}

const CREDIT_ITEMS = [{ clientKey: "work-learning:apply", routeKey: "work_learning_apply" }];

export function ApplyCardDialog({
  card,
  stories,
  open,
  applying = false,
  result,
  onOpenChange,
  onApply,
}: ApplyCardDialogProps) {
  const [storyId, setStoryId] = useState("");
  const [targetType, setTargetType] = useState<"blueprint" | "chapter">("blueprint");
  const [chapterId, setChapterId] = useState("");
  const [chapters, setChapters] = useState<ChapterOption[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const { previews, loading: creditPreviewLoading } = useAICreditPreview(CREDIT_ITEMS);
  const creditPreview = previews["work-learning:apply"];

  useEffect(() => {
    if (!open) return;
    setStoryId(stories[0]?.id ?? "");
    setTargetType("blueprint");
    setChapterId("");
  }, [open, stories]);

  useEffect(() => {
    if (!storyId || targetType !== "chapter") return;
    let cancelled = false;
    setLoadingChapters(true);
    fetch(`/api/stories/${storyId}/entities?type=chapter`)
      .then((response) => response.json())
      .then((body) => {
        if (cancelled) return;
        const rows = Array.isArray(body.data) ? body.data : [];
        setChapters(rows.map((row: { id: string; name: string }) => ({
          id: row.id,
          name: row.name,
        })));
      })
      .catch(() => {
        if (!cancelled) setChapters([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingChapters(false);
      });
    return () => {
      cancelled = true;
    };
  }, [storyId, targetType]);

  const selectedStoryTitle = useMemo(
    () => stories.find((story) => story.id === storyId)?.title ?? "未选择故事",
    [stories, storyId],
  );

  const canApply = Boolean(
    card &&
	    storyId &&
	    !applying &&
	    !creditPreview?.isDisabled &&
	    (targetType === "blueprint" || chapterId),
	  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>应用技法卡</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {card ? (
            <div className="rounded-lg border border-workspace-border/70 bg-workspace-paper/72 p-3">
              <p className="font-medium">{card.title}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{card.abstractRule}</p>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">目标故事</p>
              <Select value={storyId} onValueChange={setStoryId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择故事" />
                </SelectTrigger>
                <SelectContent>
                  {stories.map((story) => (
                    <SelectItem key={story.id} value={story.id}>
                      {story.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">应用位置</p>
              <Select
                value={targetType}
                onValueChange={(value) => {
                  setTargetType(value as "blueprint" | "chapter");
                  setChapterId("");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blueprint">故事蓝图</SelectItem>
                  <SelectItem value="chapter">章节指导</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {targetType === "chapter" ? (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">章节</p>
              <Select value={chapterId} onValueChange={setChapterId} disabled={loadingChapters}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={loadingChapters ? "加载章节中..." : "选择章节"} />
                </SelectTrigger>
                <SelectContent>
                  {chapters.map((chapter) => (
                    <SelectItem key={chapter.id} value={chapter.id}>
                      {chapter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {result ? (
            <div className="max-h-56 overflow-auto rounded-lg bg-workspace-paper/60 p-3 text-sm leading-6 whitespace-pre-wrap">
              {result}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          <Button
            type="button"
            disabled={!canApply}
            onClick={() => {
              if (!card || !storyId) return;
              onApply({
                card,
                target: targetType === "blueprint"
                  ? { type: "blueprint", storyId }
                  : { type: "chapter", storyId, chapterId },
              });
            }}
	          >
	            {applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
	            应用到{targetType === "blueprint" ? selectedStoryTitle : "章节"}
	            <AICreditBadge
	              preview={creditPreview}
	              loading={creditPreviewLoading}
	            />
	          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
