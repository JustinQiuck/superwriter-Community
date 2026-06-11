"use client";

import type { SceneExecutionCard } from "@/lib/blueprint/workflow-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";

const SHORT_FIELDS: Array<{
  key: keyof Pick<SceneExecutionCard, "title" | "pov" | "location" | "time">;
  label: string;
}> = [
  { key: "title", label: "场景标题" },
  { key: "pov", label: "视角" },
  { key: "location", label: "地点" },
  { key: "time", label: "时间" },
];

const LONG_FIELDS: Array<{
  key: keyof Pick<
    SceneExecutionCard,
    | "goal"
    | "conflict"
    | "turn"
    | "outcome"
    | "openingHook"
    | "endingHook"
    | "payoff"
    | "serialPacingNote"
  >;
  label: string;
}> = [
  { key: "goal", label: "本场目标" },
  { key: "conflict", label: "冲突/阻力" },
  { key: "turn", label: "转折" },
  { key: "outcome", label: "结果" },
  { key: "openingHook", label: "开场钩子" },
  { key: "endingHook", label: "章末钩子" },
  { key: "payoff", label: "兑现点" },
  { key: "serialPacingNote", label: "连载节奏备注" },
];

interface SceneCardEditorProps {
  card: SceneExecutionCard;
  onChange: (card: SceneExecutionCard) => void;
  onDelete: () => void;
}

export function SceneCardEditor({
  card,
  onChange,
  onDelete,
}: SceneCardEditorProps) {
  const updateCard = <Key extends keyof SceneExecutionCard>(
    key: Key,
    value: SceneExecutionCard[Key],
  ) => {
    onChange({ ...card, [key]: value });
  };

  return (
    <div className="rounded-lg border border-workspace-border/70 bg-workspace-paper/72 p-4 dark:bg-workspace-surface">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">场景执行卡</div>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={onDelete}
          title="删除场景卡"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        {SHORT_FIELDS.map((field) => (
          <div key={field.key} className="grid gap-2">
            <Label htmlFor={`${card.id}-${field.key}`}>{field.label}</Label>
            <Input
              id={`${card.id}-${field.key}`}
              value={card[field.key]}
              onChange={(event) => updateCard(field.key, event.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {LONG_FIELDS.map((field) => (
          <div key={field.key} className="grid gap-2">
            <Label htmlFor={`${card.id}-${field.key}`}>{field.label}</Label>
            <Textarea
              id={`${card.id}-${field.key}`}
              value={card[field.key]}
              onChange={(event) => updateCard(field.key, event.target.value)}
              rows={2}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
