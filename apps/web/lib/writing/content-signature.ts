export interface ContentSignature {
  signature: string;
  textLength: number;
  wordCount: number;
  normalizedText: string;
}

export function buildContentSignature(content: string): ContentSignature {
  const normalizedText = normalizeWritingContent(content);
  const textLength = normalizedText.length;
  const wordCount = countWritingUnits(normalizedText);
  const hash = fnv1a(normalizedText);

  return {
    signature: `${textLength}:${wordCount}:${hash}`,
    textLength,
    wordCount,
    normalizedText,
  };
}

export function normalizeWritingContent(content: string): string {
  return content
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function countWritingUnits(text: string): number {
  const cjkMatches = text.match(/[\u3400-\u9fff]/g);
  const latinMatches = text.match(/[A-Za-z0-9]+/g);
  return (cjkMatches?.length ?? 0) + (latinMatches?.length ?? 0);
}

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
