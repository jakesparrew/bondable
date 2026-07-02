import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// "Flemish Clinical Warm" badge system — outline-first, semantic soft-surface
// statuses, a teal trust badge for is_regulated, a mint AI badge reserved for
// Bond, and quiet-keyline Pro/Practice chips (never gold, never a lock/crown).
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-ctl border px-2 py-0.5 text-label font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        /* semantic statuses — soft tint surface + on-color text */
        success: "border-transparent bg-success-soft text-success",
        warning: "border-transparent bg-warning-soft text-warning",
        info: "border-transparent bg-info-soft text-info",
        destructive: "border-transparent bg-destructive-soft text-destructive",
        /* trust = brand teal outline (regulated clinician) — never mint/gold */
        trust: "border-primary/40 text-primary bg-transparent",
        /* AI — Bond surfaces ONLY */
        ai: "border-transparent bg-mint-soft text-mint-foreground",
        /* monetization — quiet keyline */
        pro: "border-foreground/25 bg-transparent text-foreground/70 uppercase tracking-[0.08em]",
        practice: "border-foreground/25 bg-transparent text-foreground/70 uppercase tracking-[0.08em]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
