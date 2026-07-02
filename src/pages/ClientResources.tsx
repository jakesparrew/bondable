"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import LineLoop from "@/components/illustration/LineLoop";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { analyticsService } from "@/services/api/analyticsService";
import { ANALYTICS_EVENTS } from "@/config/analyticsEvents";
import {
  resourceService,
  type Resource,
  type ResourceCategory,
} from "@/services/api/resourceService";
import { cn } from "@/lib/utils";

/**
 * ClientResources — the psychoeducation resource library (T-CX-16).
 *
 * A calm, editorial reading surface. Provider-recommended pieces float to the
 * top in an "Aanbevolen door je begeleider" row; below that, category chips
 * filter a border-first card grid. Opening a card slides in a reader with a
 * comfortable reading measure (max-w-prose). Reading anything is free, always.
 *
 * NO health data enters analytics — opening a resource records only the
 * structural fact (feature label + resource id), never content.
 */

/** Filter value: a category, or "alles" for the full library. */
type Filter = ResourceCategory | "alles";

/** The chip order, calm Dutch-first labels. */
const CATEGORY_FILTERS: { value: Filter; labelKey: string; label: string }[] = [
  { value: "alles", labelKey: "resources_cat_all", label: "Alles" },
  { value: "angst", labelKey: "resources_cat_angst", label: "Angst" },
  { value: "stress", labelKey: "resources_cat_stress", label: "Stress" },
  { value: "slaap", labelKey: "resources_cat_slaap", label: "Slaap" },
  { value: "piekeren", labelKey: "resources_cat_piekeren", label: "Piekeren" },
  { value: "zelfzorg", labelKey: "resources_cat_zelfzorg", label: "Zelfzorg" },
  { value: "relaties", labelKey: "resources_cat_relaties", label: "Relaties" },
];

/** Human category labels for the badge on each card. */
const CATEGORY_LABELS: Record<ResourceCategory, { key: string; nl: string }> = {
  angst: { key: "resources_cat_angst", nl: "Angst" },
  stress: { key: "resources_cat_stress", nl: "Stress" },
  slaap: { key: "resources_cat_slaap", nl: "Slaap" },
  piekeren: { key: "resources_cat_piekeren", nl: "Piekeren" },
  zelfzorg: { key: "resources_cat_zelfzorg", nl: "Zelfzorg" },
  relaties: { key: "resources_cat_relaties", nl: "Relaties" },
};

const ClientResources = () => {
  const { t } = useTranslation();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("alles");
  const [active, setActive] = useState<Resource | null>(null);

  useEffect(() => {
    let alive = true;
    resourceService
      .list()
      .then((list) => {
        if (alive) setResources(list);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const assigned = useMemo(
    () => resources.filter((r) => r.assignedByProvider),
    [resources],
  );

  const filtered = useMemo(() => {
    if (filter === "alles") return resources;
    return resources.filter((r) => r.category === filter);
  }, [resources, filter]);

  const openResource = (resource: Resource) => {
    setActive(resource);
    analyticsService.track(ANALYTICS_EVENTS.feature_peek_viewed, {
      feature: `resource:${resource.id}`,
    });
  };

  return (
    <DashboardLayout userType="client">
      <div className="mx-auto w-full max-w-4xl animate-enter">
        {/* Page header */}
        <header className="mb-8">
          <h1 className="font-display text-display-lg text-foreground">
            {t("resources_title", "Bronnen")}
          </h1>
          <p className="mt-2 max-w-prose text-body-sm text-muted-foreground">
            {t(
              "resources_intro",
              "Korte, rustige stukken om tussen je gesprekken door te lezen. Alles is vrij te lezen, zoveel je wil.",
            )}
          </p>
        </header>

        {loading ? (
          <ResourceGridSkeleton />
        ) : (
          <>
            {/* Recommended by your provider */}
            {assigned.length > 0 && (
              <section className="mb-10">
                <h2 className="mb-3 text-label font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  {t("resources_assigned_heading", "Aanbevolen door je begeleider")}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {assigned.map((resource) => (
                    <ResourceCard
                      key={resource.id}
                      resource={resource}
                      onOpen={openResource}
                      t={t}
                      highlight
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Category filter chips */}
            <div
              className="mb-6 flex flex-wrap gap-2"
              role="group"
              aria-label={t("resources_filter_label", "Filter op onderwerp")}
            >
              {CATEGORY_FILTERS.map((chip) => {
                const isActive = filter === chip.value;
                return (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => setFilter(chip.value)}
                    aria-pressed={isActive}
                    className={cn(
                      "rounded-ctl border px-3 py-1.5 text-body-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:border-foreground/30",
                    )}
                  >
                    {t(chip.labelKey, chip.label)}
                  </button>
                );
              })}
            </div>

            {/* Library grid */}
            {filtered.length === 0 ? (
              <EmptyState
                motif={<LineLoop />}
                title={t("resources_empty_title", "Nog niets in dit onderwerp")}
                description={t(
                  "resources_empty_body",
                  "Kies een ander onderwerp, of bekijk alles. De bibliotheek groeit mee.",
                )}
                action={
                  <Button variant="outline" onClick={() => setFilter("alles")}>
                    {t("resources_empty_action", "Bekijk alles")}
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    onOpen={openResource}
                    t={t}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Reader */}
      <Sheet
        open={active !== null}
        onOpenChange={(open) => {
          if (!open) setActive(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-xl"
        >
          {active && (
            <article>
              <SheetHeader className="space-y-3 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {t(
                      CATEGORY_LABELS[active.category].key,
                      CATEGORY_LABELS[active.category].nl,
                    )}
                  </Badge>
                  <span className="text-label text-muted-foreground">
                    {active.readTimeMin}{" "}
                    {t("resources_readtime_min", "min lezen")}
                  </span>
                </div>
                <SheetTitle className="text-2xl font-semibold leading-snug text-foreground">
                  {active.title}
                </SheetTitle>
              </SheetHeader>

              {active.assignedByProvider && active.assignmentNote && (
                <div className="mt-5 rounded-card border border-border bg-muted/40 p-4">
                  <p className="text-label font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    {t("resources_note_from", "Van je begeleider")}
                  </p>
                  <p className="mt-1.5 text-body-sm text-foreground">
                    {active.assignmentNote}
                  </p>
                </div>
              )}

              <div className="mt-6 max-w-prose space-y-4 text-body leading-relaxed text-foreground">
                {active.body.split("\n\n").map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </article>
          )}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
};

/** A single library card — border-first, no rest shadow, hover lift. */
function ResourceCard({
  resource,
  onOpen,
  t,
  highlight = false,
}: {
  resource: Resource;
  onOpen: (r: Resource) => void;
  t: (key: string, fallback: string) => string;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(resource)}
      className={cn(
        "group flex h-full flex-col rounded-card border bg-card p-5 text-left transition-shadow focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 hover:shadow-raise",
        highlight ? "border-primary/40" : "border-border",
      )}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          {t(
            CATEGORY_LABELS[resource.category].key,
            CATEGORY_LABELS[resource.category].nl,
          )}
        </Badge>
        <span className="text-label text-muted-foreground">
          {resource.readTimeMin} {t("resources_readtime_min", "min lezen")}
        </span>
      </div>
      <h3 className="text-base font-semibold leading-snug text-foreground">
        {resource.title}
      </h3>
      <p className="mt-2 line-clamp-2 text-body-sm text-muted-foreground">
        {resource.summary}
      </p>
    </button>
  );
}

/** Neutral loading placeholder matching the grid rhythm. */
function ResourceGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-36 rounded-card border border-border bg-card"
        />
      ))}
    </div>
  );
}

export default ClientResources;
