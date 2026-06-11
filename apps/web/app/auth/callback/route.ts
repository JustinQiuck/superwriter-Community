import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase Auth callback — handles email confirmation and password recovery links.
 *
 * Supabase sends the user here after they click the link in their email.
 * The URL contains either:
 *   - `token_hash` + `type` (email confirmation / recovery flow)
 *   - `code` (PKCE flow, used by some password reset flows)
 *
 * We verify the token/code and redirect to dashboard on success.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "signup" | "recovery" | "email" | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (tokenHash && type) {
    // Email confirmation or recovery via token_hash
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (error) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent("验证链接已过期或无效，请重新发送")}`,
      );
    }

    return NextResponse.redirect(`${origin}${next}`);
  }

  if (code) {
    // PKCE code exchange (e.g., password reset callback)
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent("验证链接已过期或无效，请重新发送")}`,
      );
    }

    return NextResponse.redirect(`${origin}${next}`);
  }

  // No token provided — redirect to login with error
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("缺少验证参数，请重新发送验证邮件")}`,
  );
}
