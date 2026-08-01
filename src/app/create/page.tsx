"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { ResizableDivider } from "@/components/ui/resizable-divider";
import { ChatPanel } from "@/components/create/chat-panel";
import { PreviewPanel } from "@/components/create/preview-panel";
import { useResizable } from "@/hooks/use-resizable";
import { fetchGeneration, generateStream, planStorybook } from "@/lib/api";
import type { BookSpec } from "@/lib/types";

function CreatePageInner() {
  const [prompt, setPrompt] = useState("A firefly who learns to shine from within");
  const [submitted, setSubmitted] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [book, setBook] = useState<BookSpec | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { ratio, onMouseDown } = useResizable({ initialRatio: 50, minRatio: 30, maxRatio: 70 });
  const searchParams = useSearchParams();

  useEffect(() => {
    const genId = searchParams.get("id");
    if (genId) {
      fetchGeneration(genId).then((data) => {
        if (data.spec) {
          setPrompt(data.prompt);
          setBook(data.spec);
          if (data.assets) setAssetUrls(data.assets);
          setMessages([
            { role: "user", text: data.prompt },
            { role: "playbook", text: `"${data.title}" — ${data.spec.pages.length} pages` },
          ]);
          setSubmitted(true);
        }
      }).catch(() => {});
      return;
    }
    const restore = sessionStorage.getItem("restore_session");
    if (restore) {
      const data = JSON.parse(restore);
      setPrompt(data.prompt);
      setMessages(data.messages);
      if (data.assets) setAssetUrls(data.assets);
      setSubmitted(true);
      sessionStorage.removeItem("restore_session");
    }
  }, [searchParams]);

  const [stageProgress, setStageProgress] = useState<string>("");
  const [assetUrls, setAssetUrls] = useState<Record<string, { url: string }>>({});

  const handleSubmit = async () => {
    if (!prompt.trim() || prompt.trim().length < 4) return;
    setMessages((prev) => [...prev, { role: "user", text: prompt }]);
    setSubmitted(true);
    setGenerating(true);
    setError(null);
    setStageProgress("Planning your story...");
    setAssetUrls({});
    try {
      // 1. Plan story and obtain generation_id
      const planRes = await planStorybook(prompt);
      if (planRes.generation_id) setGenerationId(planRes.generation_id);
      setBook(planRes.spec);
      setMessages((prev) => [
        ...prev,
        { role: "playbook", text: `"${planRes.spec.title}" — ${planRes.spec.pages.length} pages` },
      ]);

      // 2. Stream generation with planned spec and generation_id
      for await (const ev of generateStream(prompt, planRes.spec, planRes.generation_id)) {
        if (ev.kind === "stage.start") {
          setStageProgress(`Stage ${ev.stage}...`);
        } else if (ev.kind === "step.started") {
          setStageProgress(`${ev.stage} — ${ev.provider} generating...`);
        } else if (ev.kind === "step.completed") {
          setStageProgress(`${ev.stage} — step done (${ev.elapsed_sec.toFixed(1)}s)`);
          if (ev.assets?.length) {
            if (ev.stage === "B0.cover") {
              setAssetUrls((prev) => ({ ...prev, cover: ev.assets![0] }));
            } else if (ev.stage === "B1.illustrations") {
              setAssetUrls((prev) => ({ ...prev, [`page_${ev.step_index}`]: ev.assets![0] }));
            }
          }
        } else if (ev.kind === "compose.complete") {
          setAssetUrls(ev.assets);
          if (ev.spec) setBook(ev.spec);
          setGenerating(false);
          setStageProgress("");
          setMessages((prev) => [
            ...prev,
            { role: "playbook", text: `"${ev.title}" — ready!` },
          ]);
        } else if (ev.kind === "error") {
          setError(ev.message);
          setGenerating(false);
          setStageProgress("");
          break;
        } else if (ev.kind === "notice") {
          setStageProgress(ev.message);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setGenerating(false);
      setStageProgress("");
    }
  };

  if (expanded) {
    return (
      <div className="h-screen bg-[#FFFDF9]">
        <PreviewPanel generating={generating} expanded onCollapse={() => setExpanded(false)} book={book} assetUrls={assetUrls} stageProgress={stageProgress} generationId={generationId} />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#FFFDF9]">
      <header className="shrink-0 border-b border-[#E6D8C7]/60 bg-[#FFF8F2]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-8">
          <Logo />
          <nav className="flex items-center gap-6">
            <a href="/history" className="text-sm font-medium text-[#666] transition hover:text-[#E39B1F]">
              History
            </a>
          </nav>
        </div>
      </header>

      <div className={`flex flex-1 overflow-hidden ${submitted ? "" : "justify-center"}`}>
        <div
          className="flex shrink-0 flex-col overflow-hidden"
          style={{ width: submitted ? `${ratio}%` : "100%", maxWidth: submitted ? undefined : "48rem" }}
        >
          <ChatPanel
            prompt={prompt}
            submitted={submitted}
            generating={generating}
            messages={messages}
            error={error}
            onPromptChange={setPrompt}
            onSubmit={handleSubmit}
          />
        </div>

        {submitted && <ResizableDivider onMouseDown={onMouseDown} />}

        <div
          className={`overflow-hidden transition-all duration-500 ease-in-out ${
            submitted ? "flex-1 opacity-100" : "w-0 opacity-0"
          }`}
        >
          {submitted && (
            <PreviewPanel
              generating={generating}
              onExpand={() => setExpanded(true)}
              book={book}
              assetUrls={assetUrls}
              stageProgress={stageProgress}
              generationId={generationId}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-[#999]">Loading...</div>}>
      <CreatePageInner />
    </Suspense>
  );
}
