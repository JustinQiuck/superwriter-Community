"use client";

import { useState } from "react";
import type { BlueprintBeat } from "@/types/entity";
import type { CharacterArc } from "@/types/advanced";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

interface ArcVisualizationProps {
  beats: BlueprintBeat[];
  arcs: Array<{
    characterName: string;
    arc: CharacterArc;
    color: string;
  }>;
}

export function ArcVisualization({ beats, arcs }: ArcVisualizationProps) {
  const sortedBeats = [...beats].sort((a, b) => a.sort_order - b.sort_order);
  const [selectedArcs, setSelectedArcs] = useState<Set<string>>(
    new Set(arcs.slice(0, 3).map((a) => a.characterName)),
  );

  if (arcs.length === 0 || sortedBeats.length < 2) {
    return (
      <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
        需要至少一个角色弧光和 2 个节拍才能显示
      </div>
    );
  }

  const data = sortedBeats.map((beat, beatIndex) => {
    const point: Record<string, unknown> = {
      name: beat.title.length > 6 ? beat.title.slice(0, 6) + "…" : beat.title,
    };
    for (const { characterName, arc } of arcs) {
      if (!selectedArcs.has(characterName)) continue;
      let progress = 0;
      const completedPoints = arc.turn_points.filter(
        (tp) => tp.target_beat_position <= beatIndex && tp.completed,
      ).length;
      const totalPoints = arc.turn_points.length;
      if (totalPoints > 0) {
        progress = Math.round((completedPoints / totalPoints) * 100);
      }
      point[characterName] = progress;
    }
    return point;
  });

  const toggleArc = (name: string) => {
    setSelectedArcs((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {arcs.map(({ characterName, color }) => (
          <button
            key={characterName}
            onClick={() => toggleArc(characterName)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              selectedArcs.has(characterName)
                ? "text-white"
                : "bg-muted text-muted-foreground",
            )}
            style={selectedArcs.has(characterName) ? { backgroundColor: color } : undefined}
          >
            {characterName}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} className="text-muted-foreground" />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} className="text-muted-foreground" />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              borderColor: "hsl(var(--border))",
              borderRadius: "var(--radius)",
              fontSize: 12,
            }}
            formatter={(value, name) => [`${value}%`, name]}
          />
          <Legend />
          {arcs
            .filter(({ characterName }) => selectedArcs.has(characterName))
            .map(({ characterName, color }) => (
              <Line
                key={characterName}
                type="stepAfter"
                dataKey={characterName}
                stroke={color}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
