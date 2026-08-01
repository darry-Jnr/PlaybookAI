"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#FFFDF9]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-12 top-40 h-7 w-7 rotate-12 border-[3px] border-[#F4A621]" />
        <div className="absolute right-52 top-52 text-2xl text-[#F4A621]">
          ✦
        </div>
        <div className="absolute left-1/3 bottom-40 h-5 w-5 rotate-45 border-[3px] border-[#6C63FF]" />
        <div className="absolute right-20 bottom-52 text-xl text-[#6C63FF]">
          ✧
        </div>
      </div>

      <div className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-8 text-center">
        <div className="flex flex-col items-center max-w-4xl">
          <h1 className="font-display text-[64px] leading-[0.95] tracking-[-2px] text-[#242424] md:text-[80px]">
            Every Child
            Deserves
            Their Own
            <span className="block text-[#E39B1F]">
              Adventure.
            </span>
          </h1>

          <p className="mt-8 max-w-2xl text-lg leading-8 text-[#666]">
            Turn one simple idea into a beautifully illustrated storybook.
            Playbook writes, illustrates, and narrates magical adventures
            where your child becomes the hero.
          </p>

          <div className="mt-12 flex items-center justify-center gap-5">
            <Link href="/create">
              <Button>
                Create Story
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="ghost">Learn More</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
