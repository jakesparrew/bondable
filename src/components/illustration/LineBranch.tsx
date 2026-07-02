import { cn } from "@/lib/utils";

/**
 * LineBranch — one continuous stroke that rises from a single root and forks
 * into two soft limbs near the top. The motif for practice / team surfaces
 * (one practice, several people growing from it).
 *
 * Single-weight (1.5px) `stroke-current` line at text-primary/40. Draws itself
 * in on mount; the keyframe ends fully drawn so prefers-reduced-motion leaves
 * the line complete (offset 0).
 *
 * Pure presentational primitive — no data deps. Pass `className` to size/tint.
 */
export default function LineBranch({ className }: { className?: string }) {
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
        @keyframes line-branch-draw { to { stroke-dashoffset: 0; } }
        .line-branch-path {
          stroke-dasharray: ${len};
          stroke-dashoffset: ${len};
          animation: line-branch-draw 600ms var(--ease-out) forwards;
        }
      `}</style>
      <path
        className="line-branch-path"
        d="M60 106 L 60 66 C 60 50, 48 42, 32 34 C 24 30, 20 24, 20 16 M60 66 C 60 50, 72 42, 88 34 C 96 30, 100 24, 100 16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
