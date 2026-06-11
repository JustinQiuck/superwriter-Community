import { createClient } from "@/lib/supabase/server";
import type { GenreProfile } from "@/types/advanced";

function mapGenreProfile(data: Record<string, unknown>): GenreProfile {
  return {
    id: data.id as string,
    name: data.name as string,
    displayName: data.display_name as string,
    description: (data.description as string) ?? "",
    recommendedTemplate: data.recommended_template as string,
    requiredEntityTypes: (data.required_entity_types as string[]) ?? [],
    customFieldTemplates: (data.custom_field_templates ?? {}) as Record<string, Record<string, string>>,
    aiPromptOverrides: (data.ai_prompt_overrides ?? {}) as Record<string, string>,
    isBuiltin: (data.is_builtin as boolean) ?? false,
    userId: (data.user_id as string) ?? null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

export async function getGenreProfiles(): Promise<GenreProfile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("genre_profiles")
    .select("*")
    .order("is_builtin", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapGenreProfile);
}

export async function getGenreProfile(name: string): Promise<GenreProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("genre_profiles")
    .select("*")
    .eq("name", name)
    .single();

  if (error || !data) return null;
  return mapGenreProfile(data);
}

export async function createGenreProfile(
  profile: Omit<GenreProfile, "id" | "isBuiltin" | "userId" | "createdAt" | "updatedAt">,
): Promise<GenreProfile> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data, error } = await supabase
    .from("genre_profiles")
    .insert({
      name: profile.name,
      display_name: profile.displayName,
      description: profile.description,
      recommended_template: profile.recommendedTemplate,
      required_entity_types: profile.requiredEntityTypes,
      custom_field_templates: profile.customFieldTemplates,
      ai_prompt_overrides: profile.aiPromptOverrides,
      user_id: user.id,
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapGenreProfile(data);
}
