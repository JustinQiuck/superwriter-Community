import { NextResponse } from "next/server";
import { validatePersonalAISettingsDraftInput } from "@/lib/ai/personal-provider-settings";
import { hasAIConfigSecretKey } from "@/lib/ai/secret-store";
import {
  deletePersonalAISetting,
  getPersonalAISetting,
  savePersonalAISetting,
  updatePersonalAISettingMetadata,
  type PersonalAISettingsClient,
} from "@/lib/db/queries/personal-ai-settings";
import { createClient } from "@/lib/supabase/server";

const UNAUTHORIZED_RESPONSE = {
  error: { code: "UNAUTHORIZED", message: "请先登录" },
};

const AI_CONFIG_SECRET_MISSING_RESPONSE = {
  error: {
    code: "AI_CONFIG_SECRET_MISSING",
    message: "需要配置 AI_CONFIG_SECRET_KEY 才能保存个人 AI 设置。",
  },
};

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(UNAUTHORIZED_RESPONSE, { status: 401 });
    }

    const settingsClient = supabase as unknown as PersonalAISettingsClient;
    const data = await getPersonalAISetting(settingsClient, user.id);
    return NextResponse.json({ data });
  } catch (error) {
    return internalErrorResponse(error, "读取个人 AI 设置失败");
  }
}

export async function PATCH(request: Request) {
  try {
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

    const settingsClient = supabase as unknown as PersonalAISettingsClient;
    if (parsed.data.apiKey) {
      if (!hasAIConfigSecretKey()) {
        return NextResponse.json(AI_CONFIG_SECRET_MISSING_RESPONSE, { status: 400 });
      }
      const data = await savePersonalAISetting(settingsClient, user.id, {
        ...parsed.data,
        apiKey: parsed.data.apiKey,
      });
      return NextResponse.json({ data });
    }

    const existing = await getPersonalAISetting(settingsClient, user.id);
    if (!existing) {
      return validationErrorResponse({
        apiKey: ["请先填写 API Key。"],
      });
    }
    if (existing.provider !== parsed.data.provider) {
      return validationErrorResponse({
        provider: ["切换服务商时请重新输入 API Key。"],
        apiKey: ["切换服务商时请重新输入 API Key。"],
      });
    }

    const data = await updatePersonalAISettingMetadata(settingsClient, user.id, {
      provider: parsed.data.provider,
      baseUrl: parsed.data.baseUrl,
      model: parsed.data.model,
    });
    return NextResponse.json({ data });
  } catch (error) {
    return internalErrorResponse(error, "保存个人 AI 设置失败");
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(UNAUTHORIZED_RESPONSE, { status: 401 });
    }

    const settingsClient = supabase as unknown as PersonalAISettingsClient;
    await deletePersonalAISetting(settingsClient, user.id);
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    return internalErrorResponse(error, "删除个人 AI 设置失败");
  }
}

function internalErrorResponse(error: unknown, fallbackMessage: string) {
  console.error(fallbackMessage, error);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: fallbackMessage } },
    { status: 500 },
  );
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
