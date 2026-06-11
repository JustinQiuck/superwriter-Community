export const API_KEY_HEADER_SAFE_MESSAGE =
  "API Key 只能包含可用于 HTTP Header 的 ASCII 字符，请不要填写中文说明或占位文本。";

const HEADER_SAFE_API_KEY_PATTERN = /^[\x21-\x7E]+$/;

export function isHeaderSafeApiKey(value: string): boolean {
  return HEADER_SAFE_API_KEY_PATTERN.test(value);
}

export function splitApiKeyPool(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
}
