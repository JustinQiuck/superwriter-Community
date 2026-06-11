"use client";

import type { BlueprintBeat } from "@/types/entity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  calculateHealthMetrics,
} from "@/lib/blueprint/health-calculator";
import { HealthRing } from "./health-ring";
import { EmotionCurveChart } from "./emotion-curve-chart";

interface HealthDashboardProps {
  beats: BlueprintBeat[];
  onBeatClick?: (beatId: string) => void;
}

export function HealthDashboard({ beats, onBeatClick }: HealthDashboardProps) {
  const { metrics, issues } = calculateHealthMetrics(beats);

  return (
    <div className="space-y-4">
      <EmotionCurveChart beats={beats} onBeatClick={onBeatClick} />

      <div className="grid grid-cols-4 gap-3">
        <MetricCard title="总健康度" value={metrics.overall} />
        <MetricCard title="覆盖率" value={metrics.coverage} />
        <MetricCard title="情绪健康" value={metrics.emotion_health} />
        <MetricCard title="角色均衡" value={metrics.character_balance} />
      </div>

      {issues.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">问题诊断</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {issues.map((issue, i) => (
              <div key={i} className="flex items-center gap-2">
                <Badge variant={issue.type === "error" ? "destructive" : "outline"} className="text-[10px]">
                  {issue.type === "error" ? "问题" : "警告"}
                </Badge>
                <span className="text-xs text-muted-foreground">{issue.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <HealthRing value={value} size={48} strokeWidth={4} />
        <p className="mt-1 text-xs text-muted-foreground">{title}</p>
      </CardContent>
    </Card>
  );
}
