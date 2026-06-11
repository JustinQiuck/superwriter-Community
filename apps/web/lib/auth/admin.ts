import type { SupabaseClient } from "@supabase/supabase-js";
import { isAdminEnabled } from "@/lib/edition";

type AdminEnv = Record<string, string | undefined>;

export type AdminProfile = {
  id: string;
  is_admin: boolean;
};

export async function requireAdmin(
  supabase: SupabaseClient,
  env: AdminEnv = process.env,
): Promise<AdminProfile> {
  if (!isAdminEnabled(env)) {
    throw new AdminAuthError("NOT_FOUND", "管理后台未启用");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AdminAuthError("UNAUTHORIZED", "请先登录");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    throw new AdminAuthError("FORBIDDEN", "需要管理员权限");
  }

  return profile as AdminProfile;
}

export class AdminAuthError extends Error {
  constructor(
    public code: "NOT_FOUND" | "UNAUTHORIZED" | "FORBIDDEN",
    message: string,
  ) {
    super(message);
  }

  get status() {
    if (this.code === "NOT_FOUND") {
      return 404;
    }

    return this.code === "UNAUTHORIZED" ? 401 : 403;
  }
}
