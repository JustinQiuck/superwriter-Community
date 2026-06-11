import { createClient } from "@/lib/supabase/server";
import type { StoryTemplate } from "@/types/entity";
import type { NarrativeTemplateType } from "@superwriter/shared";

export async function getTemplates() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("story_templates")
    .select("*")
    .order("is_preset", { ascending: false })
    .order("sort_order", { ascending: true });

  return (data ?? []) as StoryTemplate[];
}

export async function getPresetTemplates() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("story_templates")
    .select("*")
    .eq("is_preset", true)
    .order("sort_order", { ascending: true });

  return (data ?? []) as StoryTemplate[];
}

export async function getTemplateById(templateId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("story_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  return data as StoryTemplate | null;
}

export async function createTemplate(
  input: {
    name: string;
    description?: string;
    template_type: NarrativeTemplateType;
    beat_definitions: Array<{
      name: string;
      description: string;
      beat_type: string;
      position_pct: number;
      default_emotion: number;
      required?: boolean;
    }>;
    default_settings?: Record<string, unknown>;
  },
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("story_templates")
    .insert({
      name: input.name,
      description: input.description,
      template_type: input.template_type,
      beat_definitions: input.beat_definitions,
      default_settings: input.default_settings ?? {},
    })
    .select()
    .single();

  if (error) throw error;
  return data as StoryTemplate;
}

export async function updateTemplate(
  templateId: string,
  input: Partial<{
    name: string;
    description: string;
    beat_definitions: Array<Record<string, unknown>>;
    default_settings: Record<string, unknown>;
  }>,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("story_templates")
    .update(input)
    .eq("id", templateId)
    .select()
    .single();

  if (error) throw error;
  return data as StoryTemplate;
}

export async function deleteTemplate(templateId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("story_templates")
    .delete()
    .eq("id", templateId)
    .eq("is_preset", false);

  if (error) throw error;
}
