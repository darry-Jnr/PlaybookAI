"use client";

import { Sparkles } from "lucide-react";
import { Logo } from "../ui/logo";
import { buttonClass } from "../ui/button";

export function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-[#FFF8F2]/90 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-8">
        <Logo />

        <a
          href="/create"
          className={buttonClass("primary", "sm")}
        >
          <Sparkles className="h-4 w-4" />
          Create a Book
        </a>
      </div>
    </header>
  );
}
