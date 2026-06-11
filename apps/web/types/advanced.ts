export interface ForeshadowingData {
  foreshadowing_type: "setup" | "payoff";
  paired_entity_id: string | null;
  content_description: string;
  chapter_id: string | null;
  text_reference: string;
  status: "planted" | "resolved" | "abandoned";
  importance: number;
}

export interface ArcTurnPoint {
  target_beat_position: number;
  trigger_event: string;
  from_state: string;
  to_state: string;
  completed: boolean;
}

export interface CharacterArc {
  starting_state: string;
  ending_state: string;
  dimension: string;
  turn_points: ArcTurnPoint[];
}

export interface GenreProfile {
  id: string;
  name: string;
  displayName: string;
  description: string;
  recommendedTemplate: string;
  requiredEntityTypes: string[];
  customFieldTemplates: Record<string, Record<string, string>>;
  aiPromptOverrides: Record<string, string>;
  isBuiltin: boolean;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
}
