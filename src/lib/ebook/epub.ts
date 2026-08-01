import JSZip from "jszip";
import crypto from "crypto";
import type { BookSpec } from "../types";

const CONTAINER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

const CSS = `body { font-family: Georgia, serif; margin: 1.5em 2em; color: #242424; background: #fffdf5; }
h1 { color: #e39b1f; font-size: 1.4em; margin-bottom: 0.2em; }
.page-label { font-size: 0.7em; text-transform: uppercase; letter-spacing: 0.1em; color: #e39b1f; font-weight: bold; }
.illustration { width: 100%; max-height: 60vmax; object-fit: cover; border-radius: 8px; margin-bottom: 1em; }
p { font-size: 1.1em; line-height: 1.7; }
.back-cover { text-align: center; margin-top: 3em; color: #888; }
.back-cover-wrapper {
  background-color: #180f29;
  color: #ffffff;
  padding: 3em 2em;
  margin: -1.5em -2em;
  min-height: 95vh;
  box-sizing: border-box;
  text-align: center;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
}
.back-cover-wrapper h1 {
  color: #ffffff;
  font-size: 1.8em;
  margin-top: 0.5em;
  margin-bottom: 0.5em;
  font-weight: bold;
}
.back-cover-blurb {
  font-style: italic;
  color: #dddddd;
  line-height: 1.6;
  margin: 1.5em auto;
  max-width: 500px;
  font-size: 1.1em;
}
.back-cover-the-end {
  color: #e39b1f;
  font-weight: bold;
  font-size: 1.2em;
  margin-top: 1.5em;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.back-cover-divider {
  border: 0;
  border-top: 1px solid rgba(255,255,255,0.2);
  margin: 2.5em 0 1.5em 0;
}
.back-cover-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.5em;
  font-size: 0.8em;
  color: #aaaaaa;
}
.back-cover-publisher { text-align: left; }
.back-cover-barcode-container { text-align: right; }
`;

const SPARKLE_SVG = `<svg width="64" height="64" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="display: inline-block;">
  <circle cx="12" cy="12" r="8" fill="#e39b1f" opacity="0.15" />
  <circle cx="12" cy="12" r="5" fill="#e39b1f" opacity="0.35" />
  <circle cx="12" cy="12" r="2.5" fill="#ffd700" />
  <path d="M12 3 L13 9 L19 12 L13 15 L12 21 L11 15 L5 12 L11 9 Z" fill="#ffd700" opacity="0.9" />
</svg>`;

function barcodeSvg(title: string): string {
  let seed = 0;
  for (const ch of title) seed += ch.charCodeAt(0);
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const bars: string[] = [];
  let x = 5;
  for (let i = 0; i < 15; i++) {
    const w = [1, 2, 3][Math.floor(rand() * 3)];
    bars.push(`<rect x="${x}" y="2" width="${w}" height="22" fill="black" />`);
    x += w + [1, 2][Math.floor(rand() * 2)];
  }
  const totalW = x + 5;
  return (
    `<svg width="${totalW}" height="36" xmlns="http://www.w3.org/2000/svg" ` +
    `style="background: white; padding: 4px; border-radius: 4px; display: inline-block;">` +
    bars.join("") +
    `<text x="${totalW / 2}" y="32" font-family="Helvetica, Arial, sans-serif" font-size="5" text-anchor="middle" fill="black">ISBN 978-3-16-148410-0</text>` +
    `</svg>`
  );
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function buildEpub(
  spec: BookSpec,
  images: Record<string, Buffer>,
): Promise<Buffer> {
  const uid = crypto.randomUUID();
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.file("META-INF/container.xml", CONTAINER_XML);

  const oebps = zip.folder("OEBPS")!;
  oebps.file("style/nav.css", CSS);

  const title = escapeXml(spec.title);
  const blurb =
    escapeXml(spec.back_cover_blurb) ||
    "Follow our characters on a magical, heartwarming journey!";

  const cover = images["cover"];
  if (cover) oebps.file("images/cover.png", cover);

  const manifest: string[] = [];
  const spine: string[] = [];
  const navPoints: string[] = [];

  let playOrder = 0;
  const addNavPoint = (id: string, label: string, src: string) => {
    playOrder += 1;
    navPoints.push(
      `<navPoint id="np-${id}" playOrder="${playOrder}"><navLabel><text>${escapeXml(label)}</text></navLabel><content src="${src}"/></navPoint>`,
    );
  };

  manifest.push(
    `<item id="cover-image" href="images/cover.png" media-type="image/png" properties="cover-image"/>`,
    `<item id="css" href="style/nav.css" media-type="text/css"/>`,
    `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`,
    `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
  );

  const xhtmlHead = (t: string) =>
    `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>${t}</title><link rel="stylesheet" href="style/nav.css"/></head>`;

  oebps.file(
    "title.xhtml",
    `${xhtmlHead(title)}<body><h1>${title}</h1><p><em>by Playbook</em></p></body></html>`,
  );
  manifest.push(`<item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>`);
  spine.push(`<itemref idref="title"/>`);
  addNavPoint("cover", "Cover", "title.xhtml");

  for (let i = 0; i < spec.pages.length; i++) {
    const page = spec.pages[i];
    const imgBuf = images[`page_${i}`];
    let imgTag = "";
    if (imgBuf) {
      const b64 = imgBuf.toString("base64");
      imgTag =
        `<img src="data:image/png;base64,${b64}" alt="${escapeXml(page.alt_text || page.illustration_prompt)}" class="illustration"/>`;
      oebps.file(`images/page_${i}.png`, imgBuf);
    }
    oebps.file(
      `page_${i + 1}.xhtml`,
      `${xhtmlHead(`Page ${i + 1}`)}<body><p class="page-label">Page ${i + 1}</p>${imgTag}<p>${escapeXml(page.text)}</p></body></html>`,
    );
    manifest.push(
      `<item id="page-${i + 1}" href="page_${i + 1}.xhtml" media-type="application/xhtml+xml"/>`,
    );
    spine.push(`<itemref idref="page-${i + 1}"/>`);
    addNavPoint(`page-${i + 1}`, `Page ${i + 1}`, `page_${i + 1}.xhtml`);
  }

  oebps.file(
    "end.xhtml",
    `${xhtmlHead("The End")}<body><div class="back-cover-wrapper"><div style="margin-bottom: 1.5em;">${SPARKLE_SVG}</div><h1>&ldquo;${title}&rdquo;</h1><p class="back-cover-blurb">${blurb}</p><p class="back-cover-the-end">THE END</p><hr class="back-cover-divider"/><div class="back-cover-footer"><div class="back-cover-publisher">Published by Playbook AI</div><div class="back-cover-barcode-container">${barcodeSvg(spec.title)}</div></div></div></body></html>`,
  );
  manifest.push(`<item id="end" href="end.xhtml" media-type="application/xhtml+xml"/>`);
  spine.push(`<itemref idref="end"/>`);
  addNavPoint("end", "The End", "end.xhtml");

  const navXhtml = `${xhtmlHead(title)}<body><nav epub:prefix="dcterms: http://purl.org/dc/terms/" xmlns:epub="http://www.idpf.org/2007/ops" epub:type="toc" id="toc"><h1>Table of Contents</h1><ol>${navPoints
    .map((np) => np.replace(/^<navPoint[^>]*>/, "<li>").replace(/<\/navPoint>$/, "</li>"))
    .join("")}</ol></nav></body></html>`;

  oebps.file("nav.xhtml", navXhtml);

  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId" xml:lang="en">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">urn:uuid:${uid}</dc:identifier>
    <dc:title>${title}</dc:title>
    <dc:language>en</dc:language>
    <dc:creator>Playbook AI</dc:creator>
    <meta name="cover" content="cover-image"/>
  </metadata>
  <manifest>
${manifest.map((m) => `    ${m}`).join("\n")}
  </manifest>
  <spine toc="ncx">
${spine.map((s) => `    ${s}`).join("\n")}
  </spine>
</package>`;

  oebps.file("content.opf", contentOpf);

  const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head><meta name="dtb:uid" content="urn:uuid:${uid}"/></head>
  <docTitle><text>${title}</text></docTitle>
  <navMap>
${navPoints.map((np) => `    ${np}`).join("\n")}
  </navMap>
</ncx>`;

  oebps.file("toc.ncx", ncx);

  const out = await zip.generateAsync({
    type: "nodebuffer",
    mimeType: "application/epub+zip",
    compression: "DEFLATE",
  });
  return Buffer.from(out);
}
