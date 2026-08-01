"use client";

import type { ReactNode } from "react";

export function Badge({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-[#FFF3DE] px-5 py-2 text-sm font-semibold text-[#C77D19]">
      {children}
    </div>
  );
}
