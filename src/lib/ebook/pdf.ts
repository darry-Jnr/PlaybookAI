import {
  PDFDocument,
  PDFFont,
  PDFImage,
  StandardFonts,
  rgb,
  type RGB,
} from "pdf-lib";
import type { BookSpec } from "../types";

const A4_W = 595.28;
const A4_H = 841.89;
const MARGIN = 39.68;

const c = (v: number): number => v / 255;
const DARK = rgb(c(36), c(36), c(36));
const GOLD = rgb(c(230), c(155), c(31));
const WHITE = rgb(1, 1, 1);
const CREAM = rgb(c(255), c(253), c(245));
const DARK_PURPLE = rgb(c(24), c(15), c(41));

interface ImageInfo {
  image: PDFImage;
  width: number;
  height: number;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      line = test;
    } else if (line) {
      lines.push(line);
      line = word;
    } else {
      lines.push(test);
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawCentered(
  page: Awaited<ReturnType<PDFDocument["addPage"]>>,
  lines: string[],
  font: PDFFont,
  size: number,
  color: RGB,
  maxWidth: number,
  startY: number,
  lineGap: number,
): number {
  let y = startY;
  for (const line of lines) {
    const w = font.widthOfTextAtSize(line, size);
    page.drawText(line, {
      x: (A4_W - Math.min(w, maxWidth)) / 2,
      y,
      size,
      font,
      color,
      maxWidth,
    });
    y -= lineGap;
  }
  return y;
}

async function embedImage(doc: PDFDocument, buf: Buffer): Promise<ImageInfo> {
  const isPng = buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50;
  const image = isPng ? await doc.embedPng(buf) : await doc.embedJpg(buf);
  return { image, width: image.width, height: image.height };
}

function drawImageCover(
  page: Awaited<ReturnType<PDFDocument["addPage"]>>,
  info: ImageInfo,
  x: number,
  y: number,
  rectW: number,
  rectH: number,
): void {
  const scale = Math.max(rectW / info.width, rectH / info.height);
  const w = info.width * scale;
  const h = info.height * scale;
  page.drawImage(info.image, {
    x: x + (rectW - w) / 2,
    y: y + (rectH - h) / 2,
    width: w,
    height: h,
  });
}

function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function buildPdf(
  spec: BookSpec,
  images: Record<string, Buffer>,
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.setTitle(spec.title);
  doc.setProducer("Playbook AI");
  doc.setCreator("Playbook AI");

  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const helvItalic = await doc.embedFont(StandardFonts.HelveticaOblique);

  const coverInfo = images["cover"] ? await embedImage(doc, images["cover"]) : null;
  const pageInfos = new Map<number, ImageInfo>();
  for (const [name, buf] of Object.entries(images)) {
    const m = name.match(/^page_(\d+)$/);
    if (m) pageInfos.set(Number(m[1]), await embedImage(doc, buf));
  }

  // ── Cover ────────────────────────────────────────────────────────────────
  const cover = doc.addPage([A4_W, A4_H]);
  if (coverInfo) {
    cover.drawImage(coverInfo.image, { x: 0, y: 0, width: A4_W, height: A4_H });
  }
  cover.drawRectangle({
    x: 0,
    y: 0,
    width: A4_W,
    height: A4_H * 0.35,
    color: rgb(0, 0, 0),
    opacity: 0.45,
  });
  const titleLines = wrapText(spec.title, helvBold, 28, A4_W - MARGIN * 2);
  let titleY = A4_H * 0.33 - 10;
  titleY = drawCentered(cover, titleLines, helvBold, 28, WHITE, A4_W - MARGIN * 2, titleY, 34);
  drawCentered(cover, ["by Playbook"], helv, 11, WHITE, A4_W - MARGIN * 2, titleY - 6, 14);

  // ── Story pages ──────────────────────────────────────────────────────────
  for (let i = 0; i < spec.pages.length; i++) {
    const page = spec.pages[i];
    const sp = doc.addPage([A4_W, A4_H]);

    const info = pageInfos.get(i);
    if (info) {
      drawImageCover(sp, info, 0, 0, A4_W / 2, A4_H);
    }

    sp.drawRectangle({ x: A4_W / 2, y: 0, width: A4_W / 2, height: A4_H, color: CREAM });

    const textX = A4_W / 2 + MARGIN;
    const textW = A4_W / 2 - MARGIN * 2;
    sp.drawText(`PAGE ${i + 1}`, {
      x: textX,
      y: A4_H - MARGIN,
      size: 8,
      font: helvBold,
      color: GOLD,
    });
    const lines = wrapText(page.text, helv, 14, textW);
    let y = A4_H - MARGIN - 28;
    for (const line of lines) {
      sp.drawText(line, { x: textX, y, size: 14, font: helv, color: DARK });
      y -= 19;
    }
  }

  // ── Back cover ───────────────────────────────────────────────────────────
  const back = doc.addPage([A4_W, A4_H]);
  back.drawRectangle({ x: 0, y: 0, width: A4_W, height: A4_H, color: DARK_PURPLE });

  const cx = A4_W / 2;
  const cy = A4_H * 0.62;
  back.drawEllipse({ x: cx, y: cy, xScale: 45, yScale: 45, color: GOLD, opacity: 0.15 });
  back.drawEllipse({ x: cx, y: cy, xScale: 25.5, yScale: 25.5, color: GOLD, opacity: 0.35 });
  back.drawEllipse({ x: cx, y: cy, xScale: 11.3, yScale: 11.3, color: rgb(c(255), c(235), c(59)) });
  back.drawEllipse({ x: cx - 14, y: cy + 4, xScale: 11, yScale: 8.5, color: WHITE, opacity: 0.9 });
  back.drawEllipse({ x: cx + 14, y: cy + 4, xScale: 11, yScale: 8.5, color: WHITE, opacity: 0.9 });

  let by = cy - 55;
  const backTitle = wrapText(`"${spec.title}"`, helvBold, 24, A4_W - MARGIN * 2);
  by = drawCentered(back, backTitle, helvBold, 24, WHITE, A4_W - MARGIN * 2, by, 28);

  const blurb =
    spec.back_cover_blurb || "Follow our characters on a magical, heartwarming journey!";
  const blurbLines = wrapText(blurb, helvItalic, 13, A4_W - (MARGIN + 28) * 2);
  by = drawCentered(back, blurbLines, helvItalic, 13, rgb(c(220), c(220), c(220)), A4_W - (MARGIN + 28) * 2, by - 20, 17);

  drawCentered(back, ["THE END"], helvBold, 14, GOLD, A4_W - MARGIN * 2, by - 28, 18);

  const bottomY = 141.7;
  back.drawLine({
    start: { x: MARGIN * 2, y: bottomY },
    end: { x: A4_W - MARGIN * 2, y: bottomY },
    thickness: 0.7,
    color: rgb(c(255), c(255), c(255)),
    opacity: 0.5,
  });

  back.drawText("Published by Playbook AI", {
    x: MARGIN * 2,
    y: bottomY - 14,
    size: 10,
    font: helv,
    color: rgb(c(170), c(170), c(170)),
  });

  const barcodeX = A4_W - MARGIN * 2 - 113.4;
  const barcodeY = bottomY - 18;
  const barcodeW = 113.4;
  const barcodeH = 45.4;
  back.drawRectangle({ x: barcodeX, y: barcodeY, width: barcodeW, height: barcodeH, color: WHITE });

  const rand = seededRandom(
    spec.title.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0),
  );
  let bx = barcodeX + 8.5;
  while (bx < barcodeX + barcodeW - 8.5) {
    const barW = [1.1, 2.3, 3.4, 4.5][Math.floor(rand() * 4)];
    if (bx + barW > barcodeX + barcodeW - 8.5) break;
    back.drawRectangle({ x: bx, y: barcodeY + 5.7, width: barW, height: barcodeH - 17, color: rgb(0, 0, 0) });
    bx += barW + [1.1, 2.3, 3.4][Math.floor(rand() * 3)];
  }
  const isbn = "ISBN 978-3-16-148410-0";
  back.drawText(isbn, {
    x: barcodeX + (barcodeW - helv.widthOfTextAtSize(isbn, 5)) / 2,
    y: barcodeY + 4,
    size: 5,
    font: helv,
    color: rgb(0, 0, 0),
  });

  return Buffer.from(await doc.save());
}
