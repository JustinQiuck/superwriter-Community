import type { ImportSectionType } from "@/types/import";

export interface DraftImportSection {
  section_type: ImportSectionType;
  title: string;
  volume_title?: string;
  content: string;
  word_count: number;
  sort_order: number;
  metadata: Record<string, unknown>;
}

interface HeadingLine {
  index: number;
  raw: string;
  title: string;
  type: "chapter" | "volume";
}

const CHINESE_NUMBER = "[一二三四五六七八九十百千万两0-9]+";
const HEADING_TRAILER = "(?:$|[\\s:：,，.。-])";
const CHAPTER_PATTERN = new RegExp(
  `^(?:第\\s*${CHINESE_NUMBER}\\s*[章回]|Chapter\\s+\\d+)${HEADING_TRAILER}`,
  "i",
);
const VOLUME_PATTERN = new RegExp(`^(?:第\\s*${CHINESE_NUMBER}\\s*卷|卷\\s*${CHINESE_NUMBER})${HEADING_TRAILER}`);
const NOTE_TITLE_PATTERN = /(作者的话|后记|番外说明)/;

export function splitManuscriptIntoSections(text: string): DraftImportSection[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const headings = collectHeadings(lines);
  const chapterHeadings = headings.filter((heading) => heading.type === "chapter");

  if (chapterHeadings.length === 0) {
    const content = text.trim();
    return [
      buildSection({
        section_type: "unknown",
        title: "未命名片段 1",
        content,
        sort_order: 0,
        metadata: {},
      }),
    ];
  }

  const sections: DraftImportSection[] = [];
  let currentVolumeTitle: string | undefined;
  let previousChapter: HeadingLine | undefined;
  let previousChapterVolumeTitle: string | undefined;

  for (const heading of headings) {
    if (heading.type === "volume") {
      currentVolumeTitle = heading.title;
      continue;
    }

    if (!previousChapter) {
      emitLeadingSection(lines.slice(0, heading.index).join("\n").trim(), heading.raw, sections);
    } else {
      sections.push(
        buildSection({
          section_type: "chapter",
          title: previousChapter.title,
          volume_title: previousChapterVolumeTitle,
          content: sliceContent(lines, previousChapter.index + 1, heading.index),
          sort_order: sections.length,
          metadata: { heading_line: previousChapter.raw },
        }),
      );
    }

    previousChapter = heading;
    previousChapterVolumeTitle = currentVolumeTitle;
  }

  if (previousChapter) {
    sections.push(
      buildSection({
        section_type: "chapter",
        title: previousChapter.title,
        volume_title: previousChapterVolumeTitle,
        content: sliceContent(lines, previousChapter.index + 1, lines.length),
        sort_order: sections.length,
        metadata: { heading_line: previousChapter.raw },
      }),
    );
  }

  return sections;
}

export function countChineseWords(text: string): number {
  const cjkMatches = text.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g) ?? [];
  const latinWordMatches = text.match(/[A-Za-z]+/g) ?? [];
  const numberMatches = text.match(/\b\d+(?:\.\d+)?\b/g) ?? [];

  return cjkMatches.length + latinWordMatches.length + numberMatches.length;
}

function collectHeadings(lines: string[]): HeadingLine[] {
  const headings: HeadingLine[] = [];

  lines.forEach((line, index) => {
    const title = stripMarkdownHeadingMarkers(line);
    if (!title) return;

    if (isVolumeHeading(title)) {
      headings.push({ index, raw: line, title, type: "volume" });
      return;
    }

    if (isChapterHeading(title)) {
      headings.push({ index, raw: line, title, type: "chapter" });
    }
  });

  return headings;
}

function stripMarkdownHeadingMarkers(line: string): string {
  return line.trim().replace(/^#{1,6}\s+/, "").trim();
}

function sliceContent(lines: string[], start: number, end: number): string {
  return lines.slice(start, end).join("\n").trim();
}

function emitLeadingSection(content: string, nextHeadingLine: string, sections: DraftImportSection[]): void {
  content = content
    .split("\n")
    .filter((line) => !isVolumeHeading(stripMarkdownHeadingMarkers(line)))
    .join("\n")
    .trim();
  if (!content) return;

  const firstLine = content.split("\n").find((line) => line.trim())?.trim() ?? "";
  const section_type: ImportSectionType = NOTE_TITLE_PATTERN.test(content) ? "note" : "prologue";
  const title = section_type === "note" ? firstLine : "前言";

  sections.push(
    buildSection({
      section_type,
      title,
      content,
      sort_order: sections.length,
      metadata: { heading_line: nextHeadingLine },
    }),
  );
}

function isChapterHeading(title: string): boolean {
  return CHAPTER_PATTERN.test(title);
}

function isVolumeHeading(title: string): boolean {
  return VOLUME_PATTERN.test(title);
}

function buildSection(input: {
  section_type: ImportSectionType;
  title: string;
  volume_title?: string;
  content: string;
  sort_order: number;
  metadata: Record<string, unknown>;
}): DraftImportSection {
  return {
    section_type: input.section_type,
    title: input.title,
    volume_title: input.volume_title,
    content: input.content,
    word_count: countChineseWords(input.content),
    sort_order: input.sort_order,
    metadata: input.metadata,
  };
}
