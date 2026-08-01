"use client";

import { CodeXml, Globe, Heart, Sparkles } from "lucide-react";
import { Logo } from "../ui/logo";

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#FFFDF9] border-t border-[#E6D8C7]/60 mt-32 text-[#242424]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-80 h-80 bg-[#FFF3DE]/60 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#E39B1F]/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <Logo showTagline />

          <div className="flex gap-3">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="w-11 h-11 rounded-full bg-white border border-[#E6D8C7] shadow-sm flex items-center justify-center text-[#555] hover:bg-[#E39B1F] hover:text-white hover:border-[#E39B1F] transition"
            >
              <CodeXml className="w-5 h-5" />
            </a>
            <a
              href="#"
              className="w-11 h-11 rounded-full bg-white border border-[#E6D8C7] shadow-sm flex items-center justify-center text-[#555] hover:bg-[#E39B1F] hover:text-white hover:border-[#E39B1F] transition"
            >
              <Globe className="w-5 h-5" />
            </a>
          </div>
        </div>

        <div className="border-t border-[#E6D8C7]/60 mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-5">
          <p className="text-[#666] text-sm flex items-center gap-2">
            Made with
            <Heart className="w-4 h-4 text-[#E39B1F] fill-[#E39B1F]" />
            for dreamers everywhere.
          </p>
          <div className="flex items-center gap-2 text-sm text-[#666]">
            <Sparkles className="w-4 h-4 text-[#C77D19]" />
            &copy; {new Date().getFullYear()} Playbook. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
