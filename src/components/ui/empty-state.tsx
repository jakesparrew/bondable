import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * EmptyState — the shared empty / zero-data primitive for Bondable.
 *
 * A centered column: a continuous-line "bond" motif (~120px) on top, a serif
 * title (font-display / text-display-md — the single Fraunces level for this
 * view), an optional muted body line, and an optional single primary action.
 *
 * Renders directly on the canvas (no card chrome) by default; pass `bordered`
 * to wrap it in the standard rounded-card keyline surface. Never uses an emoji
 * or a gray icon-in-a-circle — the motif carries the visual.
 *
 * Pure presentational primitive with no external data deps.
 *
 * @example
 * <EmptyState
 *   motif={<LineMeet />}
 *   title="Nog geen matches"
 *   description="Zodra An Verhaeghe je aanvraag bekijkt, verschijnt je match hier."
 *   action={<Button>Vind een begeleider</Button>}
 * />
 */
export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** A continuous-line illustration component (e.g. <LineMeet />). */
  motif?: React.ReactNode;
  /** Rendered as the serif display heading. */
  title: string;
  /** Optional supporting line, muted and width-capped for readability. */
  description?: string;
  /** Single primary action slot (typically one <Button />). */
  action?: React.ReactNode;
  /** Wrap the state in the standard card keyline surface. */
  bordered?: boolean;
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    { motif, title, description, action, bordered = false, className, ...props },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-12",
        bordered && "rounded-card border bg-card",
        className,
      )}
      {...props}
    >
      {motif ? (
        <div className="mb-6 flex items-center justify-center">{motif}</div>
      ) : null}
      <h3 className="font-display text-display-md text-foreground">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-sm text-body-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  ),
);
EmptyState.displayName = "EmptyState";

export { EmptyState };
export default EmptyState;
