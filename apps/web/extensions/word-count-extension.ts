// apps/web/extensions/word-count-extension.ts
// 使用 @tiptap/extension-character-count 作为底层，
// 暴露中英文混合计数逻辑：中文按字计数，英文按词计数
import CharacterCount from "@tiptap/extension-character-count";

/**
 * 中英文混合字数统计
 * - 中文字符（CJK）逐字计数
 * - 英文/其他语言按空格分词计数
 */
export function countChineseAndEnglish(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) ?? []).length;
  const englishWords = text
    .replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  return chineseChars + englishWords;
}

export const WordCountExtension = CharacterCount.configure();
