"use client";

import { use, useState, useEffect } from "react";
import type { TimelineEvent } from "@/types/entity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";
import { TimelineEventDialog } from "@/components/timeline/timeline-event-dialog";

export default function TimelinePage({
  params,
}: {
  params: Promise<{ storyId: string }>;
}) {
  const { storyId } = use(params);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | undefined>();

  useEffect(() => {
    fetch(`/api/stories/${storyId}/timeline`)
      .then((r) => r.json())
      .then((json) => setEvents(json.data ?? []))
      .finally(() => setLoading(false));
  }, [storyId]);

  const sortedEvents = [...events].sort((a, b) => {
    if (!a.start_date) return 1;
    if (!b.start_date) return -1;
    return a.start_date.localeCompare(b.start_date);
  });

  const handleOpenCreate = () => {
    setEditingEvent(undefined);
    setDialogOpen(true);
  };

  const handleOpenEdit = (event: TimelineEvent) => {
    setEditingEvent(event);
    setDialogOpen(true);
  };

  const handleSave = (saved: TimelineEvent) => {
    setEvents((prev) => {
      const idx = prev.findIndex((e) => e.id === saved.id);
      if (idx >= 0) {
        // 更新已有事件
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      // 新增事件
      return [...prev, saved];
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确认删除此时间线事件？此操作不可撤销。")) return;
    const res = await fetch(`/api/stories/${storyId}/timeline/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setEvents((prev) => prev.filter((e) => e.id !== id));
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">时间线</h1>
        <Button size="sm" onClick={handleOpenCreate}>
          <PlusCircle className="mr-1.5 h-4 w-4" />
          新建事件
        </Button>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-8">加载中...</div>
      ) : sortedEvents.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <p className="mb-4">暂无时间线事件</p>
          <Button variant="outline" onClick={handleOpenCreate}>
            <PlusCircle className="mr-1.5 h-4 w-4" />
            创建第一个事件
          </Button>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="relative ml-6 border-l-2 border-muted pl-6">
            {sortedEvents.map((event) => (
              <div key={event.id} className="relative mb-6">
                {/* 时间线圆点，颜色跟随事件 color */}
                <div
                  className="absolute -left-[1.85rem] top-3 h-3 w-3 rounded-full border-2 border-background"
                  style={{ backgroundColor: event.color ?? "#666" }}
                />
                <Card className="group">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm">{event.title}</CardTitle>
                        {event.start_date && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {event.start_date}
                            {event.start_time && ` ${event.start_time}`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {event.information_node && (
                          <Badge variant="default" className="text-xs">
                            信息节点
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {event.track}
                        </Badge>
                        {/* 操作按钮，hover 时显示 */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => handleOpenEdit(event)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(event.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  {event.description && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    </CardContent>
                  )}
                </Card>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <TimelineEventDialog
        storyId={storyId}
        event={editingEvent}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
