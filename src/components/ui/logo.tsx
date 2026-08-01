import Link from "next/link";

interface LogoProps {
  showTagline?: boolean;
}

export function Logo({ showTagline = false }: LogoProps) {
  return (
    <Link href="/" className="flex items-center gap-3">
      <div>
        <span className="font-brand text-3xl font-medium tracking-tight">
          <span className="text-[#E39B1F]">Play</span>
          <span className="text-[#242424]">book</span>
        </span>
        {showTagline && (
          <p className="text-xs font-semibold text-[#C77D19]">
            AI Storybooks for Kids
          </p>
        )}
      </div>
    </Link>
  );
}
