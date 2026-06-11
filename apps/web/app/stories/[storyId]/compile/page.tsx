"use client";

import { use, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateEpub } from "@/lib/export/epub";
import { sortChaptersForExport, type ExportChapter } from "@/lib/export/chapter-ordering";

interface CompileStory {
  title: string;
  description?: string | null;
  author_name?: string | null;
}

interface CompileChapter extends ExportChapter {
  name: string;
  content?: string | null;
}

export default function CompilePage({
  params,
}: {
  params: Promise<{ storyId: string }>;
}) {
  const { storyId } = use(params);
  const [exporting, setExporting] = useState<string | null>(null);

  const fetchStoryAndChapters = async () => {
    const [storiesRes, entitiesRes] = await Promise.all([
      fetch(`/api/stories/${storyId}`),
      fetch(`/api/stories/${storyId}/entities?type=chapter`),
    ]);

    const story = (await storiesRes.json()).data as CompileStory;
    const chapters = ((await entitiesRes.json()).data ?? []) as CompileChapter[];
    return { story, chapters };
  };

  const handleExportMarkdown = async () => {
    setExporting("markdown");
    try {
      const { story, chapters } = await fetchStoryAndChapters();

      let markdown = `# ${story.title}\n\n`;
      if (story.description) markdown += `${story.description}\n\n`;
      markdown += `---\n\n`;

      const sorted = sortChaptersForExport(chapters);
      for (const chapter of sorted) {
        markdown += `## ${chapter.name}\n\n`;
        if (chapter.content) {
          markdown += `${stripHtml(chapter.content)}\n\n`;
        }
        markdown += `---\n\n`;
      }

      downloadBlob(new Blob([markdown], { type: "text/markdown" }), `${story.title}.md`);
    } catch {
      alert("导出失败");
    } finally {
      setExporting(null);
    }
  };

  const handleExportEpub = async () => {
    setExporting("epub");
    try {
      const { story, chapters } = await fetchStoryAndChapters();
      const sorted = sortChaptersForExport(chapters);

      const blob = await generateEpub({
        title: story.title,
        author: story.author_name ?? "SuperWriter 用户",
        description: story.description ?? undefined,
        chapters: sorted.map((ch) => ({
          name: ch.name,
          content: ch.content ?? "",
          sort_order: ch.sort_order,
          data: ch.data,
          created_at: ch.created_at,
        })),
      });

      downloadBlob(blob, `${story.title}.epub`);
    } catch {
      alert("导出失败");
    } finally {
      setExporting(null);
    }
  };

  const handleExportHtml = async () => {
    setExporting("html");
    try {
      const { story, chapters } = await fetchStoryAndChapters();
      const sorted = sortChaptersForExport(chapters);

      let html = `<!DOCTYPE html>
<html lang="zh"><head><meta charset="utf-8"><title>${escHtml(story.title)}</title>
<style>body{font-family:serif;max-width:800px;margin:2em auto;line-height:1.8;}h1{text-align:center;}h2{page-break-before:always;}</style>
</head><body><h1>${escHtml(story.title)}</h1>`;
      if (story.description) html += `<p><em>${escHtml(story.description)}</em></p>`;
      html += `<hr>`;
      for (const ch of sorted) {
        html += `<h2>${escHtml(ch.name)}</h2>${ch.content ?? ""}`;
      }
      html += `</body></html>`;

      downloadBlob(new Blob([html], { type: "text/html" }), `${story.title}.html`);
    } catch {
      alert("导出失败");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">编译导出</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Markdown 导出</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              导出为 Markdown 格式，包含所有章节内容
            </p>
            <Button onClick={handleExportMarkdown} disabled={exporting !== null}>
              {exporting === "markdown" ? "导出中..." : "导出 Markdown"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">EPUB 导出</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              导出为 EPUB 电子书格式，可在阅读器中打开
            </p>
            <Button onClick={handleExportEpub} disabled={exporting !== null}>
              {exporting === "epub" ? "导出中..." : "导出 EPUB"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">HTML 导出</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              导出为 HTML 格式，可在浏览器中直接阅读
            </p>
            <Button onClick={handleExportHtml} disabled={exporting !== null}>
              {exporting === "html" ? "导出中..." : "导出 HTML"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

function escHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
