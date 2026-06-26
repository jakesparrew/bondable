import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  CalendarClock,
  MessageSquare,
  Search,
  UserMinus,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminService, type AdminClient, type AdminStats } from "@/services/api/adminService";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(iso: string, locale?: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale || undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

const StatusBadge = ({ status }: { status: AdminClient["status"] }) => {
  const { t } = useTranslation();
  if (status === "active")
    return <Badge variant="secondary">{t("admin_client_status_active", "Actief")}</Badge>;
  if (status === "invited")
    return <Badge variant="outline">{t("admin_client_status_invited", "Uitgenodigd")}</Badge>;
  return <Badge variant="outline">{t("admin_client_status_inactive", "Inactief")}</Badge>;
};

const Kpi = ({
  icon: Icon,
  label,
  value,
  loading,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  loading: boolean;
  tone?: "default" | "destructive";
}) => (
  <Card>
    <CardContent className="flex items-center gap-3 p-4">
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-full ${
          tone === "destructive"
            ? "bg-destructive/10 text-destructive"
            : "bg-secondary text-primary"
        }`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        {loading ? (
          <Skeleton className="h-6 w-12" />
        ) : (
          <p className="text-xl font-bold text-foreground">{value}</p>
        )}
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </CardContent>
  </Card>
);

const AdminClients = () => {
  const { t, i18n } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminClient | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([adminService.listClients(), adminService.getStats()])
      .then(([rows, s]) => {
        if (!alive) return;
        setClients(rows);
        setStats(s);
        setLoading(false);
      })
      .catch(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.fullName, c.email, c.assignedProviderName ?? ""].join(" ").toLowerCase().includes(q),
    );
  }, [clients, search]);

  return (
    <DashboardLayout userType="admin">
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            {t("admin_clients_title", "Cliënten")}
          </h1>
          <p className="text-xs text-muted-foreground">
            {t(
              "admin_clients_subtitle",
              "Beheer en overzicht van alle cliënten op het platform — status, toegewezen hulpverlener en signalen die aandacht vragen.",
            )}
          </p>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Kpi
            icon={Users}
            label={t("admin_clients_kpi_total", "Totaal cliënten")}
            value={stats?.totalClients ?? "—"}
            loading={loading}
          />
          <Kpi
            icon={CalendarClock}
            label={t("admin_clients_kpi_active_today", "Vandaag actief")}
            value={stats?.activeToday ?? "—"}
            loading={loading}
          />
          <Kpi
            icon={AlertTriangle}
            label={t("admin_clients_kpi_flagged", "Gemarkeerde gesprekken")}
            value={stats?.flaggedConversations ?? "—"}
            loading={loading}
            tone="destructive"
          />
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin_clients_search", "Zoek op naam, e-mail of hulpverlener…")}
            className="pl-8"
          />
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <Users className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">
                  {t("admin_clients_empty", "Geen cliënten gevonden.")}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin_clients_col_name", "Naam")}</TableHead>
                      <TableHead>{t("admin_clients_col_status", "Status")}</TableHead>
                      <TableHead className="hidden md:table-cell">
                        {t("admin_clients_col_provider", "Hulpverlener")}
                      </TableHead>
                      <TableHead className="hidden sm:table-cell">
                        {t("admin_clients_col_sessions", "Sessies")}
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        {t("admin_clients_col_last_active", "Laatst actief")}
                      </TableHead>
                      <TableHead>{t("admin_clients_col_risk", "Risico")}</TableHead>
                      <TableHead className="text-right">
                        {t("admin_clients_col_actions", "Actie")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-secondary text-xs text-primary">
                                {initials(c.fullName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {c.fullName}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={c.status} />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm text-foreground">
                            {c.assignedProviderName ?? (
                              <span className="text-muted-foreground">
                                {t("admin_clients_no_provider", "—")}
                              </span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-sm text-foreground">{c.sessionsCount}</span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {formatDate(c.lastActiveAt, i18n.language)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {c.riskFlag ? (
                            <Badge variant="destructive">
                              {t("admin_clients_risk_yes", "Aandacht")}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelected(c)}
                          >
                            {t("admin_clients_view", "Bekijk")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-secondary text-primary">
                      {initials(selected.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-foreground">
                      {selected.fullName}
                    </p>
                    <p className="truncate text-xs font-normal text-muted-foreground">
                      {selected.email}
                    </p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t("admin_clients_col_status", "Status")}
                  </span>
                  <StatusBadge status={selected.status} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t("admin_clients_col_provider", "Hulpverlener")}
                  </span>
                  <span className="font-medium text-foreground">
                    {selected.assignedProviderName ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t("admin_clients_col_sessions", "Sessies")}
                  </span>
                  <span className="font-medium text-foreground">{selected.sessionsCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t("admin_clients_detail_joined", "Lid sinds")}
                  </span>
                  <span className="font-medium text-foreground">
                    {formatDate(selected.joinedAt, i18n.language)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t("admin_clients_col_last_active", "Laatst actief")}
                  </span>
                  <span className="font-medium text-foreground">
                    {formatDate(selected.lastActiveAt, i18n.language)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t("admin_clients_col_risk", "Risico")}
                  </span>
                  {selected.riskFlag ? (
                    <Badge variant="destructive">
                      {t("admin_clients_risk_yes", "Aandacht")}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </div>

              <Separator />
              <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                <Button type="button" variant="outline" className="flex-1 gap-1.5">
                  <MessageSquare className="h-4 w-4" aria-hidden="true" />
                  {t("admin_clients_action_message", "Bericht sturen")}
                </Button>
                <Button type="button" variant="outline" className="flex-1 gap-1.5">
                  <UserMinus className="h-4 w-4" aria-hidden="true" />
                  {t("admin_clients_action_deactivate", "Deactiveren")}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminClients;
