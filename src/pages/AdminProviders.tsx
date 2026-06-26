import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BadgeCheck,
  HeartHandshake,
  MapPin,
  PauseCircle,
  Search,
  Star,
  Stethoscope,
  Users,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminService, type AdminProvider } from "@/services/api/adminService";

type FilterKind = "all" | "regulated" | "coach";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Regulated vs coach is a TRANSPARENCY signal (dichotomieverbod), never a
 * ranking. We surface it as a neutral badge, not a sorting key.
 */
const KindBadge = ({ regulated }: { regulated: boolean }) => {
  const { t } = useTranslation();
  return regulated ? (
    <Badge variant="secondary" className="gap-1">
      <Stethoscope className="h-3 w-3" aria-hidden="true" />
      {t("admin_provider_regulated", "Erkende hulpverlener")}
    </Badge>
  ) : (
    <Badge variant="outline" className="gap-1">
      <HeartHandshake className="h-3 w-3" aria-hidden="true" />
      {t("admin_provider_coach", "Coach")}
    </Badge>
  );
};

const RatingPill = ({ rating }: { rating: number | null }) => {
  const { t } = useTranslation();
  if (rating == null)
    return (
      <span className="text-xs text-muted-foreground">
        {t("admin_provider_no_rating", "Nog geen beoordeling")}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
      <Star className="h-3.5 w-3.5 fill-primary text-primary" aria-hidden="true" />
      {rating.toFixed(1)}
    </span>
  );
};

const ProviderCard = ({
  provider,
  onView,
}: {
  provider: AdminProvider;
  onView: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-11 w-11">
            <AvatarFallback className="bg-secondary text-sm text-primary">
              {initials(provider.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">{provider.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{provider.headline}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <KindBadge regulated={provider.isRegulated} />
          {provider.acceptingNewClients ? (
            <Badge variant="outline" className="text-[10px]">
              {t("admin_provider_accepting", "Neemt cliënten aan")}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              {t("admin_provider_full", "Wachtlijst")}
            </Badge>
          )}
        </div>

        {provider.city && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {provider.city}
          </div>
        )}

        {provider.specializations.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {provider.specializations.slice(0, 3).map((s) => (
              <span
                key={s}
                className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        <Separator className="mt-auto" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {provider.clientsCount}
            </span>
            <span>
              {provider.leadsCount} {t("admin_provider_leads", "leads")}
            </span>
            <RatingPill rating={provider.rating} />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onView}>
            {t("admin_provider_view", "Bekijk")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const AdminProviders = () => {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [filter, setFilter] = useState<FilterKind>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminProvider | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    adminService
      .listProviders()
      .then((rows) => {
        if (!alive) return;
        setProviders(rows);
        setLoading(false);
      })
      .catch(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return providers.filter((p) => {
      if (filter === "regulated" && !p.isRegulated) return false;
      if (filter === "coach" && p.isRegulated) return false;
      if (q) {
        const haystack = [p.fullName, p.headline, p.city, ...p.specializations]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [providers, filter, search]);

  const tabs: { key: FilterKind; label: string }[] = [
    { key: "all", label: t("admin_provider_tab_all", "Alle") },
    { key: "regulated", label: t("admin_provider_tab_regulated", "Erkende hulpverleners") },
    { key: "coach", label: t("admin_provider_tab_coach", "Coaches") },
  ];

  return (
    <DashboardLayout userType="admin">
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            {t("admin_providers_title", "Coaches & hulpverleners")}
          </h1>
          <p className="text-xs text-muted-foreground">
            {t(
              "admin_providers_subtitle",
              "Beheer alle coaches en erkende hulpverleners. Het onderscheid erkend/coach is een transparantiesignaal voor cliënten — geen rangschikking.",
            )}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex flex-wrap rounded-lg border border-border bg-card p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filter === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative max-w-sm sm:w-64">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("admin_providers_search", "Zoek op naam, stad of specialisatie…")}
              className="pl-8"
            />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-52 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <HeartHandshake className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                {t("admin_providers_empty", "Geen hulpverleners gevonden.")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => (
              <ProviderCard key={p.id} provider={p} onView={() => setSelected(p)} />
            ))}
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-11 w-11">
                    <AvatarFallback className="bg-secondary text-primary">
                      {initials(selected.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-foreground">
                      {selected.fullName}
                    </p>
                    <p className="truncate text-xs font-normal text-muted-foreground">
                      {selected.headline}
                    </p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-1.5">
                  <KindBadge regulated={selected.isRegulated} />
                  {selected.acceptingNewClients ? (
                    <Badge variant="outline">
                      {t("admin_provider_accepting", "Neemt cliënten aan")}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      {t("admin_provider_full", "Wachtlijst")}
                    </Badge>
                  )}
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t("admin_provider_detail_city", "Stad")}
                  </span>
                  <span className="font-medium text-foreground">{selected.city || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t("admin_provider_detail_clients", "Cliënten")}
                  </span>
                  <span className="font-medium text-foreground">{selected.clientsCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t("admin_provider_detail_leads", "Leads")}
                  </span>
                  <span className="font-medium text-foreground">{selected.leadsCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t("admin_provider_detail_rating", "Beoordeling")}
                  </span>
                  <RatingPill rating={selected.rating} />
                </div>
                {selected.specializations.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-muted-foreground">
                      {t("admin_provider_detail_specs", "Specialisaties")}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {selected.specializations.map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Separator />
              <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                <Button type="button" variant="outline" className="flex-1 gap-1.5">
                  <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                  {t("admin_provider_action_verify", "Verifiëren")}
                </Button>
                <Button type="button" variant="outline" className="flex-1 gap-1.5">
                  <PauseCircle className="h-4 w-4" aria-hidden="true" />
                  {t("admin_provider_action_pause", "Publicatie pauzeren")}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminProviders;
