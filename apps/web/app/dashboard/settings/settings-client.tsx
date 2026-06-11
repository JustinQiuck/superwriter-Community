"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProfileData {
  display_name: string;
  avatar_url: string;
  default_language: string;
}

type PersonalAISetting = {
  provider: "openai_compatible" | "anthropic" | "deepseek";
  base_url: string | null;
  model: string;
  api_key_preview: string;
  last_test_status: "success" | "failed" | null;
  last_test_error: string | null;
} | null;

const AI_PROVIDERS = ["openai_compatible", "anthropic", "deepseek"] as const;

export function SettingsPageClient({
  email,
  profile,
  communityUrl,
  aiSetting,
}: {
  email: string;
  profile: ProfileData;
  communityUrl: string | null;
  aiSetting: PersonalAISetting;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [defaultLanguage, setDefaultLanguage] = useState(profile.default_language);
  const [aiProvider, setAIProvider] = useState<
    "openai_compatible" | "anthropic" | "deepseek"
  >(aiSetting?.provider ?? "openai_compatible");
  const [apiKey, setAPIKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(aiSetting?.base_url ?? "");
  const [model, setModel] = useState(aiSetting?.model ?? "gpt-4o-mini");
  const [aiSaving, setAISaving] = useState(false);
  const [aiTesting, setAITesting] = useState(false);
  const [aiClearing, setAIClearing] = useState(false);

  const hasNewAIKey = Boolean(apiKey.trim());
  const canUseSavedAIKey = Boolean(aiSetting && aiProvider === aiSetting.provider);
  const canSubmitAISettings = hasNewAIKey || canUseSavedAIKey;
  const needsNewKeyForProviderChange = Boolean(
    aiSetting && aiProvider !== aiSetting.provider && !hasNewAIKey,
  );

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          avatar_url: avatarUrl,
          default_language: defaultLanguage,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("设置已保存");
      router.refresh();
    } catch {
      toast.error("保存失败");
    } finally {
      setLoading(false);
    }
  };

  const buildAISettingsPayload = () => ({
    provider: aiProvider,
    apiKey: apiKey.trim() || null,
    baseUrl: baseUrl.trim() || null,
    model: model.trim() || null,
  });

  const handleAIProviderChange = (value: string) => {
    if (AI_PROVIDERS.includes(value as (typeof AI_PROVIDERS)[number])) {
      setAIProvider(value as (typeof AI_PROVIDERS)[number]);
    }
  };

  const handleSaveAISettings = async () => {
    setAISaving(true);
    try {
      const res = await fetch("/api/profile/ai-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildAISettingsPayload()),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message ?? "AI 设置保存失败");
        return;
      }
      toast.success("AI 设置已保存");
      setAPIKey("");
      router.refresh();
    } catch {
      toast.error("AI 设置保存失败，请稍后重试");
    } finally {
      setAISaving(false);
    }
  };

  const handleTestAISettings = async () => {
    setAITesting(true);
    try {
      const res = await fetch("/api/profile/ai-settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildAISettingsPayload()),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message ?? "连接测试失败");
        router.refresh();
        return;
      }
      toast.success("连接测试成功");
      router.refresh();
    } catch {
      toast.error("连接测试失败，请稍后重试");
    } finally {
      setAITesting(false);
    }
  };

  const handleClearAISettings = async () => {
    setAIClearing(true);
    try {
      const res = await fetch("/api/profile/ai-settings", {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message ?? "清除 AI 设置失败");
        return;
      }
      toast.success("AI 设置已清除");
      setAPIKey("");
      setBaseUrl("");
      setModel("gpt-4o-mini");
      setAIProvider("openai_compatible");
      router.refresh();
    } catch {
      toast.error("清除 AI 设置失败，请稍后重试");
    } finally {
      setAIClearing(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">设置</h1>
        <p className="text-muted-foreground">管理你的账户、本地 AI Key 和偏好设置</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>个人资料</CardTitle>
          <CardDescription>修改你的显示名称和头像</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input id="email" value={email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName">显示名称</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="输入你的笔名"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatarUrl">头像 URL</Label>
            <Input
              id="avatarUrl"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
            />
          </div>
          <div className="space-y-2">
            <Label>默认语言</Label>
            <Select value={defaultLanguage} onValueChange={setDefaultLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh">中文</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ja">日本語</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI 设置</CardTitle>
          <CardDescription>配置你自己的 AI 服务，用于本地写作助手</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>服务商</Label>
              <Select value={aiProvider} onValueChange={handleAIProviderChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai_compatible">OpenAI 兼容</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="deepseek">DeepSeek</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="aiModel">模型</Label>
              <Input
                id="aiModel"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-4o-mini"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              value={apiKey}
              onChange={(e) => setAPIKey(e.target.value)}
              placeholder={aiSetting?.api_key_preview ?? "输入你的 API Key"}
              type="password"
            />
            {aiSetting?.api_key_preview && (
              <p className="text-xs text-muted-foreground">
                已保存密钥：{aiSetting.api_key_preview}
              </p>
            )}
            {aiSetting && !hasNewAIKey && (
              <p className="text-xs text-muted-foreground">
                留空会沿用已保存密钥；切换服务商时需要重新输入 Key。
              </p>
            )}
            {needsNewKeyForProviderChange && (
              <p className="text-xs text-destructive">
                切换服务商时请重新输入 API Key。
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input
              id="baseUrl"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
            />
          </div>

          {aiSetting?.last_test_status && (
            <div className="rounded-md border px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span>上次连接测试</span>
                <Badge
                  variant={
                    aiSetting.last_test_status === "success"
                      ? "default"
                      : "destructive"
                  }
                >
                  {aiSetting.last_test_status === "success" ? "成功" : "失败"}
                </Badge>
              </div>
              {aiSetting.last_test_error && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {aiSetting.last_test_error}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleTestAISettings}
              disabled={aiTesting || aiSaving || aiClearing || !canSubmitAISettings}
            >
              {aiTesting ? "测试中..." : "测试连接"}
            </Button>
            <Button
              variant="outline"
              onClick={handleClearAISettings}
              disabled={aiClearing || aiSaving || aiTesting || !aiSetting}
            >
              {aiClearing ? "清除中..." : "清除"}
            </Button>
            <Button
              onClick={handleSaveAISettings}
              disabled={aiSaving || aiTesting || aiClearing || !canSubmitAISettings}
            >
              {aiSaving ? "保存中..." : "保存"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>加入交流群</CardTitle>
          <CardDescription>和其他创作者交流本地部署与写作工作流</CardDescription>
        </CardHeader>
        <CardContent>
          {communityUrl ? (
            <Button asChild>
              <Link href={communityUrl} target="_blank" rel="noreferrer">
                打开交流群
              </Link>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">交流群即将开放</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSaveProfile} disabled={loading}>
          {loading ? "保存中..." : "保存设置"}
        </Button>
      </div>
    </div>
  );
}
