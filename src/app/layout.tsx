import type { Metadata } from "next";
import { Fredoka, Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Fredoka — round, bubbly, perfect for a kids' brand AND story text
const fredoka = Fredoka({
  variable: "--font-brand",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Playbook — AI Storybooks for Kids",
  description:
    "One sentence → a beautiful illustrated storybook with PDF, ePub, and 3D flipbook. AI-powered children's stories for ages 3-8.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fredoka.variable} ${outfit.variable} ${jakarta.variable}`}
    >
      {/*
        --font-story is aliased to the already-loaded Fredoka via CSS.
        This avoids a second Google Fonts network request.
      */}
      <body className="font-body antialiased bg-[#FFFDF9] text-text-primary">
        {children}
      </body>
    </html>
  );
}
