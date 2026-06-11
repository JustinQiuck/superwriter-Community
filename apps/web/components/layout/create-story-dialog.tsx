"use client";

import { useState, type ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CreateStoryDialogProps {
  triggerClassName?: string;
  showTriggerLabel?: boolean;
  triggerVariant?: ComponentProps<typeof Button>["variant"];
}

export function CreateStoryDialog({
  triggerClassName,
  showTriggerLabel = true,
  triggerVariant = "default",
}: CreateStoryDialogProps = {}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("");
  const [era, setEra] = useState("");
  const router = useRouter();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          genre: genre.trim() || undefined,
          era: era.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const { data: story } = await res.json();
      toast.success(`已创建「${story.title}」`);
      setOpen(false);
      setTitle("");
      setDescription("");
      setGenre("");
      setEra("");
      router.push(`/stories/${story.id}/overview`);
      router.refresh();
    } catch {
      toast.error("创建失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          aria-label="新建故事"
          variant={triggerVariant}
          className={triggerClassName}
        >
          <PlusCircle className={cn("h-4 w-4", showTriggerLabel && "mr-2")} />
          {showTriggerLabel && "新建故事"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新建故事</DialogTitle>
          <DialogDescription>创建一个新的故事项目</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">故事标题 *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入故事标题"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">故事简介</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简要描述你的故事"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="genre">类型</Label>
                <Input
                  id="genre"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="如：悬疑、科幻"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="era">时代背景</Label>
                <Input
                  id="era"
                  value={era}
                  onChange={(e) => setEra(e.target.value)}
                  placeholder="如：1950s美国"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
