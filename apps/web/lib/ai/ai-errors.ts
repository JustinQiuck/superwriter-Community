export type AIErrorCode =
  | "UNAUTHORIZED"
  | "QUOTA_EXCEEDED"
  | "AI_PROVIDER_NOT_CONFIGURED"
  | "AI_MODEL_UNAVAILABLE"
  | "AI_NETWORK_ERROR"
  | "AI_CONTEXT_ERROR"
  | "AI_UNKNOWN_ERROR";

export interface NormalizedAIError {
  code: AIErrorCode;
  message: string;
  recovery: string;
  retryable: boolean;
}

const DEFAULT_ERRORS: Record<AIErrorCode, NormalizedAIError> = {
  UNAUTHORIZED: {
    code: "UNAUTHORIZED",
    message: "请先登录后再使用 AI 功能",
    recovery: "重新登录后再试。",
    retryable: false,
  },
  QUOTA_EXCEEDED: {
    code: "QUOTA_EXCEEDED",
    message: "AI 调用暂不可用",
    recovery: "请检查个人 API Key 配置后再试。",
    retryable: false,
  },
  AI_PROVIDER_NOT_CONFIGURED: {
    code: "AI_PROVIDER_NOT_CONFIGURED",
    message: "AI 服务暂未配置",
    recovery: "请在设置中检查个人 API Key、Base URL 和模型名称。",
    retryable: false,
  },
  AI_MODEL_UNAVAILABLE: {
    code: "AI_MODEL_UNAVAILABLE",
    message: "当前 AI 模型暂不可用",
    recovery: "切换模型或稍后重试；如果持续失败，请联系管理员。",
    retryable: true,
  },
  AI_NETWORK_ERROR: {
    code: "AI_NETWORK_ERROR",
    message: "AI 服务连接失败",
    recovery: "稍后重试；如果持续失败，检查网络或服务商状态。",
    retryable: true,
  },
  AI_CONTEXT_ERROR: {
    code: "AI_CONTEXT_ERROR",
    message: "AI 上下文准备失败",
    recovery: "刷新页面或减少上下文范围后重试。",
    retryable: true,
  },
  AI_UNKNOWN_ERROR: {
    code: "AI_UNKNOWN_ERROR",
    message: "AI 服务出错",
    recovery: "稍后重试；如果持续失败，请联系管理员。",
    retryable: true,
  },
};

export function normalizeAIError(error: unknown): NormalizedAIError {
  if (isNormalizedAIError(error)) return error;

  const status = getStatus(error);
  const isRetryable = getIsRetryable(error);
  const rawMessage = getErrorMessage(error);
  const body = getBody(error) ?? parseErrorPayload(rawMessage);
  const code = normalizeCode(getErrorCode(body) ?? getErrorCode(error));
  const message = getErrorMessage(body) ?? rawMessage;
  const searchableMessage = message?.toLowerCase() ?? "";

  if (isAbortLikeError(error, searchableMessage)) {
    return withMessage("AI_NETWORK_ERROR", "AI 生成超时");
  }

  if (
    status === 401 &&
    (searchableMessage.includes("api key") ||
      searchableMessage.includes("api_key") ||
      searchableMessage.includes("apikey") ||
      searchableMessage.includes("unauthorized"))
  ) {
    return withMessage("AI_PROVIDER_NOT_CONFIGURED", message);
  }

  if (code) return withMessage(code, message);

  if (status === 401) return withMessage("UNAUTHORIZED", message);
  if (status === 429) return withMessage("QUOTA_EXCEEDED", message);
  if (status === 400 || searchableMessage === "bad request") {
    return withMessage("AI_MODEL_UNAVAILABLE", "AI 请求被模型服务拒绝");
  }
  if (status === 410 || searchableMessage === "gone") {
    return withMessage("AI_MODEL_UNAVAILABLE", "当前模型已下线或不可用");
  }
  if (status !== null && status >= 500) {
    return withMessage("AI_NETWORK_ERROR", message);
  }

  if (
    searchableMessage.includes("暂未配置") ||
    searchableMessage.includes("api key") ||
    searchableMessage.includes("api_key")
  ) {
    return withMessage("AI_PROVIDER_NOT_CONFIGURED", message);
  }

  if (
    searchableMessage.includes("model") &&
    (searchableMessage.includes("unavailable") ||
      searchableMessage.includes("not found") ||
      searchableMessage.includes("unsupported"))
  ) {
    return withMessage("AI_MODEL_UNAVAILABLE", message);
  }

  if (
    searchableMessage.includes("fetch failed") ||
    searchableMessage.includes("failed to fetch") ||
    searchableMessage.includes("network") ||
    searchableMessage.includes("econnreset") ||
    searchableMessage.includes("etimedout") ||
    searchableMessage.includes("enotfound")
  ) {
    return withMessage("AI_NETWORK_ERROR", message);
  }

  if (
    searchableMessage.includes("context") ||
    searchableMessage.includes("上下文") ||
    searchableMessage.includes("故事不存在") ||
    searchableMessage.includes("无权访问")
  ) {
    return withMessage("AI_CONTEXT_ERROR", message);
  }

  if (isRetryable) {
    return withMessage("AI_NETWORK_ERROR", message);
  }

  return withMessage("AI_UNKNOWN_ERROR", message);
}

export function formatAIErrorForToast(error: NormalizedAIError): string {
  if (shouldMentionCreditRefund(error.code)) {
    return `${error.message.replace(/[。.!！?？]+$/, "")}。本次未完成；${error.recovery}`;
  }
  return `${error.message.replace(/[。.!！?？]+$/, "")}。${error.recovery}`;
}

export function serializeAIErrorForStream(error: unknown): string {
  return JSON.stringify({ error: normalizeAIError(error) });
}

function withMessage(
  code: AIErrorCode,
  message?: string | null,
): NormalizedAIError {
  const fallback = DEFAULT_ERRORS[code];
  return {
    ...fallback,
    message: message?.trim() || fallback.message,
  };
}

function normalizeCode(code: unknown): AIErrorCode | null {
  if (typeof code !== "string") return null;
  const upperCode = code.toUpperCase();

  if (upperCode in DEFAULT_ERRORS) return upperCode as AIErrorCode;
  if (upperCode === "AI_ERROR") return "AI_UNKNOWN_ERROR";
  if (upperCode === "AUTHENTICATION_REQUIRED") return "UNAUTHORIZED";
  if (upperCode === "INSUFFICIENT_QUOTA") return "QUOTA_EXCEEDED";
  if (upperCode === "RATE_LIMIT_EXCEEDED") return "QUOTA_EXCEEDED";
  if (upperCode === "QUOTA_EXCEEDED") return "QUOTA_EXCEEDED";
  if (upperCode === "INVALID_API_KEY") return "AI_PROVIDER_NOT_CONFIGURED";
  if (upperCode === "AUTHENTICATION_ERROR") return "AI_PROVIDER_NOT_CONFIGURED";
  if (upperCode === "UNAUTHORIZED") return "UNAUTHORIZED";
  if (upperCode === "MODEL_NOT_FOUND") return "AI_MODEL_UNAVAILABLE";
  if (upperCode === "MODEL_UNAVAILABLE") return "AI_MODEL_UNAVAILABLE";
  if (upperCode === "UNSUPPORTED_MODEL") return "AI_MODEL_UNAVAILABLE";

  return null;
}

function shouldMentionCreditRefund(code: AIErrorCode): boolean {
  return code === "AI_MODEL_UNAVAILABLE" ||
    code === "AI_NETWORK_ERROR" ||
    code === "AI_UNKNOWN_ERROR";
}

function isNormalizedAIError(error: unknown): error is NormalizedAIError {
  if (!isRecord(error)) return false;
  return (
    normalizeCode(error.code) === error.code &&
    typeof error.message === "string" &&
    typeof error.recovery === "string" &&
    typeof error.retryable === "boolean"
  );
}

function getStatus(error: unknown): number | null {
  if (!isRecord(error)) return null;
  if (typeof error.status === "number") return error.status;
  return typeof error.statusCode === "number" ? error.statusCode : null;
}

function getIsRetryable(error: unknown): boolean {
  if (!isRecord(error)) return false;
  return error.isRetryable === true;
}

function getBody(error: unknown): unknown {
  if (!isRecord(error)) return null;
  if ("body" in error && error.body) return error.body;
  if ("data" in error && error.data) return error.data;
  if ("responseBody" in error && error.responseBody) {
    if (typeof error.responseBody === "string") {
      return parseErrorPayload(error.responseBody);
    }
    return error.responseBody;
  }
  return null;
}

function parseErrorPayload(message: string | null): unknown {
  if (!message) return null;
  const trimmed = message.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
}

function getErrorCode(error: unknown): unknown {
  if (!isRecord(error)) return null;
  if (isRecord(error.error) && "code" in error.error) return error.error.code;
  if (isRecord(error.error) && "type" in error.error) return error.error.type;
  return "code" in error ? error.code : null;
}

function getErrorMessage(error: unknown): string | null {
  if (error instanceof Error) return error.message;
  if (!isRecord(error)) return null;
  if (typeof error.error === "string") return error.error;
  if (isRecord(error.error) && typeof error.error.message === "string") {
    return error.error.message;
  }
  return typeof error.message === "string" ? error.message : null;
}

function isAbortLikeError(error: unknown, searchableMessage: string): boolean {
  if (isRecord(error)) {
    if (error.name === "AbortError" || error.code === "ABORT_ERR") return true;
  }

  return (
    searchableMessage.includes("operation was aborted") ||
    searchableMessage.includes("request was aborted") ||
    searchableMessage.includes("aborted")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
