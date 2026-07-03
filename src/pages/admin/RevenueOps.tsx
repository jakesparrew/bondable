import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Euro, Gift, RefreshCw, ReceiptText, Mail } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import LineWave from "@/components/illustration/LineWave";
import { can, currentAdminRole } from "@/lib/adminAbility";
import {
  opsService,
  type Subscription,
  type SubTier,
  type SubStatus,
  type BillingEvent,
} from "@/services/api/opsService";

/**
 * RevenueOps — /dashboard/admin/revenue (plan 07 §4, ticket T-OC-8).
 *
 * The read/ops surface over plan 05's subscriptions + billing_events. Four tabs:
 * Abonnementen (list + MRR contribution), Mislukte betalingen (past_due dunning),
 * Terugbetalingen (reason-required, audit-logged), Comps (excluded from MRR).
 * All amounts are EUR with tabular numerals. Mutations are gated by adminAbility:
 * a readonly advisor sees the tables but no action buttons.
 */

function eur(cents: number): string {
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

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

const TierBadge = ({ tier }: { tier: SubTier }) => {
  const { t } = useTranslation();
  if (tier === "practice")
    return <Badge variant="info">{t("ops_tier_practice", "Practice")}</Badge>;
  if (tier === "pro") return <Badge variant="pro">{t("ops_tier_pro", "Pro")}</Badge>;
  return <Badge variant="outline">{t("ops_tier_free", "Free")}</Badge>;
};

const StatusBadge = ({ status }: { status: SubStatus }) => {
  const { t } = useTranslation();
  if (status === "active")
    return <Badge variant="success">{t("ops_status_active", "Actief")}</Badge>;
  if (status === "trialing")
    return <Badge variant="info">{t("ops_status_trialing", "Proefperiode")}</Badge>;
  if (status === "past_due")
    return <Badge variant="warning">{t("ops_status_past_due", "Betaling mislukt")}</Badge>;
  return <Badge variant="outline">{t("ops_status_canceled", "Opgezegd")}</Badge>;
};

const kindLabel = (kind: BillingEvent["kind"], t: ReturnType<typeof useTranslation>["t"]) => {
  switch (kind) {
    case "payment_succeeded":
      return t("ops_evt_paid", "Betaling geslaagd");
    case "payment_failed":
      return t("ops_evt_failed", "Betaling mislukt");
    case "refund_issued":
      return t("ops_evt_refund", "Terugbetaling");
    case "comp_granted":
      return t("ops_evt_comp", "Comp toegekend");
    default:
      return t("ops_evt_canceled", "Opgezegd");
  }
};

const RevenueOps = () => {
  const { t, i18n } = useTranslation();
  const role = currentAdminRole();
  const mayRefund = can(role, "revenue.refund");
  const mayRetry = can(role, "revenue.retry_payment");

  const subs = useMemo(() => opsService.listSubscriptions(), []);
  const events = useMemo(() => opsService.listBillingEvents(), []);
  const comps = useMemo(() => opsService.listComps(), []);
  const mrr = useMemo(() => opsService.mrrCents(), []);
  const pastDue = useMemo(() => opsService.pastDue(), []);
  const atRisk = useMemo(() => opsService.atRiskCents(), []);

  const [refundFor, setRefundFor] = useState<Subscription | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [loggedRefunds, setLoggedRefunds] = useState<BillingEvent[]>([]);
  const [retriedIds, setRetriedIds] = useState<string[]>([]);

  const submitRefund = () => {
    if (!refundFor || !refundReason.trim()) return;
    // Mock: append to an in-session refund log. Real: Stripe refund + audit_logs.
    setLoggedRefunds((prev) => [
      {
        id: `rf-${refundFor.id}-${prev.length}`,
        kind: "refund_issued",
        accountName: refundFor.accountName,
        amountCents: refundFor.amountCents,
        at: new Date().toISOString(),
        note: refundReason.trim(),
      },
      ...prev,
    ]);
    setRefundFor(null);
    setRefundReason("");
  };

  const allRefunds = [...loggedRefunds, ...events.filter((e) => e.kind === "refund_issued")];

  return (
    <DashboardLayout userType="admin">
      <div className="space-y-6">
        {/* Header + MRR strip (typography-led, hairline dividers, no card grid) */}
        <div>
          <h1 className="font-display text-display-lg text-foreground">
            {t("ops_revenue_title", "Inkomsten")}
          </h1>
          <p className="mt-1 text-body-sm text-muted-foreground">
            {t(
              "ops_revenue_subtitle",
              "Abonnementen, mislukte betalingen en terugbetalingen op één plek. Tarief verandert nooit de finder-ranking.",
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-x-10 gap-y-4 border-y py-4">
          <div>
            <p className="text-2xl font-semibold tabular-nums text-foreground">{eur(mrr)}</p>
            <p className="text-label text-muted-foreground">
              {t("ops_revenue_mrr", "MRR — comps niet meegeteld")}
            </p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums text-foreground">{eur(mrr * 12)}</p>
            <p className="text-label text-muted-foreground">{t("ops_revenue_arr", "ARR")}</p>
          </div>
          <div>
            <p
              className={`text-2xl font-semibold tabular-nums ${
                atRisk > 0 ? "text-warning" : "text-foreground"
              }`}
            >
              {eur(atRisk)}
            </p>
            <p className="text-label text-muted-foreground">
              {t("ops_revenue_at_risk", "Risico — mislukte betalingen")}
            </p>
          </div>
        </div>

        <Tabs defaultValue="subscriptions">
          <TabsList className="flex-wrap">
            <TabsTrigger value="subscriptions">
              {t("ops_tab_subscriptions", "Abonnementen")}
            </TabsTrigger>
            <TabsTrigger value="failed">
              {t("ops_tab_failed", "Mislukte betalingen")}
              {pastDue.length > 0 ? (
                <span className="ml-1.5 tabular-nums text-warning">({pastDue.length})</span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="refunds">{t("ops_tab_refunds", "Terugbetalingen")}</TabsTrigger>
            <TabsTrigger value="comps">{t("ops_tab_comps", "Comps")}</TabsTrigger>
          </TabsList>

          {/* Subscriptions */}
          <TabsContent value="subscriptions" className="mt-4">
            <div className="overflow-x-auto rounded-card border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("ops_col_account", "Account")}</TableHead>
                    <TableHead>{t("ops_col_tier", "Tier")}</TableHead>
                    <TableHead>{t("ops_col_status", "Status")}</TableHead>
                    <TableHead className="text-right">{t("ops_col_mrr", "MRR")}</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      {t("ops_col_started", "Sinds")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subs.map((s) => {
                    const inMrr = !s.isComp && (s.status === "active" || s.status === "trialing");
                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-body-sm font-medium text-foreground">
                              {s.accountName}
                            </span>
                            {s.isComp ? (
                              <Badge variant="outline" className="text-label">
                                {t("ops_comp_label", "Comp")}
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <TierBadge tier={s.tier} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={s.status} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-foreground">
                          {inMrr ? (
                            eur(s.amountCents)
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-body-sm text-muted-foreground">
                          {formatDate(s.startedAt, i18n.language)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <p className="mt-2 text-label text-muted-foreground">
              {t(
                "ops_comp_note",
                "Comp-accounts (pilotpraktijken en bevriende hulpverleners) krijgen Pro of Practice zonder de MRR te vertekenen — ze staan gelabeld en tellen niet mee.",
              )}
            </p>
          </TabsContent>

          {/* Failed payments */}
          <TabsContent value="failed" className="mt-4">
            {pastDue.length === 0 ? (
              <EmptyState
                motif={<LineWave />}
                title={t("ops_failed_empty_title", "Geen mislukte betalingen")}
                description={t(
                  "ops_failed_empty_body",
                  "Alle abonnementen zijn up-to-date. Zo hoort het.",
                )}
              />
            ) : (
              <div className="overflow-x-auto rounded-card border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("ops_col_account", "Account")}</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        {t("ops_col_dunning", "Herinnering")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("ops_col_amount", "Bedrag")}
                      </TableHead>
                      <TableHead className="text-right">{t("ops_col_action", "Actie")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pastDue.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="text-body-sm font-medium text-foreground">
                          {s.accountName}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="warning" className="text-label">
                            {t("ops_dunning_stage", "Fase {{n}}", { n: s.dunningStage ?? 1 })}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-foreground">
                          {eur(s.amountCents)}
                        </TableCell>
                        <TableCell className="text-right">
                          {mayRetry ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="gap-1.5"
                                disabled={retriedIds.includes(s.id)}
                                onClick={() => setRetriedIds((p) => [...p, s.id])}
                              >
                                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                                {retriedIds.includes(s.id)
                                  ? t("ops_retried", "Opnieuw ingepland")
                                  : t("ops_retry", "Opnieuw proberen")}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="gap-1.5"
                                onClick={() => setRetriedIds((p) => [...p, s.id])}
                              >
                                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                                {t("ops_send_update", "Mail sturen")}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-label text-muted-foreground">
                              {t("ops_readonly", "Alleen-lezen")}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Refunds */}
          <TabsContent value="refunds" className="mt-4 space-y-4">
            {mayRefund ? (
              <div className="rounded-card border bg-card p-4">
                <p className="text-body-sm text-muted-foreground">
                  {t(
                    "ops_refund_intro",
                    "Kies een account om een terugbetaling te loggen. Een reden is verplicht en wordt bewaard in het audit-logboek.",
                  )}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {subs
                    .filter((s) => s.amountCents > 0 && !s.isComp)
                    .map((s) => (
                      <Button
                        key={s.id}
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setRefundFor(s)}
                      >
                        {s.accountName}
                      </Button>
                    ))}
                </div>
              </div>
            ) : null}

            {allRefunds.length === 0 ? (
              <EmptyState
                motif={<LineWave />}
                title={t("ops_refund_empty_title", "Nog geen terugbetalingen")}
                description={t(
                  "ops_refund_empty_body",
                  "Terugbetalingen verschijnen hier met reden en datum.",
                )}
              />
            ) : (
              <div className="overflow-x-auto rounded-card border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("ops_col_account", "Account")}</TableHead>
                      <TableHead>{t("ops_col_reason", "Reden")}</TableHead>
                      <TableHead className="text-right">
                        {t("ops_col_amount", "Bedrag")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allRefunds.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-body-sm font-medium text-foreground">
                          {r.accountName}
                        </TableCell>
                        <TableCell className="text-body-sm text-muted-foreground">
                          {r.note ?? "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-foreground">
                          {eur(r.amountCents)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Comps */}
          <TabsContent value="comps" className="mt-4">
            {comps.length === 0 ? (
              <EmptyState
                motif={<LineWave />}
                title={t("ops_comps_empty_title", "Geen comp-accounts")}
                description={t(
                  "ops_comps_empty_body",
                  "Comp-accounts staan hier los van de MRR.",
                )}
              />
            ) : (
              <div className="overflow-x-auto rounded-card border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("ops_col_account", "Account")}</TableHead>
                      <TableHead>{t("ops_col_tier", "Tier")}</TableHead>
                      <TableHead>{t("ops_col_reason", "Reden")}</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        {t("ops_col_expires", "Verloopt")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comps.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-body-sm font-medium text-foreground">
                          {c.accountName}
                        </TableCell>
                        <TableCell>
                          <TierBadge tier={c.tier} />
                        </TableCell>
                        <TableCell className="text-body-sm text-muted-foreground">
                          {c.reason}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-body-sm text-muted-foreground">
                          {formatDate(c.expiresAt, i18n.language)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <p className="mt-2 text-label text-muted-foreground">
              {t(
                "ops_comps_footer",
                "Comps zijn uitgesloten van de MRR-widget en gelabeld in de abonnementenlijst.",
              )}
            </p>
          </TabsContent>
        </Tabs>
      </div>

      {/* Refund dialog — reason required */}
      <Dialog open={!!refundFor} onOpenChange={(open) => !open && setRefundFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-primary" aria-hidden="true" />
              {t("ops_refund_dialog_title", "Terugbetaling loggen")}
            </DialogTitle>
          </DialogHeader>
          {refundFor ? (
            <div className="space-y-3 py-1">
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-muted-foreground">
                  {t("ops_col_account", "Account")}
                </span>
                <span className="font-medium text-foreground">{refundFor.accountName}</span>
              </div>
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-muted-foreground">{t("ops_col_amount", "Bedrag")}</span>
                <span className="tabular-nums font-medium text-foreground">
                  {eur(refundFor.amountCents)}
                </span>
              </div>
              <div>
                <label
                  htmlFor="refund-reason"
                  className="mb-1 block text-label text-muted-foreground"
                >
                  {t("ops_refund_reason_label", "Reden (verplicht)")}
                </label>
                <Textarea
                  id="refund-reason"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={3}
                  placeholder={t(
                    "ops_refund_reason_ph",
                    "Bijv. dubbele afschrijving na abonnementswissel.",
                  )}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setRefundFor(null)}>
              {t("ops_cancel", "Annuleren")}
            </Button>
            <Button type="button" disabled={!refundReason.trim()} onClick={submitRefund}>
              {t("ops_refund_confirm", "Terugbetaling loggen")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default RevenueOps;
