import type { EntityType } from "@superwriter/shared";

export interface StructuredEntityFormValues {
  description: string;
  characterAliases?: string;
  characterMotivations?: string;
  characterCurrentState?: string;
  locationAtmosphere?: string;
  locationVisual?: string;
  locationAuditory?: string;
  locationOlfactory?: string;
  chapterNumber?: string;
  chapterSummary?: string;
  chapterTargetWordCount?: string;
}

export function mergeStructuredEntityData(
  type: EntityType,
  existingData: Record<string, unknown> | undefined,
  values: StructuredEntityFormValues,
): Record<string, unknown> {
  const data: Record<string, unknown> = {
    ...(existingData ?? {}),
    description: values.description.trim(),
  };

  if (type === "character") {
    const existingArc = toRecord(data.arc);
    return {
      ...data,
      aliases: splitList(values.characterAliases),
      motivations: splitList(values.characterMotivations),
      arc: {
        ...existingArc,
        starting_state: values.characterCurrentState?.trim() ?? "",
      },
    };
  }

  if (type === "location") {
    const existingSensory = toRecord(data.sensory_details);
    return {
      ...data,
      atmosphere: values.locationAtmosphere?.trim() ?? "",
      sensory_details: {
        ...existingSensory,
        visual: values.locationVisual?.trim() ?? "",
        auditory: values.locationAuditory?.trim() ?? "",
        olfactory: values.locationOlfactory?.trim() ?? "",
      },
    };
  }

  if (type === "chapter") {
    return {
      ...data,
      chapter_number: parsePositiveInteger(values.chapterNumber) ?? data.chapter_number ?? 1,
      target_word_count: parsePositiveInteger(values.chapterTargetWordCount),
      summary: values.chapterSummary?.trim() ?? "",
      location_entity_ids: asStringArray(data.location_entity_ids),
      scene_ids: asStringArray(data.scene_ids),
      writing_status: typeof data.writing_status === "string" ? data.writing_status : "outline",
    };
  }

  return data;
}

export function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePositiveInteger(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
