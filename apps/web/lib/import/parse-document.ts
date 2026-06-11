import JSZip from "jszip";

import { countChineseWords } from "@/lib/import/chapter-splitter";

type ParsedFileType = "txt" | "md" | "docx";

export interface ParsedImportDocument {
  filename: string;
  fileType: ParsedFileType;
  fileSize: number;
  text: string;
  wordCount: number;
  metadata: Record<string, unknown>;
}

export class UnsupportedImportFileTypeError extends Error {
  constructor(filename: string) {
    super(`Unsupported import file type: ${filename}`);
    this.name = "UnsupportedImportFileTypeError";
  }
}

export class ImportDocumentParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportDocumentParseError";
  }
}

export async function parseImportDocument(file: File): Promise<ParsedImportDocument> {
  const fileType = getFileType(file.name);
  if (!fileType) throw new UnsupportedImportFileTypeError(file.name);

  const parsed =
    fileType === "docx"
      ? await parseDocx(file)
      : { text: await file.text(), metadata: { parser: "plain-text" } };
  const text = normalizeText(parsed.text);

  return {
    filename: file.name,
    fileType,
    fileSize: file.size,
    text,
    wordCount: countChineseWords(text),
    metadata: parsed.metadata,
  };
}

function getFileType(filename: string): ParsedFileType | null {
  const extension = filename.split(".").pop()?.toLowerCase();
  if (extension === "txt" || extension === "md" || extension === "docx") return extension;
  return null;
}

function normalizeText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function parseDocx(file: File): Promise<{ text: string; metadata: Record<string, unknown> }> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const documentXml = await zip.file("word/document.xml")?.async("string");

  if (!documentXml) {
    throw new ImportDocumentParseError("DOCX document.xml is missing");
  }

  const paragraphs = [...documentXml.matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g)]
    .map((paragraphMatch) => extractParagraphText(paragraphMatch[1]))
    .filter((paragraph) => paragraph.length > 0);

  return {
    text: paragraphs.join("\n\n"),
    metadata: { parser: "docx-document-xml", paragraphCount: paragraphs.length },
  };
}

function extractParagraphText(xml: string): string {
  return [...xml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)]
    .map((textMatch) => unescapeXml(textMatch[1]))
    .join("")
    .trim();
}

function unescapeXml(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
