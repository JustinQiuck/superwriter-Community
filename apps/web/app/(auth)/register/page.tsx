"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BrandLogo } from "@/components/brand-logo";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (password.length < 6) {
      setError("密码至少需要6个字符");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // If email confirmations are enabled, data.session is null.
    // Show a success message instead of redirecting.
    if (data.session) {
      await new Promise((r) => setTimeout(r, 500));
      window.location.href = "/dashboard";
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  const handleResend = async () => {
    setResending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    setResending(false);
    if (error) {
      setError(error.message);
      setSuccess(false);
    } else {
      setResent(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex items-center gap-2">
            <BrandLogo size="lg" />
            <span className="text-2xl font-bold">SuperWriter</span>
          </div>
          <CardTitle className="text-2xl">注册</CardTitle>
          <CardDescription>创建你的账户开始创作之旅</CardDescription>
        </CardHeader>
        {success ? (
          <CardContent className="space-y-4">
            <div className="rounded-md bg-primary/10 p-4 text-center text-sm">
              验证邮件已发送至 <strong>{email}</strong>，请检查收件箱并点击确认链接完成注册。
            </div>
            {resent && (
              <p className="text-center text-sm text-muted-foreground">
                验证邮件已重新发送。
              </p>
            )}
            {!resent && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={resending}
                onClick={handleResend}
              >
                {resending ? "发送中..." : "没收到？重新发送验证邮件"}
              </Button>
            )}
          </CardContent>
        ) : (
          <form onSubmit={handleRegister}>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="displayName">显示名称</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="你的笔名"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="至少6个字符"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "注册中..." : "注册"}
              </Button>
              <p className="text-sm text-muted-foreground">
                已有账户？{" "}
                <Link href="/login" className="text-primary hover:underline">
                  登录
                </Link>
              </p>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
