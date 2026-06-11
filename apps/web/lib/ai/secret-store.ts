import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

type SecretEnv = Record<string, string | undefined>;
export type SecretDecryptStatus = "missing" | "saved" | "legacy_saved" | "cannot_decrypt";

type DecryptedSecretResult = {
  value: string;
  source: Extract<SecretDecryptStatus, "saved" | "legacy_saved">;
};

const SECRET_VERSION = "v1";
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const MISSING_AI_CONFIG_SECRET_KEY_MESSAGE = "需要配置 AI_CONFIG_SECRET_KEY 才能保存后台 API Key。";

export function encryptSecret(secret: string, env: SecretEnv = process.env): string {
  const key = deriveRequiredEncryptionKey(env);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: AUTH_TAG_BYTES });
  const ciphertext = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    SECRET_VERSION,
    encodeBase64Url(iv),
    encodeBase64Url(authTag),
    encodeBase64Url(ciphertext),
  ].join(":");
}

export function decryptSecret(encrypted: string, env: SecretEnv = process.env): string {
  const [version, ivPart, authTagPart, ciphertextPart] = encrypted.split(":");
  if (version !== SECRET_VERSION || !ivPart || !authTagPart || !ciphertextPart) {
    throw new Error("AI 调用来源密钥格式无效，请重新保存该调用来源。");
  }

  const result = tryDecryptSecret(encrypted, env);
  if (!result) {
    throw new Error("AI 调用来源密钥无法解密，请重新保存该调用来源。");
  }
  return result.value;
}

export function getSecretDecryptStatus(
  encrypted: string | null | undefined,
  env: SecretEnv = process.env,
): SecretDecryptStatus {
  if (!encrypted) return "missing";
  return tryDecryptSecret(encrypted, env)?.source ?? "cannot_decrypt";
}

export function maskSecret(secret: string): string {
  const trimmed = secret.trim();
  if (!trimmed) return "";
  const suffix = trimmed.slice(-4);
  return `已保存 ••••${suffix}`;
}

export function hasAIConfigSecretKey(env: SecretEnv = process.env): boolean {
  return Boolean(env.AI_CONFIG_SECRET_KEY?.trim());
}

export function isMissingAIConfigSecretKeyError(error: unknown): error is Error {
  return error instanceof Error && error.message === MISSING_AI_CONFIG_SECRET_KEY_MESSAGE;
}

function deriveRequiredEncryptionKey(env: SecretEnv): Buffer {
  const raw = env.AI_CONFIG_SECRET_KEY;
  if (!raw?.trim()) {
    throw new Error(MISSING_AI_CONFIG_SECRET_KEY_MESSAGE);
  }
  return createHash("sha256").update(raw.trim()).digest();
}

function tryDecryptSecret(encrypted: string, env: SecretEnv): DecryptedSecretResult | null {
  for (const candidate of getDecryptionKeys(env)) {
    try {
      return {
        value: decryptSecretWithKey(encrypted, candidate.key),
        source: candidate.source,
      };
    } catch {
      continue;
    }
  }
  return null;
}

function getDecryptionKeys(env: SecretEnv): Array<{
  key: Buffer;
  source: DecryptedSecretResult["source"];
}> {
  const keys: Array<{
    key: Buffer;
    source: DecryptedSecretResult["source"];
  }> = [];
  if (env.AI_CONFIG_SECRET_KEY?.trim()) {
    keys.push({
      key: createHash("sha256").update(env.AI_CONFIG_SECRET_KEY.trim()).digest(),
      source: "saved",
    });
  }
  if (env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    keys.push({
      key: createHash("sha256").update(env.SUPABASE_SERVICE_ROLE_KEY.trim()).digest(),
      source: "legacy_saved",
    });
  }
  return keys;
}

function decryptSecretWithKey(encrypted: string, key: Buffer): string {
  const [version, ivPart, authTagPart, ciphertextPart] = encrypted.split(":");
  if (version !== SECRET_VERSION || !ivPart || !authTagPart || !ciphertextPart) {
    throw new Error("AI 调用来源密钥格式无效，请重新保存该调用来源。");
  }

  const decipher = createDecipheriv("aes-256-gcm", key, decodeBase64Url(ivPart), {
    authTagLength: AUTH_TAG_BYTES,
  });
  decipher.setAuthTag(decodeBase64Url(authTagPart));
  const plaintext = Buffer.concat([
    decipher.update(decodeBase64Url(ciphertextPart)),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

function encodeBase64Url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function decodeBase64Url(value: string): Buffer {
  const padded = value.padEnd(value.length + (4 - (value.length % 4 || 4)), "=");
  return Buffer.from(padded.replaceAll("-", "+").replaceAll("_", "/"), "base64");
}
