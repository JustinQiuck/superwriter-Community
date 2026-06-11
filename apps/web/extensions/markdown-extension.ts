// apps/web/extensions/markdown-extension.ts
// 封装 tiptap-markdown，提供 Markdown 序列化和快捷输入（# 标题、**粗体** 等）
import { Markdown } from "tiptap-markdown";

export const MarkdownExtension = Markdown.configure({
  html: true,
  tightLists: true,
  tightListClass: "tight",
  bulletListMarker: "-",
  linkify: false,
  breaks: false,
});
