import { createClient } from "@/lib/supabase/server";
import {
  getPersonalAISetting,
  type PersonalAISettingsClient,
} from "@/lib/db/queries/personal-ai-settings";
import { getCommunityUrl } from "@/lib/edition";
import { SettingsPageClient } from "./settings-client";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const settingsClient = supabase as unknown as PersonalAISettingsClient;

  const [profileResult, personalAISetting] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url, default_language")
      .eq("id", user.id)
      .single(),
    getPersonalAISetting(settingsClient, user.id),
  ]);

  const profile = profileResult.data;

  return (
    <SettingsPageClient
      email={user.email ?? ""}
      profile={{
        display_name: profile?.display_name ?? "",
        avatar_url: profile?.avatar_url ?? "",
        default_language: profile?.default_language ?? "zh",
      }}
      communityUrl={getCommunityUrl()}
      aiSetting={personalAISetting}
    />
  );
}
