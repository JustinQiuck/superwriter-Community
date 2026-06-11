"use client";

import type { BlueprintBeat } from "@/types/entity";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";

interface ActualEmotion {
  beatTitle: string;
  actualScore: number;
}

interface EmotionCurveChartProps {
  beats: BlueprintBeat[];
  actualEmotions?: ActualEmotion[];
  onBeatClick?: (beatId: string) => void;
}

export function EmotionCurveChart({ beats, actualEmotions, onBeatClick }: EmotionCurveChartProps) {
  const sortedBeats = [...beats].sort((a, b) => a.sort_order - b.sort_order);

  const data = sortedBeats.map((beat) => {
    const actual = actualEmotions?.find(
      (a) => a.beatTitle === beat.title,
    );
    return {
      name: beat.title.length > 6 ? beat.title.slice(0, 6) + "…" : beat.title,
      emotion: beat.emotion_target,
      actual: actual?.actualScore ?? undefined,
      id: beat.id,
      pct: beat.position_pct,
    };
  });

  const hasActual = actualEmotions && actualEmotions.length > 0;

  if (data.length < 2) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        需要至少 2 个节拍才能显示情绪曲线
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart
        data={data}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        style={{ cursor: onBeatClick ? "pointer" : "default" }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10 }}
          className="text-muted-foreground"
        />
        <YAxis
          domain={[-10, 10]}
          tick={{ fontSize: 10 }}
          className="text-muted-foreground"
        />
        <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            borderColor: "hsl(var(--border))",
            borderRadius: "var(--radius)",
            fontSize: 12,
          }}
          formatter={(value, name) => {
            const num = Number(value);
            const label = name === "actual" ? "实际情绪" : "蓝图目标";
            return [`${num > 0 ? "+" : ""}${num}`, label];
          }}
        />
        {hasActual && (
          <Legend
            formatter={(value) =>
              value === "emotion" ? "蓝图目标" : value === "actual" ? "实际情绪" : value
            }
          />
        )}
        <Line
          type="monotone"
          dataKey="emotion"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ r: 4, fill: "hsl(var(--primary))" }}
          activeDot={{ r: 6 }}
        />
        {hasActual && (
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 3, fill: "#f59e0b" }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
