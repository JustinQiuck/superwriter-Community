"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

interface HealthRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
}

export function HealthRing({ value, size = 48, strokeWidth = 4 }: HealthRingProps) {
  const getColor = (v: number) => {
    if (v >= 80) return "hsl(142, 76%, 36%)";
    if (v >= 60) return "hsl(48, 96%, 53%)";
    if (v >= 40) return "hsl(32, 95%, 44%)";
    return "hsl(0, 84%, 60%)";
  };

  const data = [
    { name: "value", value: value },
    { name: "remaining", value: 100 - value },
  ];

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            innerRadius={size / 2 - strokeWidth}
            outerRadius={size / 2}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            stroke="none"
          >
            <Cell fill={getColor(value)} />
            <Cell fill="hsl(var(--muted))" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <span
        className="absolute text-xs font-bold"
        style={{ color: getColor(value) }}
      >
        {value}
      </span>
    </div>
  );
}
