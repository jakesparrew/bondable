import { cn } from "@/lib/utils";

/**
 * LineSteps — one continuous stroke that climbs in gentle, rounded steps from
 * lower-left to upper-right. The motif for tasks / progress (steady, humane
 * forward movement — not a spiky performance chart).
 *
 * Single-weight (1.5px) `stroke-current` line at text-primary/40. Draws itself
 * in on mount; the keyframe ends fully drawn so prefers-reduced-motion leaves
 * the line complete (offset 0).
 *
 * Pure presentational primitive — no data deps. Pass `className` to size/tint.
 */
export default function LineSteps({ className }: { className?: string }) {
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
        @keyframes line-steps-draw { to { stroke-dashoffset: 0; } }
        .line-steps-path {
          stroke-dasharray: ${len};
          stroke-dashoffset: ${len};
          animation: line-steps-draw 600ms var(--ease-out) forwards;
        }
      `}</style>
      <path
        className="line-steps-path"
        d="M14 100 L 30 100 C 38 100, 40 96, 40 88 L 40 78 C 40 70, 42 66, 50 66 L 62 66 C 70 66, 72 62, 72 54 L 72 44 C 72 36, 74 32, 82 32 L 106 32"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
