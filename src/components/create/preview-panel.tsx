"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Play,
  Maximize2,
  Minimize2,
  FileText,
  Book,
  Loader2,
} from "lucide-react";
import type { AssetInfo, BookSpec } from "@/lib/types";
import { downloadBook } from "@/lib/api";

interface PreviewPanelProps {
  generating: boolean;
  expanded?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
  book: BookSpec | null;
  assetUrls?: Record<string, AssetInfo>;
  stageProgress?: string;
  generationId?: string | null;
}

const PAGE_W = 400;
const PAGE_H = 520;

function flipPageToStory(fp: number, total: number) {
  if (fp === 0) return "Cover";
  if (fp === total - 1) return "Back Cover";
  return `Page ${Math.ceil(fp / 2)}`;
}

const Page = forwardRef<HTMLDivElement, { children: React.ReactNode }>(
  (props, ref) => (
    <div ref={ref} className="bg-[#fffdf5]">
      {props.children}
    </div>
  ),
);
Page.displayName = "Page";

export function PreviewPanel({ generating, expanded, onExpand, onCollapse, book, assetUrls, stageProgress, generationId }: PreviewPanelProps) {
  const bookRef = useRef<any>(null);
  const [curLabel, setCurLabel] = useState("Cover");
  const [showDownload, setShowDownload] = useState(false);
  const [showPages, setShowPages] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [downloading, setDownloading] = useState<"pdf" | "epub" | null>(null);
  const downloadRef = useRef<HTMLDivElement>(null);

  const total = book ? 1 + book.pages.length * 2 + 1 : 0;
  const backPage = total - 1;

  const handleDownload = async (fmt: "pdf" | "epub") => {
    if (!generationId || downloading) return;
    setShowDownload(false);
    setDownloading(fmt);
    try {
      await downloadBook(generationId, fmt);
    } catch (e) {
      console.error("Download failed:", e);
      alert(`Download failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setDownloading(null);
    }
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playModeRef = useRef(false);

  const currentPageText = useCallback(() => {
    if (!book) return null;
    const m = curLabel.match(/^Page (\d+)$/);
    return m ? book.pages[parseInt(m[1]) - 1]?.text ?? null : null;
  }, [book, curLabel]);

  const cancelAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
  }, []);

  const stopPlayback = useCallback(() => {
    cancelAudio();
    setSpeaking(false);
    playModeRef.current = false;
  }, [cancelAudio]);

  const playCurrentPage = useCallback((flipPageIndex?: number) => {
    if (!book) { stopPlayback(); return; }
    const fp = flipPageIndex ?? bookRef.current?.pageFlip()?.getCurrentPageIndex() ?? 0;
    const label = flipPageToStory(fp, total);
    const m = label.match(/^Page (\d+)$/);
    if (!m) { stopPlayback(); return; }
    const pageNum = parseInt(m[1]);
    const text = book.pages[pageNum - 1]?.text;
    if (!text) { stopPlayback(); return; }

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api";
    fetch(`${apiBase}/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then((res) => { if (!res.ok) { stopPlayback(); return null; } return res.blob(); })
      .then((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          if (!playModeRef.current) { setSpeaking(false); return; }
          const nextFp = pageNum * 2 + 1;
          if (nextFp < total - 1) {
            bookRef.current?.pageFlip()?.turnToPage(nextFp);
          } else {
            stopPlayback();
          }
        };
        audio.onerror = () => { URL.revokeObjectURL(url); stopPlayback(); };
        audio.play();
        setSpeaking(true);
        playModeRef.current = true;
      })
      .catch(() => stopPlayback());
  }, [book, total, stopPlayback, cancelAudio]);

  const togglePlay = useCallback(() => {
    if (playModeRef.current) {
      stopPlayback();
    } else {
      playCurrentPage();
    }
  }, [stopPlayback, playCurrentPage]);

  useEffect(() => stopPlayback, [stopPlayback]);

  const onFlip = useCallback((e: any) => {
    const label = flipPageToStory(e.data, total);
    setCurLabel(label);
    if (playModeRef.current) {
      playCurrentPage(e.data);
    }
  }, [total, playCurrentPage]);

  const goPrev = () => {
    setShowDownload(false);
    cancelAudio();
    bookRef.current?.pageFlip()?.flipPrev();
  };

  const goNext = () => {
    setShowDownload(false);
    cancelAudio();
    bookRef.current?.pageFlip()?.flipNext();
  };

  const goToPage = (fp: number) => {
    setShowPages(false);
    cancelAudio();
    bookRef.current?.pageFlip()?.turnToPage(fp);
    setCurLabel(flipPageToStory(fp, total));
  };

  return (
    <div className="flex h-full flex-col bg-[#FFFDF9]">
      {/* Top Toolbar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#E6D8C7]/60 bg-[#FFF8F2] px-4">
        <div className="flex items-center gap-3">
          <span className="truncate text-sm font-semibold text-[#242424]">
            {book?.title ?? "Your Storybook"}
          </span>
          {book && (
            <>
              <span className="text-[#E6D8C7]">|</span>
              <div className="relative flex items-center gap-1">
                <button
                  onClick={goPrev}
                  disabled={curLabel === "Cover"}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[#999] transition hover:bg-[#FFF3DE] hover:text-[#E39B1F] disabled:opacity-20"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span
                  onClick={() => setShowPages((s) => !s)}
                  className="min-w-[80px] cursor-pointer text-center text-xs font-medium text-[#666] hover:text-[#E39B1F]"
                >
                  {curLabel}
                </span>
                <button
                  onClick={goNext}
                  disabled={curLabel === "Back Cover"}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[#999] transition hover:bg-[#FFF3DE] hover:text-[#E39B1F] disabled:opacity-20"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <span className="text-xs text-[#999]">Jump</span>
                <button
                  onClick={() => setShowPages((s) => !s)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[#999] transition hover:bg-[#FFF3DE] hover:text-[#E39B1F]"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>

                {showPages && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowPages(false)} />
                    <div className="absolute left-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-[#E6D8C7] bg-white shadow-lg">
                      <button
                        onClick={() => goToPage(0)}
                        className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm transition hover:bg-[#FFF3DE] ${curLabel === "Cover" ? "font-semibold text-[#E39B1F]" : "text-[#242424]"}`}
                      >
                        Cover
                      </button>
                      {book.pages.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => goToPage(i * 2 + 1)}
                          className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm transition hover:bg-[#FFF3DE] ${curLabel === `Page ${i + 1}` ? "font-semibold text-[#E39B1F]" : "text-[#242424]"}`}
                        >
                          Page {i + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => goToPage(backPage)}
                        className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm transition hover:bg-[#FFF3DE] ${curLabel === "Back Cover" ? "font-semibold text-[#E39B1F]" : "text-[#242424]"}`}
                      >
                        Back Cover
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={togglePlay}
            disabled={!currentPageText()}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#999] transition hover:bg-[#FFF3DE] hover:text-[#E39B1F] disabled:opacity-20"
          >
            {speaking ? <WavesIcon /> : <Play className="h-4 w-4" />}
          </button>
          <div ref={downloadRef} className="relative">
            <button
              onClick={() => setShowDownload((s) => !s)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#999] transition hover:bg-[#FFF3DE] hover:text-[#E39B1F]"
            >
              <Download className="h-4 w-4" />
            </button>
            {showDownload && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowDownload(false)} />
                <div className="absolute right-0 top-10 z-20 w-52 overflow-hidden rounded-xl border border-[#E6D8C7] bg-white shadow-lg">
                  <button
                    onClick={() => handleDownload("pdf")}
                    disabled={!generationId || !!downloading}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm text-[#242424] transition hover:bg-[#FFF3DE] disabled:opacity-40"
                  >
                    {downloading === "pdf" ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[#E39B1F]" />
                    ) : (
                      <FileText className="h-4 w-4 text-[#E39B1F]" />
                    )}
                    {downloading === "pdf" ? "Building PDF…" : "Download as PDF"}
                  </button>
                  <button
                    onClick={() => handleDownload("epub")}
                    disabled={!generationId || !!downloading}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm text-[#242424] transition hover:bg-[#FFF3DE] disabled:opacity-40"
                  >
                    {downloading === "epub" ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[#E39B1F]" />
                    ) : (
                      <Book className="h-4 w-4 text-[#E39B1F]" />
                    )}
                    {downloading === "epub" ? "Building ePub…" : "Download as ePub"}
                  </button>
                  {!generationId && (
                    <p className="px-4 pb-3 text-[10px] text-[#999]">Generate a storybook first</p>
                  )}
                </div>
              </>
            )}
          </div>
          <button
            onClick={onCollapse ? onCollapse : onExpand}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#999] transition hover:bg-[#FFF3DE] hover:text-[#E39B1F]"
          >
            {onCollapse ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Generating bar */}
      {generating && (
        <div className="flex shrink-0 items-center justify-center gap-3 border-b border-[#E6D8C7]/60 bg-[#FFF3DE]/50 px-4 py-2">
          <div className="flex gap-1">
            {["A.plan", "B0.cover", "B1.illustrations", "B2.narration", "C.compose"].map((s) => (
              <div
                key={s}
                className={`h-1.5 w-8 rounded-full transition-colors ${
                  stageProgress?.includes(s.slice(0, 2)) ? "bg-[#E39B1F]" : "bg-[#E6D8C7]"
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-[#999]">{stageProgress || "Generating..."}</span>
        </div>
      )}

      {/* Book Stage */}
      <div className={`flex flex-1 justify-center bg-[#7C5C3E] ${expanded ? "overflow-hidden px-0 py-0" : "overflow-y-auto px-6 py-10"}`}>
        {!book ? (
          <div className="flex items-center justify-center text-white/40 text-sm">
            {generating ? "Creating your storybook..." : "Submit a story to get started"}
          </div>
        ) : (
          <div className="m-auto flex w-full max-w-4xl items-center justify-center">
            <HTMLFlipBook
              ref={bookRef}
              width={PAGE_W}
              height={PAGE_H}
              size="stretch"
              minWidth={280}
              maxWidth={600}
              minHeight={360}
              maxHeight={expanded ? 1200 : 700}
              showCover
              drawShadow
              flippingTime={800}
              usePortrait={false}
              startZIndex={0}
              maxShadowOpacity={0.6}
              startPage={0}
              autoSize
              mobileScrollSupport
              swipeDistance={30}
              clickEventForward
              useMouseEvents
              showPageCorners={false}
              disableFlipByClick={false}
              className=""
              style={{}}
              onFlip={onFlip}
            >
              {/* Cover (hard) */}
              <Page>
                <CoverPage title={book.title} coverPrompt={book.cover_prompt} imageUrl={assetUrls?.cover?.url} />
              </Page>

              {/* Story pages — each spread has illustration (left) + text (right) */}
              {book.pages.flatMap((p, i) => [
                <Page key={`ill-${i}`}>
                  <IllustrationPage
                    illustrationPrompt={p.illustration_prompt}
                    pageNum={i + 1}
                    imageUrl={assetUrls?.[`page_${i}`]?.url}
                  />
                </Page>,
                <Page key={`txt-${i}`}>
                  <TextPage text={p.text} pageNum={i + 1} />
                </Page>,
              ])}

              {/* Back Cover (hard) */}
              <Page>
                <BackCoverPage title={book.title} backCoverBlurb={book.back_cover_blurb} />
              </Page>
            </HTMLFlipBook>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Cover Page ─── */

function CoverPage({ title, coverPrompt, imageUrl }: { title: string; coverPrompt?: string; imageUrl?: string }) {
  return (
    <div className="flex h-full flex-col">
      <div className="relative flex-1 overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#2d1b4e] via-[#1a0a2e] to-[#0d0520]" />
        )}
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: "radial-gradient(circle at 30% 30%, rgba(255,215,0,0.3) 0%, transparent 45%), radial-gradient(circle at 70% 70%, rgba(100,100,255,0.15) 0%, transparent 40%)",
        }} />
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.5) 0%, transparent 100%), radial-gradient(1px 1px at 50% 20%, rgba(255,255,255,0.3) 0%, transparent 100%), radial-gradient(1px 1px at 75% 50%, rgba(255,255,255,0.4) 0%, transparent 100%), radial-gradient(1px 1px at 30% 70%, rgba(255,255,255,0.3) 0%, transparent 100%), radial-gradient(1px 1px at 60% 80%, rgba(255,255,255,0.4) 0%, transparent 100%), radial-gradient(2px 2px at 45% 45%, rgba(255,215,0,0.7) 0%, transparent 100%)",
        }} />
        <div className="absolute left-1/4 top-1/3 h-24 w-24 rounded-full blur-3xl" style={{ background: "rgba(255,215,0,0.1)" }} />
        <div className="absolute right-1/4 top-1/2 h-16 w-16 rounded-full blur-2xl" style={{ background: "rgba(100,100,255,0.08)" }} />
        {coverPrompt && (
          <p className="absolute bottom-4 left-3 right-3 text-center text-[10px] italic leading-relaxed text-white/20">
            {coverPrompt}
          </p>
        )}
      </div>
      <div className="border-t border-white/10 bg-gradient-to-t from-[#1a0a2e] to-transparent px-4 py-4 text-center">
        <h1 className="font-display text-xl leading-tight tracking-tight text-white">
          {title}
        </h1>
        <p className="mt-1 text-xs text-white/60">by Playbook</p>
      </div>
    </div>
  );
}

/* ─── Illustration Page (left side of spread) ─── */

function IllustrationPage({ illustrationPrompt, pageNum, imageUrl }: { illustrationPrompt: string; pageNum: number; imageUrl?: string }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#1a0a2e]">
      {/* Page shadow on spine side */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8" style={{
        background: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.18) 100%)",
      }} />

      {/* Full-bleed illustration */}
      <div className="relative flex-1 overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={illustrationPrompt} className="h-full w-full object-cover" />
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-[#2d1b4e] via-[#1a0a2e] to-[#0d0520]" />
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <p className="text-center text-[11px] italic leading-relaxed text-white/20">
                {illustrationPrompt}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Page number ribbon at bottom */}
      <div className="shrink-0 bg-[#1a0a2e]/80 px-4 py-[6px] text-center">
        <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/30">
          {pageNum}
        </span>
      </div>
    </div>
  );
}

/* ─── Text Page (right side of spread) ─── */

function TextPage({ text, pageNum }: { text: string; pageNum: number }) {
  // Split into a drop-cap first letter + rest
  const first = text.charAt(0);
  const rest = text.slice(1);

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden"
      style={{
        background: "#FFFDF5",
        // Subtle paper grain
        backgroundImage: [
          "radial-gradient(ellipse at 20% 80%, rgba(255,220,100,0.06) 0%, transparent 60%)",
          "radial-gradient(ellipse at 80% 20%, rgba(255,180,60,0.04) 0%, transparent 50%)",
        ].join(", "),
      }}
    >
      {/* Spine shadow on left edge */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8" style={{
        background: "linear-gradient(to right, rgba(0,0,0,0.12) 0%, transparent 100%)",
      }} />

      {/* Decorative top border line */}
      <div className="mx-8 mt-7 h-[1.5px] shrink-0 rounded-full bg-gradient-to-r from-transparent via-[#E39B1F]/40 to-transparent" />

      {/* Story text — centred, large, round */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 py-4">
        {/* Small star ornament */}
        <div className="mb-5 flex items-center gap-2">
          <div className="h-px w-8 bg-[#E39B1F]/30" />
          <span className="text-base text-[#E39B1F]/60">✦</span>
          <div className="h-px w-8 bg-[#E39B1F]/30" />
        </div>

        <p
          className="text-center leading-[1.85] tracking-[0.01em] text-[#2c1f0e]"
          style={{
            fontFamily: "var(--font-story), var(--font-brand), Georgia, serif",
            fontSize: "clamp(15px, 3.2vw, 19px)",
          }}
        >
          {/* Drop cap */}
          <span
            className="float-left mr-2 mt-1 leading-none text-[#C47B10]"
            style={{
              fontFamily: "var(--font-display), Georgia, serif",
              fontSize: "clamp(44px, 9vw, 60px)",
              lineHeight: 0.85,
            }}
          >
            {first}
          </span>
          {rest}
        </p>
      </div>

      {/* Decorative bottom border line */}
      <div className="mx-8 mb-2 h-[1.5px] shrink-0 rounded-full bg-gradient-to-r from-transparent via-[#E39B1F]/40 to-transparent" />

      {/* Page number at foot */}
      <div className="shrink-0 pb-3 text-center">
        <span className="text-[9px] font-semibold uppercase tracking-[0.25em] text-[#C47B10]/50">
          — {pageNum} —
        </span>
      </div>
    </div>
  );
}

/* ─── Waves Icon (animated while speaking) ─── */

function WavesIcon() {
  return (
    <span className="flex items-center gap-[2px]" aria-label="Speaking">
      <span className="h-2 w-[3px] animate-pulse rounded-full bg-[#E39B1F]" style={{ animationDelay: "0ms" }} />
      <span className="h-3 w-[3px] animate-pulse rounded-full bg-[#E39B1F]" style={{ animationDelay: "150ms" }} />
      <span className="h-4 w-[3px] animate-pulse rounded-full bg-[#E39B1F]" style={{ animationDelay: "300ms" }} />
      <span className="h-3 w-[3px] animate-pulse rounded-full bg-[#E39B1F]" style={{ animationDelay: "150ms" }} />
      <span className="h-2 w-[3px] animate-pulse rounded-full bg-[#E39B1F]" style={{ animationDelay: "0ms" }} />
    </span>
  );
}

/* ─── Fake Barcode Component ─── */

function FakeBarcode({ title }: { title: string }) {
  const seed = title.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const getBars = () => {
    let currentX = 5;
    const bars: React.ReactNode[] = [];
    const widths = [1, 2, 3];
    const gaps = [1, 2];

    for (let i = 0; i < 15; i++) {
      const idx = (seed + i) % widths.length;
      const gapIdx = (seed * i) % gaps.length;
      const w = widths[idx];
      const gap = gaps[gapIdx];

      bars.push(
        <rect key={i} x={currentX} y={2} width={w} height={22} fill="black" />
      );
      currentX += w + gap;
    }

    return { bars, totalWidth: currentX + 5 };
  };

  const { bars, totalWidth } = getBars();

  return (
    <svg width={totalWidth} height={36} className="bg-white p-1 rounded inline-block">
      {bars}
      <text x={totalWidth / 2} y={32} fontFamily="Helvetica, Arial, sans-serif" fontSize="5" textAnchor="middle" fill="black">
        ISBN 978-3-16-148410-0
      </text>
    </svg>
  );
}

/* ─── Back Cover Page ─── */

function BackCoverPage({ title, backCoverBlurb }: { title: string; backCoverBlurb?: string }) {
  const blurb = backCoverBlurb || "Follow our characters on a magical, heartwarming journey!";

  return (
    <div className="flex h-full flex-col justify-between bg-gradient-to-br from-[#180f29] to-[#0d0520] p-8 text-center text-white select-none">
      {/* Spacer to align center content */}
      <div />

      {/* Main Content */}
      <div className="flex flex-col items-center gap-4 my-auto">
        {/* Glowing Firefly Icon */}
        <div className="relative flex items-center justify-center w-16 h-16 mb-2">
          {/* Pulsing outer glow */}
          <div className="absolute inset-0 bg-[#ffd700] opacity-15 rounded-full blur-xl animate-pulse" />
          <div className="absolute w-12 h-12 bg-[#ffd700] opacity-35 rounded-full blur-md" />

          <svg width="40" height="40" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="relative z-10">
            <circle cx="12" cy="12" r="2.5" fill="#ffeb3b" />
            <ellipse cx="8" cy="11" rx="4" ry="1.5" fill="none" stroke="#ffffff" strokeWidth="0.5" transform="rotate(-30 8 11)" />
            <ellipse cx="16" cy="11" rx="4" ry="1.5" fill="none" stroke="#ffffff" strokeWidth="0.5" transform="rotate(30 16 11)" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="font-display text-lg font-bold tracking-tight leading-tight px-4">
          &ldquo;{title}&rdquo;
        </h1>

        {/* Blurb/Summary */}
        <p className="text-xs text-white/70 italic leading-relaxed max-w-[280px] font-[var(--font-body)]">
          {blurb}
        </p>

        {/* The End */}
        <p className="mt-2 text-sm font-bold tracking-widest text-[#E39B1F] uppercase">
          THE END
        </p>
      </div>

      {/* Footer (Publisher + Barcode) */}
      <div className="w-full">
        <hr className="border-white/10 mb-4" />
        <div className="flex items-center justify-between text-[10px] text-white/50 px-2">
          <span className="text-left font-medium">Published by Playbook AI</span>
          <div className="flex items-center gap-2">
            <FakeBarcode title={title} />
          </div>
        </div>
      </div>
    </div>
  );
}
