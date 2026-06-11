export type AIModelFeatureRecommendation = {
  routeKey: string;
  score: number;
  reasons: string[];
};

export function getAIModelRecommendations(): AIModelFeatureRecommendation[] {
  return [];
}
