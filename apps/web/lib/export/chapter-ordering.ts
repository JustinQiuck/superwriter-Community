export interface ExportChapter {
  name: string;
  content?: string | null;
  sort_order?: number | null;
  data?: {
    chapter_number?: number | null;
  } | Record<string, unknown> | null;
  created_at?: string | null;
}

export function sortChaptersForExport<T extends ExportChapter>(chapters: T[]): T[] {
  return [...chapters].sort((a, b) => {
    const sortOrderDiff = compareOptionalNumber(a.sort_order, b.sort_order);
    if (sortOrderDiff !== 0) return sortOrderDiff;

    const chapterNumberDiff = compareOptionalNumber(
      getChapterNumber(a),
      getChapterNumber(b),
    );
    if (chapterNumberDiff !== 0) return chapterNumberDiff;

    return compareOptionalDate(a.created_at, b.created_at);
  });
}

function getChapterNumber(chapter: ExportChapter): number | null {
  const value = chapter.data?.chapter_number;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function compareOptionalNumber(
  left: number | null | undefined,
  right: number | null | undefined,
): number {
  const leftValue = typeof left === "number" && Number.isFinite(left) ? left : null;
  const rightValue = typeof right === "number" && Number.isFinite(right) ? right : null;

  if (leftValue === null && rightValue === null) return 0;
  if (leftValue === null) return 1;
  if (rightValue === null) return -1;
  return leftValue - rightValue;
}

function compareOptionalDate(
  left: string | null | undefined,
  right: string | null | undefined,
): number {
  const leftTime = left ? Date.parse(left) : Number.NaN;
  const rightTime = right ? Date.parse(right) : Number.NaN;
  const leftValid = Number.isFinite(leftTime);
  const rightValid = Number.isFinite(rightTime);

  if (!leftValid && !rightValid) return 0;
  if (!leftValid) return 1;
  if (!rightValid) return -1;
  return leftTime - rightTime;
}
