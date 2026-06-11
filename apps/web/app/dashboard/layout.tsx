import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { Toaster } from "@/components/ui/sonner";
import { isAdminEnabled } from "@/lib/edition";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, is_admin")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex h-screen">
      <DashboardSidebar
        displayName={profile?.display_name ?? user.email?.split("@")[0] ?? "用户"}
        avatarUrl={profile?.avatar_url}
        email={user.email ?? ""}
        isAdmin={Boolean(profile?.is_admin) && isAdminEnabled()}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      <Toaster />
    </div>
  );
}
