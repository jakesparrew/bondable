import { cn } from "@/lib/utils";

/**
 * LineWave — one continuous, low-amplitude sine that breathes across the frame:
 * the calm motif for Bond surfaces. This is the ONE illustration allowed to use
 * mint (AI-only) — it defaults to text-mint so it reads as the AI companion's
 * quiet presence. Override via className for a neutral variant if ever reused.
 *
 * Single-weight (1.5px) `stroke-current` line. Draws itself in on mount; the
 * keyframe ends fully drawn so prefers-reduced-motion leaves it complete.
 *
 * Pure presentational primitive — no data deps. Pass `className` to size/tint.
 */
export default function LineWave({ className }: { className?: string }) {
  const len = 300;
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      role="presentation"
      aria-hidden="true"
      className={cn("h-[120px] w-[120px] text-mint", className)}
    >
      <style>{`
        @keyframes line-wave-draw { to { stroke-dashoffset: 0; } }
        .line-wave-path {
          stroke-dasharray: ${len};
          stroke-dashoffset: ${len};
          animation: line-wave-draw 600ms var(--ease-out) forwards;
        }
      `}</style>
      <path
        className="line-wave-path"
        d="M10 60 C 22 30, 34 30, 46 60 C 58 90, 70 90, 82 60 C 94 30, 104 34, 110 52"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
