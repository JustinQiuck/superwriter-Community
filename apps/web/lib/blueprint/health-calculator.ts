import type { BlueprintBeat } from "@/types/entity";

export interface HealthMetrics {
  coverage: number;
  emotion_health: number;
  character_balance: number;
  overall: number;
}

export interface HealthIssue {
  type: "warning" | "error";
  message: string;
}

function calculateEmotionScore(beats: BlueprintBeat[]): { score: number; issues: HealthIssue[] } {
  const issues: HealthIssue[] = [];

  if (beats.length < 2) {
    return { score: 0, issues: [{ type: "warning", message: "节拍数量不足，无法计算情绪健康度" }] };
  }

  const emotions = beats.map((b) => b.emotion_target);
  const mean = emotions.reduce((a, b) => a + b, 0) / emotions.length;
  const variance = emotions.reduce((a, b) => a + (b - mean) ** 2, 0) / emotions.length;
  const stdDev = Math.sqrt(variance);

  const hasPeak = emotions.some((e) => e > 5);
  const hasValley = emotions.some((e) => e < -5);

  let score: number;
  if (stdDev < 2.0) {
    score = 30;
    issues.push({ type: "error", message: "情绪曲线过于平坦，缺少起伏" });
  } else if (stdDev < 3.0) {
    score = 60;
  } else if (stdDev < 4.0) {
    score = 80;
  } else {
    score = 100;
  }

  if (!hasPeak) {
    score = Math.max(0, score - 20);
    issues.push({ type: "warning", message: "缺少情绪高峰（> +5）" });
  }
  if (!hasValley) {
    score = Math.max(0, score - 20);
    issues.push({ type: "warning", message: "缺少情绪低谷（< -5）" });
  }

  return { score, issues };
}

function calculateCharacterBalance(beats: BlueprintBeat[]): { score: number; issues: HealthIssue[] } {
  const issues: HealthIssue[] = [];

  const allCharacterIds = beats.flatMap((b) => b.suggested_character_ids);
  if (allCharacterIds.length === 0) {
    return { score: 100, issues: [] };
  }

  const characterCounts = new Map<string, number>();
  allCharacterIds.forEach((id) => {
    characterCounts.set(id, (characterCounts.get(id) ?? 0) + 1);
  });

  const totalBeats = beats.length;

  let score = 100;
  const absentChars = [...characterCounts.entries()].filter(([, c]) => c / totalBeats < 0.1);
  for (const [, count] of absentChars) {
    score -= 15;
    issues.push({
      type: "warning",
      message: `角色出席率过低（${((count / totalBeats) * 100).toFixed(0)}%）`,
    });
  }

  return { score: Math.max(0, score), issues };
}

export function calculateHealthMetrics(beats: BlueprintBeat[]): {
  metrics: HealthMetrics;
  issues: HealthIssue[];
} {
  const allIssues: HealthIssue[] = [];

  const completedCount = beats.filter((b) => b.status === "completed").length;
  const coverage = beats.length > 0 ? Math.round((completedCount / beats.length) * 100) : 0;
  if (coverage < 50 && beats.length > 0) {
    allIssues.push({ type: "warning", message: `蓝图覆盖率仅 ${coverage}%，还有大量节拍未完成` });
  }

  const { score: emotionScore, issues: emotionIssues } = calculateEmotionScore(beats);
  allIssues.push(...emotionIssues);

  const { score: charScore, issues: charIssues } = calculateCharacterBalance(beats);
  allIssues.push(...charIssues);

  const overall = Math.round(coverage * 0.4 + emotionScore * 0.3 + charScore * 0.3);

  return {
    metrics: {
      coverage,
      emotion_health: emotionScore,
      character_balance: charScore,
      overall,
    },
    issues: allIssues,
  };
}
