"use client";

import { useState, useEffect, useCallback } from "react";
import { Logo } from "@/components/ui/logo";

interface LoadingScreenProps {
  visible: boolean;
}

const STAGES = [
  { id: "A", label: "Drafting Story" },
  { id: "B0", label: "Designing Cover" },
  { id: "B1", label: "Painting Pages" },
  { id: "B2", label: "Binding Book" },
  { id: "C", label: "Polishing Magic" },
];

export function LoadingScreen({ visible }: LoadingScreenProps) {
  const [activeStage, setActiveStage] = useState(0);
  const [lastVisible, setLastVisible] = useState(visible);

  if (visible !== lastVisible) {
    setLastVisible(visible);
    if (!visible) setActiveStage(0);
  }

  const advance = useCallback(() => {
    setActiveStage((s) => (s >= STAGES.length - 1 ? s : s + 1));
  }, []);

  useEffect(() => {
    if (!visible) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    STAGES.forEach((_, i) => {
      if (i === 0) return;
      const delay = i * 2200;
      timers.push(
        setTimeout(() => {
          advance();
        }, delay),
      );
    });

    return () => timers.forEach(clearTimeout);
  }, [visible, advance]);

  if (!visible) return null;

  const progressPercent = Math.round(((activeStage + 1) / STAGES.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white transition-opacity duration-300">
      <div className="relative z-10 flex max-w-sm flex-col items-center gap-6 text-center px-4">
        {/* Floating Playbook Branding */}
        <div className="relative flex flex-col items-center animate-bounce [animation-duration:3s]">
          <div className="absolute -top-3 -left-8 h-5 w-5 rotate-12 border-[3px] border-[#F4A621] rounded-sm" />
          <div className="absolute -top-2 -right-6 text-xl text-[#6C63FF] select-none font-bold">✦</div>
          <div className="absolute -bottom-1 -left-7 text-lg text-[#F4A621] select-none font-bold">✧</div>
          <div className="absolute -bottom-2 -right-6 h-4 w-4 rotate-45 border-[3px] border-[#6C63FF] rounded-sm" />

          <Logo />
        </div>

        <div className="space-y-1">
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            Creating Your Storybook
          </h2>
          <p className="text-sm font-semibold text-[#E39B1F]">
            {STAGES[activeStage].label}...
          </p>
        </div>

        <div className="w-full space-y-2">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 border border-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#E39B1F] to-[#F4A621] transition-all duration-500 ease-out shadow-sm"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-right text-[11px] font-bold text-slate-400">
            {progressPercent}%
          </p>
        </div>
      </div>
    </div>
  );
}
