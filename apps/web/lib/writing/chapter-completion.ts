import { htmlToMarkdown } from "@/lib/utils/markdown";

export interface ChapterCompletionInput {
  chapterName: string;
  chapterText: string;
  primaryGoal: string;
  mustInclude: string[];
  nextBeatTitle?: string | null;
}

export function buildChapterCompletionInput(input: ChapterCompletionInput): string {
  const chapterText = normalizeChapterCompletionText(input.chapterText);
  const lines = [
    `章节：${input.chapterName}`,
    `本章目标：${input.primaryGoal}`,
  ];

  if (input.mustInclude.length > 0) {
    lines.push(`必须交代：${input.mustInclude.join("；")}`);
  }

  if (input.nextBeatTitle?.trim()) {
    lines.push(`下一章方向：${input.nextBeatTitle.trim()}`);
  }

  lines.push("", "## 当前章节正文", chapterText.slice(0, 12000));

  return lines.join("\n");
}

export function hasMeaningfulChapterCompletionPrompt(prompt: string | undefined): boolean {
  if (!prompt?.trim()) return false;

  const marker = "## 当前章节正文";
  const markerIndex = prompt.indexOf(marker);
  if (markerIndex === -1) return false;

  const chapterSection = prompt.slice(markerIndex + marker.length).trim();
  return chapterSection.length > 0;
}

export function normalizeChapterCompletionText(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return "";

  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return htmlToMarkdown(trimmed)
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  return trimmed;
}
