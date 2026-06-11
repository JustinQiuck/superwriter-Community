"use client";

import Link from "next/link";
import type { BlueprintBeat } from "@/types/entity";
import type { SceneExecutionCard } from "@/lib/blueprint/workflow-types";
import { BEAT_TYPE_LABELS, BEAT_STATUS_LABELS } from "@superwriter/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Target, Users, MapPin, ArrowLeft, ArrowRight } from "lucide-react";

interface BeatContextPanelProps {
  beat: BlueprintBeat | null;
  previousBeat?: BlueprintBeat | null;
  nextBeat?: BlueprintBeat | null;
  storyId?: string;
  currentSceneCard?: SceneExecutionCard | null;
}

export function BeatContextPanel({
  beat,
  previousBeat,
  nextBeat,
  storyId,
  currentSceneCard,
}: BeatContextPanelProps) {
  if (!beat) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="text-center text-sm text-muted-foreground">
          <p>当前章节未关联节拍。</p>
          {storyId ? (
            <Link
              href={`/stories/${storyId}/blueprint`}
              className="mt-2 inline-flex text-foreground underline underline-offset-4"
            >
              去蓝图关联
            </Link>
          ) : (
            <p className="mt-2">在蓝图中将节拍与章节绑定后，此处将显示写作上下文。</p>
          )}
        </div>
      </div>
    );
  }

  const emotionColor =
    beat.emotion_target > 3
      ? "text-green-500"
      : beat.emotion_target < -3
        ? "text-red-500"
        : "text-muted-foreground";

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs">
              {BEAT_TYPE_LABELS[beat.beat_type]}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {BEAT_STATUS_LABELS[beat.status]}
            </Badge>
          </div>
          <h3 className="text-base font-semibold">{beat.title}</h3>
          {beat.description && (
            <p className="mt-1 text-sm text-muted-foreground">{beat.description}</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">情绪目标</span>
            <span className={`text-sm font-bold ${emotionColor}`}>
              {beat.emotion_target > 0 ? "+" : ""}{beat.emotion_target}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            位置 {beat.position_pct.toFixed(0)}%
          </div>
        </div>

        {beat.synopsis && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium">节拍摘要</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{beat.synopsis}</p>
            </CardContent>
          </Card>
        )}

        {currentSceneCard ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium">场景执行卡</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">本场目标</p>
                <p>{currentSceneCard.goal || "未填写"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">章末钩子</p>
                <p>{currentSceneCard.endingHook || "未填写"}</p>
              </div>
            </CardContent>
          </Card>
        ) : storyId ? (
          <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            <span>未关联场景卡</span>
            <Link
              href={`/stories/${storyId}/blueprint`}
              className="ml-2 text-foreground underline underline-offset-4"
            >
              去蓝图关联
            </Link>
          </div>
        ) : null}

        {beat.suggested_character_ids.length > 0 && (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">
              {beat.suggested_character_ids.length} 个建议角色
            </span>
          </div>
        )}

        {beat.suggested_location_ids.length > 0 && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">
              {beat.suggested_location_ids.length} 个建议地点
            </span>
          </div>
        )}

        {(previousBeat || nextBeat) && (
          <div className="space-y-2 border-t pt-3">
            {previousBeat && (
              <div className="flex items-start gap-2">
                <ArrowLeft className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium">{previousBeat.title}</p>
                  {previousBeat.synopsis && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {previousBeat.synopsis}
                    </p>
                  )}
                </div>
              </div>
            )}
            {nextBeat && (
              <div className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium">{nextBeat.title}</p>
                  {nextBeat.synopsis && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {nextBeat.synopsis}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
