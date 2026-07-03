import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, FileArchive, ShieldCheck, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import LineLoop from "@/components/illustration/LineLoop";
import { can, currentAdminRole } from "@/lib/adminAbility";
import {
  opsService,
  OPS_TODAY,
  type GdprRequest,
  type GdprKind,
  type GdprStatus,
} from "@/services/api/opsService";

/**
 * GdprQueue — /dashboard/admin/gdpr (plan 07 §6, ticket T-OC-14).
 *
 * The manual backstop for data-subject requests. Each row carries a type
 * (export / erasure / rectification), a statutory deadline (received + 30d,
 * Art. 12(3)) with a countdown that goes warning as it nears and destructive
 * once overdue, a status, and process actions. Export produces a mock JSON/ZIP
 * bundle (shared conceptually with the client-side "download my data" centre);
 * erasure runs a documented cascade and pseudonymises safety cases for legal
 * defence. Mutations are gated by adminAbility.
 *
 * Countdown uses the demo clock (OPS_TODAY) so the seeded rows show a stable,
 * demonstrable state rather than drifting with the wall clock.
 */

const DEMO_NOW = new Date(`${OPS_TODAY}T09:00:00Z`);

function formatDate(iso: string, locale?: string): string {
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString(locale || undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

const KindBadge = ({ kind }: { kind: GdprKind }) => {
  const { t } = useTranslation();
  if (kind === "erasure")
    return <Badge variant="destructive">{t("gdpr_kind_erasure", "Verwijdering")}</Badge>;
  if (kind === "rectification")
    return <Badge variant="info">{t("gdpr_kind_rectification", "Correctie")}</Badge>;
  return <Badge variant="info">{t("gdpr_kind_export", "Export")}</Badge>;
};

const StatusBadge = ({ status }: { status: GdprStatus }) => {
  const { t } = useTranslation();
  if (status === "delivered")
    return <Badge variant="success">{t("gdpr_status_delivered", "Afgehandeld")}</Badge>;
  if (status === "in_progress")
    return <Badge variant="info">{t("gdpr_status_in_progress", "In behandeling")}</Badge>;
  if (status === "denied")
    return <Badge variant="outline">{t("gdpr_status_denied", "Geweigerd")}</Badge>;
  return <Badge variant="warning">{t("gdpr_status_received", "Ontvangen")}</Badge>;
};

/** Deadline countdown — warning under 7 days, destructive when overdue. */
const DeadlineCell = ({ deadlineAt }: { deadlineAt: string }) => {
  const { t, i18n } = useTranslation();
  const days = opsService.daysToDeadline(deadlineAt, DEMO_NOW);
  const overdue = days < 0;
  const near = days >= 0 && days < 7;
  const tone = overdue ? "text-destructive" : near ? "text-warning" : "text-foreground";
  return (
    <div className="text-right">
      <p className={`text-body-sm font-semibold tabular-nums ${tone}`}>
        {overdue
          ? t("gdpr_overdue", "{{n}} dagen te laat", { n: Math.abs(days) })
          : t("gdpr_days_left", "over {{n}} dagen", { n: days })}
      </p>
      <p className="text-label text-muted-foreground">{formatDate(deadlineAt, i18n.language)}</p>
    </div>
  );
};

const GdprQueue = () => {
  const { t, i18n } = useTranslation();
  const role = currentAdminRole();
  const mayExport = can(role, "gdpr.export");
  const mayErase = can(role, "gdpr.erase");

  const [rows, setRows] = useState<GdprRequest[]>(() => opsService.listGdprRequests());
  const [exportFor, setExportFor] = useState<GdprRequest | null>(null);
  const [eraseFor, setEraseFor] = useState<GdprRequest | null>(null);

  const openCount = useMemo(
    () => rows.filter((r) => r.status === "received" || r.status === "in_progress").length,
    [rows],
  );
  const nearCount = useMemo(
    () =>
      rows.filter(
        (r) =>
          (r.status === "received" || r.status === "in_progress") &&
          opsService.daysToDeadline(r.deadlineAt, DEMO_NOW) < 7,
      ).length,
    [rows],
  );

  const runExport = () => {
    if (!exportFor) return;
    setRows(opsService.setGdprStatus(exportFor.id, "delivered"));
    setExportFor(null);
  };

  const runErasure = () => {
    if (!eraseFor) return;
    setRows(opsService.setGdprStatus(eraseFor.id, "delivered"));
    setEraseFor(null);
  };

  return (
    <DashboardLayout userType="admin">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-display-lg text-foreground">
            {t("gdpr_title", "GDPR-verzoeken")}
          </h1>
          <p className="mt-1 text-body-sm text-muted-foreground">
            {t(
              "gdpr_subtitle",
              "Exports en verwijderingen met een wettelijke deadline van 30 dagen. Dit is de handmatige backstop naast het datacenter van de cliënt.",
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-x-10 gap-y-4 border-y py-4">
          <div>
            <p className="text-2xl font-semibold tabular-nums text-foreground">{openCount}</p>
            <p className="text-label text-muted-foreground">{t("gdpr_open", "Openstaand")}</p>
          </div>
          <div>
            <p
              className={`text-2xl font-semibold tabular-nums ${
                nearCount > 0 ? "text-warning" : "text-foreground"
              }`}
            >
              {nearCount}
            </p>
            <p className="text-label text-muted-foreground">
              {t("gdpr_near", "Deadline binnen 7 dagen")}
            </p>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            motif={<LineLoop />}
            title={t("gdpr_empty_title", "Geen open verzoeken")}
            description={t("gdpr_empty_body", "Nieuwe export- of verwijderverzoeken komen hier binnen.")}
          />
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div
                key={r.id}
                className="rounded-card border bg-card p-4 animate-enter hover:shadow-raise"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-body-sm font-semibold text-foreground">
                        {r.subjectName}
                      </span>
                      <KindBadge kind={r.kind} />
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="mt-1 text-label text-muted-foreground">{r.subjectEmail}</p>
                    {r.notes ? (
                      <p className="mt-1.5 text-body-sm text-muted-foreground">{r.notes}</p>
                    ) : null}
                    <p className="mt-1 text-label text-muted-foreground">
                      {t("gdpr_received", "Ontvangen op {{when}}", {
                        when: formatDate(r.receivedAt, i18n.language),
                      })}
                      {r.handledBy
                        ? ` · ${t("gdpr_handled_by", "behandeld door {{who}}", { who: r.handledBy })}`
                        : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-3">
                    <DeadlineCell deadlineAt={r.deadlineAt} />
                    {r.status !== "delivered" && r.status !== "denied" ? (
                      <div className="flex gap-2">
                        {r.kind === "erasure" ? (
                          mayErase ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              onClick={() => setEraseFor(r)}
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              {t("gdpr_action_erase", "Verwijdering uitvoeren")}
                            </Button>
                          ) : (
                            <span className="text-label text-muted-foreground">
                              {t("ops_readonly", "Alleen-lezen")}
                            </span>
                          )
                        ) : mayExport ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => setExportFor(r)}
                          >
                            <Download className="h-3.5 w-3.5" aria-hidden="true" />
                            {t("gdpr_action_export", "Export bundelen")}
                          </Button>
                        ) : (
                          <span className="text-label text-muted-foreground">
                            {t("ops_readonly", "Alleen-lezen")}
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export bundle dialog */}
      <Dialog open={!!exportFor} onOpenChange={(open) => !open && setExportFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileArchive className="h-5 w-5 text-primary" aria-hidden="true" />
              {t("gdpr_export_dialog_title", "Export bundelen")}
            </DialogTitle>
          </DialogHeader>
          {exportFor ? (
            <div className="space-y-3 py-1 text-body-sm">
              <p className="text-muted-foreground">
                {t(
                  "gdpr_export_body",
                  "Bondel alle gegevens van {{who}} tot één JSON/ZIP: profiel, sessies, taken, dagboek en berichten (inhoud waar wettelijk toegestaan). Dezelfde bundel als het datacenter van de cliënt.",
                  { who: exportFor.subjectName },
                )}
              </p>
              <ul className="space-y-1 rounded-card border bg-background p-3 text-label text-muted-foreground">
                <li>profiles · sessions · tasks</li>
                <li>journal_entries · messages (metadata + inhoud)</li>
                <li>consents · subscriptions</li>
              </ul>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setExportFor(null)}>
              {t("ops_cancel", "Annuleren")}
            </Button>
            <Button type="button" className="gap-1.5" onClick={runExport}>
              <Download className="h-4 w-4" aria-hidden="true" />
              {t("gdpr_export_confirm", "Bundel aanmaken")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Erasure dialog — documented cascade */}
      <Dialog open={!!eraseFor} onOpenChange={(open) => !open && setEraseFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
              {t("gdpr_erase_dialog_title", "Verwijdering uitvoeren")}
            </DialogTitle>
          </DialogHeader>
          {eraseFor ? (
            <div className="space-y-3 py-1 text-body-sm">
              <p className="text-muted-foreground">
                {t(
                  "gdpr_erase_body",
                  "Verwijder de persoonsgegevens van {{who}} volgens de gedocumenteerde cascade over alle tabellen. Veiligheidsdossiers blijven gepseudonimiseerd bewaard als minimaal wettelijk verweer.",
                  { who: eraseFor.subjectName },
                )}
              </p>
              <p className="text-label text-muted-foreground">
                {t(
                  "gdpr_erase_retain",
                  "Bewaard (gepseudonimiseerd): safety_cases voor juridische verantwoording.",
                )}
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setEraseFor(null)}>
              {t("ops_cancel", "Annuleren")}
            </Button>
            <Button type="button" variant="destructive" className="gap-1.5" onClick={runErasure}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {t("gdpr_erase_confirm", "Definitief verwijderen")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default GdprQueue;
