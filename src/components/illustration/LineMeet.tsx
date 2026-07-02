import { cn } from "@/lib/utils";

/**
 * LineMeet — two continuous strokes that curve toward each other and gently
 * converge, forming a soft knot where they touch. The motif for matching /
 * finder surfaces (two people, or a client and a provider, finding each other).
 *
 * Single-weight (1.5px) `stroke-current` line at text-primary/40. Draws itself
 * in on mount via stroke-dashoffset; the keyframe ends fully drawn so the global
 * prefers-reduced-motion kill-switch leaves the line complete (offset 0).
 *
 * Pure presentational primitive — no data deps. Pass `className` to size/tint.
 */
export default function LineMeet({ className }: { className?: string }) {
  // Path length is approximate; overshooting the dash length only affects the
  // very first frame, so a generous constant keeps the reveal clean.
  const len = 320;
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      role="presentation"
      aria-hidden="true"
      className={cn("h-[120px] w-[120px] text-primary/40", className)}
    >
      <style>{`
        @keyframes line-meet-draw { to { stroke-dashoffset: 0; } }
        .line-meet-path {
          stroke-dasharray: ${len};
          stroke-dashoffset: ${len};
          animation: line-meet-draw 600ms var(--ease-out) forwards;
        }
      `}</style>
      <path
        className="line-meet-path"
        d="M14 30 C 34 32, 44 50, 60 60 C 76 70, 86 88, 106 90 M106 30 C 86 32, 76 50, 60 60 C 44 70, 34 88, 14 90"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
