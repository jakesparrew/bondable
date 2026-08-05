/**
 * PageHeader — the single page-title treatment.
 *
 * Before this existed there were nine different page-title styles across the
 * app (text-2xl font-bold, text-3xl, h1 with the forced serif, etc.). Every
 * dashboard page should render exactly one PageHeader, and it is the ONLY
 * place Fraunces appears on that view.
 *
 * Rules baked in:
 * - title  -> font-display + text-display-lg (the one serif moment per view)
 * - description -> text-body-sm text-muted-foreground
 * - actions -> right aligned, wraps under the title below sm (360px safe)
 * - mb-8 spacing so pages never re-invent their own header rhythm
 */

import * as React from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Page title. Rendered as the h1 — one per view. */
  title: React.ReactNode;
  /** Optional one-line supporting sentence. */
  description?: React.ReactNode;
  /** Right-aligned action slot (buttons, filters). */
  actions?: React.ReactNode;
  /** Optional slot rendered above the title (breadcrumb, back link). */
  eyebrow?: React.ReactNode;
  className?: string;
}

const PageHeader = ({
  title,
  description,
  actions,
  eyebrow,
  className,
}: PageHeaderProps) => {
  return (
    <div className={cn("mb-8", className)}>
      {eyebrow && <div className="mb-3">{eyebrow}</div>}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-display-lg text-foreground">
            {title}
          </h1>
          {description && (
            <div className="mt-2 max-w-2xl text-body-sm text-muted-foreground">
              {description}
            </div>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
