import { embed } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

type EmbeddingProvider = "openai" | "dashscope" | "zhipu";

type EmbeddingProviderConfig = {
  provider: EmbeddingProvider;
  model: string;
  dimensions: number;
  baseURL?: string;
  apiKeyEnvNames: string[];
};

type EmbeddingEnv = Record<string, string | undefined>;

const EMBEDDING_DIMENSIONS = 1536;
const DEFAULT_PROVIDER: EmbeddingProvider = "openai";
const PROVIDER_CONFIGS: Record<
  EmbeddingProvider,
  Omit<EmbeddingProviderConfig, "provider">
> = {
  openai: {
    model: "text-embedding-3-small",
    dimensions: EMBEDDING_DIMENSIONS,
    apiKeyEnvNames: ["OPENAI_API_KEY"],
  },
  dashscope: {
    model: "text-embedding-v4",
    dimensions: EMBEDDING_DIMENSIONS,
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKeyEnvNames: ["DASHSCOPE_API_KEY"],
  },
  zhipu: {
    model: "Embedding-3",
    dimensions: EMBEDDING_DIMENSIONS,
    baseURL: "https://open.bigmodel.cn/api/paas/v4/",
    apiKeyEnvNames: ["ZHIPU_API_KEY", "ZAI_API_KEY"],
  },
};

const MAX_SEGMENT_LENGTH = 8000;
const OVERLAP_LENGTH = 1000;

export function resolveEmbeddingConfig(
  env: EmbeddingEnv = process.env,
): EmbeddingProviderConfig {
  const provider = normalizeEmbeddingProvider(env.EMBEDDING_PROVIDER);
  const defaults = PROVIDER_CONFIGS[provider];
  const model = env.EMBEDDING_MODEL?.trim() || defaults.model;
  const baseURL =
    env.EMBEDDING_BASE_URL?.trim() ||
    getProviderBaseURLOverride(provider, env) ||
    defaults.baseURL;

  return {
    provider,
    model,
    dimensions: defaults.dimensions,
    baseURL,
    apiKeyEnvNames: defaults.apiKeyEnvNames,
  };
}

function normalizeEmbeddingProvider(
  provider: string | undefined,
): EmbeddingProvider {
  if (!provider) return DEFAULT_PROVIDER;

  const normalized = provider.trim().toLowerCase();
  if (
    normalized === "openai" ||
    normalized === "dashscope" ||
    normalized === "zhipu"
  ) {
    return normalized;
  }

  throw new Error(
    `Unsupported embedding provider "${provider}". Use openai, dashscope, or zhipu.`,
  );
}

function getProviderBaseURLOverride(
  provider: EmbeddingProvider,
  env: EmbeddingEnv,
): string | undefined {
  if (provider === "openai") return env.OPENAI_BASE_URL?.trim() || undefined;
  if (provider === "dashscope") {
    return env.DASHSCOPE_BASE_URL?.trim() || undefined;
  }
  return env.ZHIPU_BASE_URL?.trim() || undefined;
}

function getEmbeddingApiKey(
  config: EmbeddingProviderConfig,
  env: EmbeddingEnv = process.env,
): string {
  for (const keyName of config.apiKeyEnvNames) {
    const value = env[keyName]?.trim();
    if (value) return value;
  }

  throw new Error(
    `Missing API key for embedding provider "${config.provider}". Set one of: ${config.apiKeyEnvNames.join(", ")}.`,
  );
}

function getEmbeddingModel() {
  const config = resolveEmbeddingConfig();
  const provider = createOpenAI({
    apiKey: getEmbeddingApiKey(config),
    baseURL: config.baseURL,
  });

  return provider.embedding(config.model, {
    dimensions: config.dimensions,
  });
}

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: getEmbeddingModel(),
    value: text,
  });
  return embedding;
}

export async function embedMany(texts: string[]): Promise<number[][]> {
  const BATCH_SIZE = 5;
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map((t) => embedText(t)));
    results.push(...batchResults);
  }
  return results;
}

export function segmentText(
  content: string,
): { text: string; index: number }[] {
  const plainText = content
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

  if (!plainText) return [];
  if (plainText.length <= MAX_SEGMENT_LENGTH) {
    return [{ text: plainText, index: 0 }];
  }

  const paragraphs = plainText
    .split(/\n\n+/)
    .filter((p) => p.trim().length > 0);

  const segments: { text: string; index: number }[] = [];
  let currentSegment = "";
  let segmentIndex = 0;

  for (const para of paragraphs) {
    if (
      currentSegment.length + para.length > MAX_SEGMENT_LENGTH &&
      currentSegment.length > 0
    ) {
      segments.push({ text: currentSegment.trim(), index: segmentIndex++ });
      const overlap = currentSegment.slice(-OVERLAP_LENGTH);
      currentSegment = overlap + "\n\n" + para;
    } else {
      currentSegment += (currentSegment ? "\n\n" : "") + para;
    }
  }

  if (currentSegment.trim()) {
    segments.push({ text: currentSegment.trim(), index: segmentIndex });
  }

  return segments;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length * 0.7);
}
