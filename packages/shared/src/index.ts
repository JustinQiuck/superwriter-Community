export type EntityType =
  | "character"
  | "location"
  | "event"
  | "chapter"
  | "scene"
  | "item"
  | "culture"
  | "book"
  | "reference"
  | "economy"
  | "faction"
  | "magic_system"
  | "foreshadowing";

export const ENTITY_TYPES: EntityType[] = [
  "character",
  "location",
  "event",
  "chapter",
  "scene",
  "item",
  "culture",
  "book",
  "reference",
  "economy",
  "faction",
  "magic_system",
  "foreshadowing",
];

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  character: "角色",
  location: "地点",
  event: "事件",
  chapter: "章节",
  scene: "场景",
  item: "物品",
  culture: "文化",
  book: "书籍",
  reference: "参考资料",
  economy: "经济体系",
  faction: "阵营",
  magic_system: "魔法体系",
  foreshadowing: "伏笔",
};

export type RelationshipType =
  | "family"
  | "romantic"
  | "friendship"
  | "rivalry"
  | "mentor"
  | "colleague"
  | "student"
  | "threatens"
  | "protects"
  | "manipulates"
  | "informs"
  | "knows_secret"
  | "lives_in"
  | "visits"
  | "works_at"
  | "participates"
  | "causes"
  | "affected_by"
  | "owns"
  | "uses"
  | "occurs_at"
  | "references"
  | "custom";

export const RELATIONSHIP_TYPE_LABELS: Record<RelationshipType, string> = {
  family: "家庭",
  romantic: "恋爱",
  friendship: "友谊",
  rivalry: "对立/竞争",
  mentor: "导师",
  colleague: "同事",
  student: "师生",
  threatens: "威胁",
  protects: "保护",
  manipulates: "操控",
  informs: "信息传递",
  knows_secret: "知道秘密",
  lives_in: "居住",
  visits: "访问",
  works_at: "工作",
  participates: "参与",
  causes: "导致",
  affected_by: "受影响",
  owns: "拥有",
  uses: "使用",
  occurs_at: "发生于",
  references: "引用",
  custom: "自定义",
};

export type StoryStatus = "draft" | "active" | "completed" | "archived";

export const STORY_STATUS_LABELS: Record<StoryStatus, string> = {
  draft: "草稿",
  active: "进行中",
  completed: "已完成",
  archived: "已归档",
};

export type CharacterRole =
  | "protagonist"
  | "antagonist"
  | "supporting"
  | "minor";

export type CharacterStatus =
  | "active"
  | "deceased"
  | "missing"
  | "unknown";

export type WritingStatus =
  | "outline"
  | "draft"
  | "wip"
  | "revision"
  | "revised"
  | "final";

export type EventCategory =
  | "turning_point"
  | "climax"
  | "setup"
  | "resolution"
  | "background"
  | "info_node";

export type AIMode =
  | "character_generate"
  | "character_dialogue"
  | "location_generate"
  | "event_suggest"
  | "outline_generate"
  | "chapter_continue"
  | "chapter_rewrite"
  | "sensory_expand"
  | "conflict_intensify"
  | "pacing_tighten"
  | "hook_boost"
  | "voice_check"
  | "chapter_drift_check"
  | "chapter_completion_review"
  | "foreshadowing_check"
  | "consistency_check"
  | "timeline_fill"
  | "relationship_suggest"
  | "information_track"
  | "free_chat"
  | "synopsis_candidates"
  | "blueprint_generate"
  | "blueprint_expand"
  | "story_outline_generate"
  | "story_asset_needs"
  | "blueprint_reverse_sync"
  | "beat_suggest"
  | "deviation_suggest"
  | "arc_suggest"
  | "foreshadowing_suggest"
  | "work_learning_analyze"
  | "work_learning_apply"
  | "import_migration_analyze";

export type AIProvider = "sw-free" | "sw-pro" | "anthropic" | "openai" | "deepseek";

export const AI_PROVIDER_LABELS: Record<AIProvider, string> = {
  "sw-free": "个人 Key",
  "sw-pro": "个人 Key",
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI (GPT-4o)",
  deepseek: "DeepSeek",
};

export const AI_PROVIDER_REQUIRES_OWN_KEY: Partial<Record<AIProvider, boolean>> = {
  anthropic: true,
  openai: true,
  deepseek: true,
};

export type AIPlan = "free" | "basic" | "pro";

export const AI_PLAN_LABELS: Record<AIPlan, string> = {
  free: "个人使用",
  basic: "个人使用",
  pro: "个人使用",
};

export const AI_PLAN_CREDITS: Record<AIPlan, number> = {
  free: 0,
  basic: 0,
  pro: 0,
};

export const AI_PLAN_PROVIDER: Record<AIPlan, AIProvider> = {
  free: "sw-free",
  basic: "sw-free",
  pro: "sw-pro",
};

export const AI_MODE_CREDIT_COSTS: Partial<Record<AIMode, number>> = {};

export const DEFAULT_AI_MODE_CREDIT_COST = 0;

export type ConsistencyFindingType =
  | "contradiction"
  | "missing_detail"
  | "timeline_conflict"
  | "tone_drift"
  | "promise_unresolved";

export const CONSISTENCY_FINDING_TYPE_LABELS: Record<ConsistencyFindingType, string> = {
  contradiction: "设定矛盾",
  missing_detail: "细节缺失",
  timeline_conflict: "时间线冲突",
  tone_drift: "语气漂移",
  promise_unresolved: "伏笔未兑现",
};

export type ConsistencyFindingSeverity = "low" | "medium" | "high";

export const CONSISTENCY_FINDING_SEVERITY_LABELS: Record<
  ConsistencyFindingSeverity,
  string
> = {
  low: "低",
  medium: "中",
  high: "高",
};

export type ConsistencyFindingStatus =
  | "open"
  | "accepted"
  | "dismissed"
  | "resolved";

export const CONSISTENCY_FINDING_STATUS_LABELS: Record<
  ConsistencyFindingStatus,
  string
> = {
  open: "待处理",
  accepted: "已采纳",
  dismissed: "已忽略",
  resolved: "已解决",
};

export type NVIDIAModel = string;

export const NVIDIA_MODELS: NVIDIAModel[] = [];

export const NVIDIA_MODEL_LABELS: Record<NVIDIAModel, string> = {};

export type BeatType =
  | "setup"
  | "inciting_incident"
  | "rising_action"
  | "midpoint"
  | "crisis"
  | "climax"
  | "falling_action"
  | "resolution"
  | "turning_point"
  | "reveal"
  | "custom";

export const BEAT_TYPE_LABELS: Record<BeatType, string> = {
  setup: "铺垫",
  inciting_incident: "触发事件",
  rising_action: "上升行动",
  midpoint: "中点",
  crisis: "危机",
  climax: "高潮",
  falling_action: "下降行动",
  resolution: "结局",
  turning_point: "转折点",
  reveal: "揭示",
  custom: "自定义",
};

export type BeatStatus = "planned" | "writing" | "completed";

export const BEAT_STATUS_LABELS: Record<BeatStatus, string> = {
  planned: "待写",
  writing: "进行中",
  completed: "已完成",
};

export type NarrativeTemplateType =
  | "three_act"
  | "heros_journey"
  | "save_the_cat"
  | "snowflake"
  | "seven_point"
  | "dan_harmon_story"
  | "custom";

export type ArchivalSourceType = "chapter" | "entity" | "interaction";

export type RecallOperationType =
  | "chapter_save"
  | "entity_update"
  | "blueprint_change"
  | "ai_interaction"
  | "preference_change";

export const NARRATIVE_TEMPLATE_TYPE_LABELS: Record<NarrativeTemplateType, string> = {
  three_act: "三幕式",
  heros_journey: "英雄之旅",
  save_the_cat: "救猫咪",
  snowflake: "雪花法",
  seven_point: "七点式",
  dan_harmon_story: "故事圈",
  custom: "自定义",
};
