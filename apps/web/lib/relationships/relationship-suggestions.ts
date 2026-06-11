import { RELATIONSHIP_TYPE_LABELS, type RelationshipType } from "@superwriter/shared";
import type { Entity } from "@/types/entity";
import { parseFirstJsonArray, parseFirstJsonObject } from "@/lib/ai/parse-ai-json";

const RELATIONSHIP_TYPES = new Set<RelationshipType>(
  Object.keys(RELATIONSHIP_TYPE_LABELS) as RelationshipType[],
);

export interface RelationshipSuggestion {
  id: string;
  fromEntityId: string;
  toEntityId: string;
  type: RelationshipType;
  bidirectional: boolean;
  description: string;
  reason: string;
  confidence: number;
}

export interface ExistingRelationshipLike {
  id?: string;
  from_entity_id: string;
  to_entity_id: string;
  type: string;
  bidirectional?: boolean | null;
}

interface ParseOptions {
  entityIds: string[];
  existingRelationships?: ExistingRelationshipLike[];
}

interface PromptOptions {
  storyTitle: string;
  entities: Array<Pick<Entity, "id" | "type" | "name" | "data">>;
  existingRelationships?: ExistingRelationshipLike[];
}

export function parseRelationshipSuggestions(
  text: string,
  options: ParseOptions,
): RelationshipSuggestion[] {
  const entityIds = new Set(options.entityIds);
  const existingKeys = new Set(
    (options.existingRelationships ?? []).flatMap((relationship) => [
      relationshipKey(
        relationship.from_entity_id,
        relationship.to_entity_id,
        relationship.type,
      ),
      ...(relationship.bidirectional
        ? [
            relationshipKey(
              relationship.to_entity_id,
              relationship.from_entity_id,
              relationship.type,
            ),
          ]
        : []),
    ]),
  );

  return extractSuggestionArray(text).flatMap((item, index) => {
    const suggestion = normalizeSuggestion(item, index);
    if (!suggestion) return [];
    if (!entityIds.has(suggestion.fromEntityId)) return [];
    if (!entityIds.has(suggestion.toEntityId)) return [];
    if (suggestion.fromEntityId === suggestion.toEntityId) return [];

    const key = relationshipKey(
      suggestion.fromEntityId,
      suggestion.toEntityId,
      suggestion.type,
    );
    if (existingKeys.has(key)) return [];

    existingKeys.add(key);
    if (suggestion.bidirectional) {
      existingKeys.add(
        relationshipKey(suggestion.toEntityId, suggestion.fromEntityId, suggestion.type),
      );
    }

    return [suggestion];
  });
}

export function buildRelationshipSuggestionPrompt({
  storyTitle,
  entities,
  existingRelationships = [],
}: PromptOptions) {
  const entityLines = entities.map((entity) => {
    const data = entity.data as Record<string, unknown>;
    const description =
      typeof data.description === "string" && data.description.trim()
        ? data.description.trim()
        : "暂无描述";

    return `- id: ${entity.id}
  类型: ${entity.type}
  名称: ${entity.name}
  描述: ${description}`;
  });

  const existingLines = existingRelationships.map(
    (relationship) =>
      `- ${relationship.from_entity_id} -> ${relationship.to_entity_id} / ${relationship.type}`,
  );

  return `你是一位小说关系图谱编辑。请根据已有世界设定，梳理第一波最有创作价值的实体关系候选。

故事：${storyTitle}

## 实体清单
${entityLines.join("\n")}

## 已有关系
${existingLines.length > 0 ? existingLines.join("\n") : "暂无"}

请返回 JSON 对象：
{
  "relationships": [
    {
      "fromEntityId": "实体ID",
      "toEntityId": "实体ID",
      "type": "relationship_type",
      "bidirectional": false,
      "description": "关系说明",
      "reason": "为什么建议建立这个关系",
      "confidence": 0.8
    }
  ]
}

要求：
1. 只使用 fromEntityId/toEntityId，必须来自实体清单中的 id，不要输出名称字段替代 id
2. type 只能使用：${Object.keys(RELATIONSHIP_TYPE_LABELS).join("、")}
3. 不要重复已有关系，不要输出实体和自己的关系
4. 优先输出角色-角色、角色-地点、角色-阵营、角色-规则设定之间能帮助创作的关系
5. confidence 使用 0 到 1 的数字；不确定的关系不要输出
6. 输出纯 JSON，不要额外解释`;
}

function extractSuggestionArray(text: string) {
  try {
    const object = parseFirstJsonObject(text);
    const relationships = object.relationships ?? object.suggestions;
    return Array.isArray(relationships) ? relationships : [];
  } catch {
    try {
      return parseFirstJsonArray(text);
    } catch {
      return [];
    }
  }
}

function normalizeSuggestion(item: unknown, index: number): RelationshipSuggestion | null {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;

  const record = item as Record<string, unknown>;
  const fromEntityId = getString(record.fromEntityId);
  const toEntityId = getString(record.toEntityId);
  const type = getRelationshipType(record.type);

  if (!fromEntityId || !toEntityId || !type) return null;

  return {
    id: getString(record.id) ?? `relationship-suggestion-${index + 1}`,
    fromEntityId,
    toEntityId,
    type,
    bidirectional: record.bidirectional === true,
    description: getString(record.description) ?? "",
    reason: getString(record.reason) ?? "",
    confidence: clampConfidence(record.confidence),
  };
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getRelationshipType(value: unknown): RelationshipType | null {
  return typeof value === "string" && RELATIONSHIP_TYPES.has(value as RelationshipType)
    ? (value as RelationshipType)
    : null;
}

function clampConfidence(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : 0.6;
}

function relationshipKey(fromEntityId: string, toEntityId: string, type: string) {
  return `${fromEntityId}:${toEntityId}:${type}`;
}
