import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronRight,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTherapistClients } from "@/hooks/api/useOptimizedTherapists";
import type { Client } from "@/types/client";

type StatusTone = "stabilizing" | "action" | "maintenance" | "intake";

interface DerivedStatus {
  tone: StatusTone;
  labelKey: string;
  badgeClass: string;
  trendIcon: LucideIcon;
  trendClass: string;
}

/**
 * Maps a real client's relationship status to the design's clinical-status
 * badge + outcome-trend pairing. "Active" clients are treated as stabilizing,
 * "Pending" clients as post-intake, and anything else as action-required.
 */
const deriveStatus = (client: Client): DerivedStatus => {
  switch (client.status) {
    case "Active":
      return {
        tone: "stabilizing",
        labelKey: "status_stabilizing",
        badgeClass: "border-mint/30 bg-mint/15 text-mint",
        trendIcon: TrendingUp,
        trendClass: "text-mint",
      };
    case "Pending":
      return {
        tone: "intake",
        labelKey: "status_post_intake",
        badgeClass: "border-border bg-muted text-muted-foreground",
        trendIcon: Minus,
        trendClass: "text-muted-foreground",
      };
    case "Inactive":
      return {
        tone: "maintenance",
        labelKey: "status_maintenance",
        badgeClass: "border-border bg-secondary text-secondary-foreground",
        trendIcon: TrendingDown,
        trendClass: "text-muted-foreground",
      };
    default:
      return {
        tone: "action",
        labelKey: "status_action_required",
        badgeClass: "border-destructive/30 bg-destructive/15 text-destructive",
        trendIcon: AlertCircle,
        trendClass: "text-destructive",
      };
  }
};

const initials = (client: Client) => {
  const first = client.firstName?.[0] ?? client.name?.[0] ?? "";
  const last = client.lastName?.[0] ?? "";
  return `${first}${last}`.toUpperCase() || "?";
};

/**
 * "Active Clients & Tasks" panel — clinical queue driven by useTherapistClients.
 */
const ActiveClientsTable = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: clients = [], isLoading } = useTherapistClients();
  const [onlyUrgent, setOnlyUrgent] = useState(false);

  const rows = useMemo(() => {
    const mapped = clients.map((client) => ({ client, status: deriveStatus(client) }));
    return onlyUrgent ? mapped.filter((r) => r.status.tone === "action") : mapped;
  }, [clients, onlyUrgent]);

  return (
    <Card className="overflow-hidden rounded-3xl border-border shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-6 py-5">
        <div>
          <h2 className="text-sm font-bold text-foreground">{t("active_clients_tasks")}</h2>
          <p className="text-[11px] text-muted-foreground">{t("manage_clinical_queue")}</p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={onlyUrgent ? "ghost" : "secondary"}
            className="h-auto rounded-lg px-3 py-1.5 text-[11px] font-bold"
            onClick={() => setOnlyUrgent(false)}
            aria-pressed={!onlyUrgent}
          >
            {t("filter_all")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={onlyUrgent ? "secondary" : "ghost"}
            className="h-auto rounded-lg px-3 py-1.5 text-[11px] font-bold"
            onClick={() => setOnlyUrgent(true)}
            aria-pressed={onlyUrgent}
          >
            {t("filter_urgent")}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("th_client")}
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("th_status")}
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("th_last_session")}
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("th_outcome")}
              </TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("th_actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  {t("loading")}
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  <Users className="mx-auto mb-2 h-6 w-6 opacity-50" aria-hidden="true" />
                  {t("no_active_clients")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map(({ client, status }) => {
                const TrendIcon = status.trendIcon;
                return (
                  <TableRow
                    key={client.id}
                    className="cursor-pointer border-border"
                    onClick={() =>
                      navigate(`/dashboard/therapist/clients/${client.id}/client-profile`)
                    }
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {client.image ? <AvatarImage src={client.image} alt="" /> : null}
                          <AvatarFallback className="bg-secondary text-[10px] font-semibold text-primary">
                            {initials(client)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-foreground">{client.name}</p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {t(`client_status_${client.status.toLowerCase()}`, client.status)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${status.badgeClass}`}
                      >
                        {t(status.labelKey)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">
                      {client.lastSession && client.lastSession !== "N/A"
                        ? client.lastSession
                        : t("no_sessions_yet")}
                    </TableCell>
                    <TableCell>
                      <TrendIcon className={`h-4 w-4 ${status.trendClass}`} aria-hidden="true" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        aria-label={t("client_actions", { name: client.name })}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dashboard/therapist/clients/${client.id}/client-profile`);
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-center border-t border-border p-4">
        <Button
          type="button"
          variant="link"
          className="h-auto gap-1 p-0 text-[11px] font-bold text-primary"
          onClick={() => navigate("/dashboard/therapist/clients")}
        >
          {t("view_full_client_list")}
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
    </Card>
  );
};

export default ActiveClientsTable;
