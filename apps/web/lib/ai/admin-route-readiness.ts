export type AIRouteReadinessStatus = "ready" | "warning" | "blocked";
export type AIRouteReadinessRow = {
  routeKey: string;
  status: AIRouteReadinessStatus;
  issues: string[];
};

export function evaluateAIRouteReadiness(): AIRouteReadinessRow {
  return { routeKey: "community", status: "ready", issues: [] };
}

export async function listAIRouteReadiness(): Promise<AIRouteReadinessRow[]> {
  return [];
}
