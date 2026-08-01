"use client";

import { forwardRef } from "react";

type Variant = "primary" | "ghost";
type Size = "sm" | "md";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const btn: Record<Variant, Record<Size, string>> = {
  primary: {
    sm: "inline-flex items-center gap-2 rounded-full bg-[#E39B1F] px-6 py-3 text-[15px] text-white font-semibold transition hover:bg-[#D88C0C] hover:scale-105",
    md: "inline-flex items-center gap-2 rounded-full bg-[#E39B1F] px-8 py-4 text-white font-semibold transition hover:bg-[#D88C0C] hover:scale-105",
  },
  ghost: {
    sm: "inline-flex items-center gap-2 text-[#555] font-semibold transition hover:text-black",
    md: "inline-flex items-center gap-2 text-[#555] font-semibold transition hover:text-black",
  },
};

/** Raw class string so the same style can be used on <a> tags. */
export function buttonClass(variant: Variant = "primary", size: Size = "md") {
  return btn[variant][size];
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", ...props }, ref) => (
    <button ref={ref} className={`${btn[variant][size]} ${className}`} {...props} />
  ),
);
Button.displayName = "Button";
