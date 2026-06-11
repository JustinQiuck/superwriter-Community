import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, type LanguageModel } from "ai";
import { NextResponse } from "next/server";
import {
  validatePersonalAISettingsDraftInput,
  type NormalizedPersonalAISettingsInput,
  type NormalizedPersonalAISettingsDraftInput,
} from "@/lib/ai/personal-provider-settings";
import {
  getPersonalAISetting,
  getPersonalAISettingWithSecret,
  updatePersonalAISettingTestStatus,
  type PersonalAISettingsClient,
} from "@/lib/db/queries/personal-ai-settings";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 120;

const TEST_PROMPT = "请回复：连接成功";
const UNAUTHORIZED_RESPONSE = {
  error: { code: "UNAUTHORIZED", message: "请先登录" },
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(UNAUTHORIZED_RESPONSE, { status: 401 });
  }

  const parsed = validatePersonalAISettingsDraftInput(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "个人 AI 设置参数无效",
          details: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 },
    );
  }

  const resolvedInput = await resolveTestInput(user.id, parsed.data);
  if (!resolvedInput.ok) {
    return validationErrorResponse(resolvedInput.details);
  }

  try {
    await generateText({
      model: buildPersonalAIModel(resolvedInput.input),
      prompt: TEST_PROMPT,
      maxTokens: 20,
    });
    const settingsClient = supabase as unknown as PersonalAISettingsClient;
    await updateStatusIfSettingExists(settingsClient, user.id, "success");
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    const message = shortErrorMessage(error, resolvedInput.input.apiKey);
    const settingsClient = supabase as unknown as PersonalAISettingsClient;
    await updateStatusIfSettingExists(settingsClient, user.id, "failed", message);
    return NextResponse.json(
      {
        error: {
          code: "AI_PROVIDER_TEST_FAILED",
          message,
        },
      },
      { status: 400 },
    );
  }
}

async function resolveTestInput(
  userId: string,
  input: NormalizedPersonalAISettingsDraftInput,
): Promise<
  | { ok: true; input: NormalizedPersonalAISettingsInput }
  | { ok: false; details: Record<string, string[]> }
> {
  if (input.apiKey) {
    return {
      ok: true,
      input: {
        ...input,
        apiKey: input.apiKey,
      },
    };
  }

  const saved = await getPersonalAISettingWithSecret(userId);
  if (!saved) {
    return {
      ok: false,
      details: { apiKey: ["请先填写 API Key。"] },
    };
  }
  if (saved.provider !== input.provider) {
    return {
      ok: false,
      details: {
        provider: ["切换服务商时请重新输入 API Key。"],
        apiKey: ["切换服务商时请重新输入 API Key。"],
      },
    };
  }

  return {
    ok: true,
    input: {
      ...input,
      apiKey: saved.apiKey,
    },
  };
}

function validationErrorResponse(details: Record<string, string[]>) {
  return NextResponse.json(
    {
      error: {
        code: "VALIDATION_ERROR",
        message: "个人 AI 设置参数无效",
        details,
      },
    },
    { status: 400 },
  );
}

function buildPersonalAIModel(input: NormalizedPersonalAISettingsInput): LanguageModel {
  let model: unknown;
  switch (input.provider) {
    case "anthropic":
      model = createAnthropic({
        baseURL: input.baseUrl ?? undefined,
        apiKey: input.apiKey,
      })(input.model);
      break;
    case "deepseek":
      model = createDeepSeek({
        baseURL: input.baseUrl ?? undefined,
        apiKey: input.apiKey,
      })(input.model);
      break;
    case "openai_compatible":
      model = createOpenAI({
        baseURL: input.baseUrl ?? undefined,
        apiKey: input.apiKey,
      })(input.model);
      break;
  }
  return model as LanguageModel;
}

async function updateStatusIfSettingExists(
  supabase: PersonalAISettingsClient,
  userId: string,
  status: "success" | "failed",
  errorMessage?: string,
) {
  try {
    const setting = await getPersonalAISetting(supabase, userId);
    if (!setting) return;
    await updatePersonalAISettingTestStatus(supabase, userId, status, errorMessage);
  } catch {
    // Connection testing should report the provider result even if status persistence fails.
  }
}

function shortErrorMessage(error: unknown, apiKey: string): string {
  const message = error instanceof Error ? error.message : String(error);
  return redactSensitiveError(message || "连接测试失败", apiKey)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function redactSensitiveError(message: string, apiKey: string): string {
  let redacted = message;
  const trimmedKey = apiKey.trim();
  if (trimmedKey) {
    redacted = redacted.replaceAll(trimmedKey, "[已隐藏]");
  }

  return redacted
    .replace(/(authorization\s*[:=]\s*bearer\s+)[^\s,;"']+/gi, "$1[已隐藏]")
    .replace(/\bbearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, "Bearer [已隐藏]")
    .replace(/\bsk-[A-Za-z0-9._-]{8,}/gi, "[已隐藏]")
    .replace(/([?&](?:api[_-]?key|key|token|access_token)=)[^&\s]+/gi, "$1[已隐藏]");
}
