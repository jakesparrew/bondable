import { cn } from "@/lib/utils";

/**
 * LineLoop — one unbroken stroke that swings out and folds back through itself
 * in a single soft loop, ending near where it began. The motif for journaling /
 * reflection (a thought returning to itself).
 *
 * Single-weight (1.5px) `stroke-current` line at text-primary/40. Draws itself
 * in on mount; the keyframe ends fully drawn so prefers-reduced-motion leaves
 * the line complete (offset 0).
 *
 * Pure presentational primitive — no data deps. Pass `className` to size/tint.
 */
export default function LineLoop({ className }: { className?: string }) {
  const len = 300;
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      role="presentation"
      aria-hidden="true"
      className={cn("h-[120px] w-[120px] text-primary/40", className)}
    >
      <style>{`
        @keyframes line-loop-draw { to { stroke-dashoffset: 0; } }
        .line-loop-path {
          stroke-dasharray: ${len};
          stroke-dashoffset: ${len};
          animation: line-loop-draw 600ms var(--ease-out) forwards;
        }
      `}</style>
      <path
        className="line-loop-path"
        d="M20 84 C 20 40, 48 20, 70 34 C 90 47, 84 78, 60 78 C 40 78, 40 52, 60 48 C 82 44, 98 60, 100 84"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
