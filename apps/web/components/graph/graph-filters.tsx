"use client";

import { ENTITY_TYPE_LABELS } from "@superwriter/shared";
import type { EntityType } from "@superwriter/shared";
import { Button } from "@/components/ui/button";

const TYPE_COLORS: Record<EntityType, string> = {
  character: "#3b82f6",
  location: "#22c55e",
  event: "#ef4444",
  chapter: "#a855f7",
  scene: "#f97316",
  item: "#eab308",
  culture: "#14b8a6",
  book: "#6366f1",
  reference: "#8b5cf6",
  economy: "#06b6d4",
  faction: "#ec4899",
  magic_system: "#8b5cf6",
  foreshadowing: "#f59e0b",
};

interface GraphFiltersProps {
  activeTypes: EntityType[];
  onToggle: (type: EntityType) => void;
}

export function GraphFilters({ activeTypes, onToggle }: GraphFiltersProps) {
  const types = Object.entries(ENTITY_TYPE_LABELS) as [EntityType, string][];

  return (
    <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-1 rounded-lg border bg-background/90 p-2 backdrop-blur-sm shadow-sm">
      {types.map(([type, label]) => {
        const isActive = activeTypes.includes(type);
        return (
          <Button
            key={type}
            size="sm"
            variant={isActive ? "default" : "outline"}
            className="h-6 px-2 text-xs transition-all"
            style={
              isActive
                ? { background: TYPE_COLORS[type], border: `1px solid ${TYPE_COLORS[type]}`, color: "white" }
                : {}
            }
            onClick={() => onToggle(type)}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}

export { TYPE_COLORS };
