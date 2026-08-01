"use client";

interface ResizableDividerProps {
  onMouseDown: () => void;
}

export function ResizableDivider({ onMouseDown }: ResizableDividerProps) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="group relative flex w-2 shrink-0 cursor-col-resize items-center justify-center hover:bg-[#E39B1F]/10 active:bg-[#E39B1F]/20 transition-colors"
    >
      <div className="h-10 w-1 rounded-full bg-[#E6D8C7] group-hover:bg-[#E39B1F]/50 group-active:bg-[#E39B1F] transition-colors" />
    </div>
  );
}
