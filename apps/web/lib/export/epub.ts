import JSZip from "jszip";
import { sortChaptersForExport, type ExportChapter } from "@/lib/export/chapter-ordering";

function htmlToXhtml(html: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title></title>
<style>
body { font-family: serif; line-height: 1.6; margin: 1em; }
h1 { text-align: center; margin-bottom: 2em; page-break-before: always; }
h2 { page-break-before: always; margin-top: 2em; }
p { text-indent: 2em; margin: 0.5em 0; }
</style>
</head>
<body>${html}</body>
</html>`;
}

interface ChapterData extends ExportChapter {
  name: string;
  content: string;
}

export async function generateEpub(args: {
  title: string;
  author: string;
  description?: string;
  chapters: ChapterData[];
}): Promise<Blob> {
  const { title, author, description, chapters } = args;
  const zip = new JSZip();

  const uid = `superwriter-${Date.now()}`;
  const isoDate = new Date().toISOString().split("T")[0];

  zip.file("mimetype", "application/epub+zip");

  const meta = zip.folder("META-INF");
  meta?.file("container.xml", `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  const oebps = zip.folder("OEBPS")!;

  const manifestItems: string[] = [];
  const spineItems: string[] = [];
  const navPoints: string[] = [];

  oebps.file(
    "title.xhtml",
    htmlToXhtml(`<h1>${escapeXml(title)}</h1>${description ? `<p>${escapeXml(description)}</p>` : ""}<p>作者: ${escapeXml(author)}</p>`),
  );
  manifestItems.push(`<item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>`);
  spineItems.push(`<itemref idref="title"/>`);

  const sortedChapters = sortChaptersForExport(chapters);

  for (let i = 0; i < sortedChapters.length; i++) {
    const ch = sortedChapters[i];
    const filename = `chapter${i + 1}.xhtml`;
    const chHtml = htmlContentFromRichText(ch.content);
    oebps.file(filename, htmlToXhtml(`<h2>${escapeXml(ch.name)}</h2>${chHtml}`));

    const id = `chapter${i + 1}`;
    manifestItems.push(`<item id="${id}" href="${filename}" media-type="application/xhtml+xml"/>`);
    spineItems.push(`<itemref idref="${id}"/>`);
    navPoints.push(`<navPoint id="nav-${id}" playOrder="${i + 2}"><navLabel><text>${escapeXml(ch.name)}</text></navLabel><content src="${filename}"/></navPoint>`);
  }

  oebps.file("toc.ncx", `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${uid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(title)}</text></docTitle>
  <docAuthor><text>${escapeXml(author)}</text></docAuthor>
  <navMap>
    <navPoint id="nav-title" playOrder="1"><navLabel><text>封面</text></navLabel><content src="title.xhtml"/></navPoint>
    ${navPoints.join("\n    ")}
  </navMap>
</ncx>`);

  oebps.file("content.opf", `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">${uid}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:creator>${escapeXml(author)}</dc:creator>
    <dc:language>zh</dc:language>
    <dc:date>${isoDate}</dc:date>
    <meta property="dcterms:modified">${isoDate}T00:00:00Z</meta>
  </metadata>
  <manifest>
    ${manifestItems.join("\n    ")}
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
  </manifest>
  <spine toc="ncx">
    ${spineItems.join("\n    ")}
  </spine>
</package>`);

  oebps.file("nav.xhtml", `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>目录</title></head>
<body>
<nav epub:type="toc">
  <h1>目录</h1>
  <ol>
    ${sortedChapters.map((ch, i) => `<li><a href="chapter${i + 1}.xhtml">${escapeXml(ch.name)}</a></li>`).join("\n    ")}
  </ol>
</nav>
</body>
</html>`);

  return zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlContentFromRichText(content: string): string {
  if (!content) return "";
  return content
    .replace(/<h([1-4])([^>]*)>/g, "<h$1$2>")
    .replace(/<\/h([1-4])>/g, "</h$1>")
    .replace(/<p>/g, "<p>")
    .replace(/<strong>/g, "<strong>")
    .replace(/<\/strong>/g, "</strong>")
    .replace(/<em>/g, "<em>")
    .replace(/<\/em>/g, "</em>");
}
