import type { ImportCandidate, ImportSection, ImportSession } from "@/types/import";

const MAX_EXCERPT_LENGTH = 300;
const MAX_CHAPTER_CONTEXT_LENGTH = 8_000;
const MAX_CANDIDATE_JSON_LENGTH = 12_000;

export function buildChapterAnalysisPrompt(section: ImportSection): string {
  return [
    "你是小说导入工作台的分析助手。请只返回纯 JSON，不要 Markdown，不要解释。",
    "从以下章节中提取章节摘要、人物、地点、关系和关键事件。",
    "JSON 格式：",
    "{\"summary\":\"章节摘要\",\"characters\":[{\"name\":\"人物名\",\"summary\":\"人物信息\",\"confidence\":0.8}],\"locations\":[{\"name\":\"地点名\",\"summary\":\"地点信息\",\"confidence\":0.8}],\"relationships\":[{\"from\":\"人物A\",\"to\":\"人物B\",\"type\":\"关系类型\",\"summary\":\"关系说明\",\"confidence\":0.8}],\"keyEvents\":[\"事件\"]}",
    `章节标题：${section.title ?? "未命名章节"}`,
    `章节正文：\n${section.content ?? ""}`,
  ].join("\n\n");
}

export function buildAggregateAnalysisPrompt(
  sections: ImportSection[],
  candidates: ImportCandidate[],
): string {
  return [
    "你是小说导入工作台的总览分析助手。请只返回纯 JSON，不要 Markdown，不要解释。",
    "根据已确认章节和已抽取候选项，生成故事总摘要，并合并明显重复的人物、地点、关系。",
    "JSON 格式：",
    "{\"storySummary\":\"故事总摘要\",\"characters\":[{\"name\":\"人物名\",\"summary\":\"合并信息\",\"confidence\":0.8}],\"locations\":[{\"name\":\"地点名\",\"summary\":\"合并信息\",\"confidence\":0.8}],\"relationships\":[{\"from\":\"人物A\",\"to\":\"人物B\",\"type\":\"关系类型\",\"summary\":\"关系说明\",\"confidence\":0.8}]}",
    `章节线索（摘要优先，缺摘要时仅给短摘录）：\n${buildBoundedChapterContext(sections, candidates)}`,
    `候选项（已截断）：\n${boundedJson(summarizeCandidates(candidates), MAX_CANDIDATE_JSON_LENGTH)}`,
  ].join("\n\n");
}

export function buildBlueprintInferencePrompt(
  session: ImportSession,
  sections: ImportSection[],
  candidates: ImportCandidate[],
): string {
  return [
    "你是小说导入工作台的大纲推断助手。请只返回纯 JSON，不要 Markdown，不要解释。",
    "根据章节顺序和候选资料，推断一个 MVP 故事蓝图、关键节拍和章节大纲。",
    "JSON 格式：",
    "{\"blueprint\":{\"name\":\"蓝图名\",\"summary\":\"整体结构\"},\"beats\":[{\"name\":\"节拍名\",\"summary\":\"节拍说明\",\"confidence\":0.8}],\"chapters\":[{\"title\":\"章节名\",\"summary\":\"章节作用\",\"confidence\":0.8}]}",
    `导入文件：${session.source_filename}`,
    `推断标题：${session.inferred_title ?? "未命名故事"}`,
    `章节顺序与线索：\n${buildBoundedChapterContext(sections, candidates)}`,
    `候选项（已截断）：\n${boundedJson(summarizeCandidates(candidates), MAX_CANDIDATE_JSON_LENGTH)}`,
  ].join("\n\n");
}

function buildBoundedChapterContext(
  sections: ImportSection[],
  candidates: ImportCandidate[],
): string {
  const summariesBySectionId = new Map<string, string>();
  for (const candidate of candidates) {
    if (candidate.candidate_type !== "story_summary") continue;
    const summary = getCandidateSummary(candidate);
    if (!summary) continue;
    for (const sectionId of candidate.source_section_ids) {
      if (!summariesBySectionId.has(sectionId)) {
        summariesBySectionId.set(sectionId, summary);
      }
    }
  }

  return truncate(
    sections.map((section, index) => {
      const summary = summariesBySectionId.get(section.id);
      const clue = summary
        ? `摘要：${summary}`
        : `摘录：${truncate(section.content ?? "", MAX_EXCERPT_LENGTH)}`;
      return [
        `${index + 1}. ${section.title ?? "未命名章节"}`,
        `sort_order: ${section.sort_order}`,
        `word_count: ${section.word_count}`,
        clue,
      ].join("；");
    }).join("\n"),
    MAX_CHAPTER_CONTEXT_LENGTH,
  );
}

function summarizeCandidates(candidates: ImportCandidate[]) {
  return candidates.map((candidate) => ({
    type: candidate.candidate_type,
    name: candidate.name,
    summary: candidate.summary,
    source_section_ids: candidate.source_section_ids,
    payload: summarizePayload(candidate.payload),
  }));
}

function summarizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const summary: Record<string, unknown> = {};
  for (const key of ["summary", "description", "key_events", "from_name", "to_name", "relationship_type"]) {
    const value = payload[key];
    if (typeof value === "string") {
      summary[key] = truncate(value, MAX_EXCERPT_LENGTH);
    } else if (Array.isArray(value)) {
      summary[key] = value.slice(0, 8).map((item) =>
        typeof item === "string" ? truncate(item, MAX_EXCERPT_LENGTH) : item
      );
    }
  }
  return summary;
}

function getCandidateSummary(candidate: ImportCandidate): string | null {
  if (candidate.summary?.trim()) return candidate.summary.trim();
  const payloadSummary = candidate.payload.summary;
  return typeof payloadSummary === "string" && payloadSummary.trim()
    ? payloadSummary.trim()
    : null;
}

function boundedJson(value: unknown, maxLength: number): string {
  return truncate(JSON.stringify(value), maxLength);
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}…`;
}
