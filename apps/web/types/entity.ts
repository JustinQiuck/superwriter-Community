import type {
  EntityType,
  RelationshipType,
  StoryStatus,
  CharacterRole,
  CharacterStatus,
  WritingStatus,
  EventCategory,
  BeatType,
  BeatStatus,
  NarrativeTemplateType,
} from "@superwriter/shared";

export interface SensorySymbols {
  visual?: string;
  auditory?: string;
  olfactory?: string;
  tactile?: string;
  gustatory?: string;
}

export interface CharacterData {
  aliases: string[];
  age: string;
  gender: string;
  occupation: string;
  status: CharacterStatus;

  appearance: {
    hair?: string;
    eyes?: string;
    build?: string;
    distinctive_features?: string;
    typical_clothing?: string;
  };

  personality_traits: string[];
  motivations: string[];
  fears: string[];
  secrets: string[];

  role: CharacterRole;
  arc: {
    starting_state: string;
    ending_state: string;
    turning_points: string[];
  };

  sensory_symbols: SensorySymbols;

  information_state: {
    knows: string[];
    doesnt_know: string[];
    information_sources: {
      from_entity_id: string;
      what: string;
      chapter_number?: number;
    }[];
  };

  custom_fields: Record<string, string>;
}

export interface LocationData {
  category: "residence" | "public" | "nature" | "building" | "region" | "other";
  parent_location_id?: string;
  era?: string;
  coordinates?: { lat: number; lng: number };

  atmosphere: string;
  sensory_details: SensorySymbols;

  spatial_layout?: {
    rooms: { name: string; description: string }[];
  };
}

export interface EventData {
  category: EventCategory;
  date?: string;
  time?: string;
  weather?: string;

  cause_event_ids: string[];
  effect_event_ids: string[];

  participant_entity_ids: string[];
  location_entity_id?: string;

  information_revealed: {
    entity_id: string;
    about_entity_id: string;
    what: string;
  }[];
}

export interface ChapterData {
  chapter_number: number;
  word_count: number;
  target_word_count?: number;
  beat_id?: string;

  date_range?: {
    start: string;
    end: string;
  };
  weather?: string;
  location_entity_ids: string[];
  pov_character_id?: string;

  scene_ids: string[];

  summary?: string;

  writing_status: WritingStatus;
}

export interface SceneData {
  chapter_id: string;
  scene_number: number;
  word_count: number;

  location_entity_id?: string;
  participant_entity_ids: string[];
  pov_character_id?: string;

  goal?: string;
  conflict?: string;
  outcome?: string;

  status: WritingStatus;
}

export interface ItemData {
  category: string;
  era?: string;
  owner_entity_id?: string;
  location_entity_id?: string;

  symbolism?: string;
  sensory_details?: SensorySymbols;
}

export interface CultureData {
  era?: string;
  region?: string;
  category: string;

  social_norms?: string[];
  gender_roles?: string[];
  taboos?: string[];
  technology_level?: string;
}

export type EntityDataMap = {
  character: CharacterData;
  location: LocationData;
  event: EventData;
  chapter: ChapterData;
  scene: SceneData;
  item: ItemData;
  culture: CultureData;
  book: Record<string, unknown>;
  reference: Record<string, unknown>;
  economy: Record<string, unknown>;
  faction: Record<string, unknown>;
  magic_system: Record<string, unknown>;
};

export interface Entity<T extends EntityType = EntityType> {
  id: string;
  story_id: string;
  type: T;
  name: string;
  status?: string;
  sort_order?: number;
  timeline_date?: string;
  data: T extends keyof EntityDataMap ? EntityDataMap[T] : Record<string, unknown>;
  content?: string;
  tags: string[];
  color?: string;
  cover_image_url?: string;
  ai_generated: boolean;
  ai_context?: string;
  created_at: string;
  updated_at: string;
}

export interface Relationship {
  id: string;
  story_id: string;
  from_entity_id: string;
  to_entity_id: string;
  type: RelationshipType;
  description?: string;
  bidirectional: boolean;
  evolution: {
    chapter_number: number;
    state: string;
    description: string;
  }[];
  created_at: string;
  updated_at: string;
}

export interface Story {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  genre?: string;
  era?: string;
  status: StoryStatus;
  language: string;
  cover_image_url?: string;
  settings: Record<string, unknown>;
  word_count_goal: number;
  daily_word_goal: number;
  created_at: string;
  updated_at: string;
}

export interface TimelineEvent {
  id: string;
  story_id: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  entity_id?: string;
  chapter_id?: string;
  title: string;
  description?: string;
  color?: string;
  track: string;
  information_node: boolean;
  info_details?: Record<string, unknown>;
  sort_order?: number;
  created_at: string;
}

export interface BeatDefinition {
  name: string;
  description: string;
  beat_type: BeatType;
  position_pct: number;
  default_emotion: number;
  required?: boolean;
}

export interface StoryTemplate {
  id: string;
  user_id?: string;
  name: string;
  description?: string;
  template_type: NarrativeTemplateType;
  is_preset: boolean;
  beat_definitions: BeatDefinition[];
  default_settings: Record<string, unknown>;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BlueprintHealthMetrics {
  coverage: number;
  emotion_health: number;
  character_balance: number;
  overall: number;
}

export interface StoryBlueprint {
  id: string;
  story_id: string;
  template_id?: string;
  title: string;
  synopsis?: string;
  health_metrics: BlueprintHealthMetrics;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BlueprintBeat {
  id: string;
  blueprint_id: string;
  story_id: string;
  title: string;
  description?: string;
  beat_type: BeatType;
  status: BeatStatus;
  position_pct: number;
  emotion_target: number;
  suggested_character_ids: string[];
  suggested_location_ids: string[];
  synopsis?: string;
  content: Record<string, unknown>;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BlueprintVolume {
  id: string;
  blueprint_id: string;
  story_id: string;
  title: string;
  synopsis?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BlueprintChapter {
  id: string;
  volume_id?: string;
  blueprint_id: string;
  story_id: string;
  beat_id?: string;
  title: string;
  synopsis?: string;
  target_word_count?: number;
  target_emotion: number;
  content_guidance: Record<string, unknown>;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
