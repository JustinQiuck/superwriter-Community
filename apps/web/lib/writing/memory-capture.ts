export type MemoryCaptureType =
  | "character_state"
  | "foreshadowing"
  | "rule"
  | "location_detail"
  | "author_preference";

export interface MemoryCaptureInput {
  type: MemoryCaptureType;
  text: string;
}

export const MEMORY_CAPTURE_LABELS: Record<MemoryCaptureType, string> = {
  character_state: "角色状态",
  foreshadowing: "伏笔线索",
  rule: "设定规则",
  location_detail: "地点信息",
  author_preference: "作者偏好",
};

export function buildMemoryCaptureSummary(input: MemoryCaptureInput): string {
  return `${MEMORY_CAPTURE_LABELS[input.type]}：${input.text.trim()}`;
}
