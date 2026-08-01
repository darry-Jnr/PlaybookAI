import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  role: string;
  text: string;
}

interface ChatPanelProps {
  prompt: string;
  submitted: boolean;
  generating: boolean;
  messages: Message[];
  error?: string | null;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
}

export function ChatPanel({
  prompt,
  submitted,
  generating,
  messages,
  error,
  onPromptChange,
  onSubmit,
}: ChatPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-6 py-8">
        {!submitted && (
          <div className="flex min-h-full flex-col items-center justify-center text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#FFF3DE] px-5 py-2 text-sm font-semibold text-[#C77D19]">
              <Sparkles className="h-4 w-4" />
              AI-Powered Storybook Creator
            </div>
            <h1 className="mt-8 font-display text-5xl leading-[1.1] tracking-[-1px] text-[#242424]">
              What story should we tell today?
            </h1>
            <p className="mt-4 text-lg text-[#666]">
              Describe your idea — we&apos;ll turn it into a beautifully illustrated, narrated storybook.
            </p>
          </div>
        )}

        {submitted && (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className="text-right">
                <p className="text-sm font-semibold text-[#E39B1F]">You</p>
                <p className="mt-1 text-[#242424]">{msg.text}</p>
              </div>
            ))}
            {!generating && (
              <div>
                <p className="text-sm font-semibold text-[#999]">Playbook</p>
                <p className="mt-1 text-[#666]">
                  Here&apos;s the story plan for &ldquo;{messages[0]?.text}&rdquo;.
                </p>
              </div>
            )}
            {generating && (
              <div>
                <p className="text-sm font-semibold text-[#999]">Playbook</p>
                <p className="mt-1 text-[#666]">
                  Creating your storybook...
                </p>
              </div>
            )}
            {error && (
              <div>
                <p className="text-sm font-semibold text-red-500">Error</p>
                <p className="mt-1 text-red-500">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-[#E6D8C7]/60 bg-white px-6 py-4">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
              }
            }}
            placeholder="Describe your story idea..."
            rows={2}
            className="w-full resize-none rounded-2xl border border-[#E6D8C7] bg-[#FFFDF9] p-4 pb-14 text-lg text-[#242424] placeholder:text-[#bbb] focus:border-[#E39B1F] focus:outline-none shadow-sm"
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <div className="relative h-4 w-4">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 18 18">
                <circle cx="9" cy="9" r="7" fill="none" stroke="#E6D8C7" strokeWidth="2" />
                <circle
                  cx="9" cy="9" r="7" fill="none" stroke="#E39B1F" strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 7}
                  strokeDashoffset={2 * Math.PI * 7 * (1 - prompt.length / 2000)}
                />
              </svg>
            </div>
            <Button
              onClick={onSubmit}
              disabled={prompt.trim().length < 4}
              size="sm"
            >
              Submit
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
