/**
 * ProviderInvoicing — Belgium-aware client-invoicing (ticket T-PX-16, ruling R11).
 *
 * Route: /dashboard/therapist/invoicing. This is invoicing *clients* (the paper a
 * provider gives the person they see), NOT the Bondable subscription — that lives
 * at /dashboard/provider/billing. Two products, two routes (R11).
 *
 * Tabs:
 *   - Facturen — list of invoices with status badges + "maak factuur van
 *     onfactureerde sessies"; opens a per-invoice detail/preview.
 *   - Instellingen — provider billing settings (art. 44 BTW-vrijstelling toggle,
 *     practice address, IBAN, gapless numbering, erkenningsnummer).
 *
 * Belgium specifics surfaced: art. 44 §1 W.BTW exemption clause, gapless
 * numbering (2026-0001…), mutualiteit/terugbetaling attest note, EUR tabular.
 *
 * Design: DashboardLayout userType="therapist". Border-first, no mint (provider
 * surface), no gradients. Fraunces one level per view via font-display. Warm
 * professional Flemish je/jij, no exclamation marks. Strings via t('key','NL').
 */

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  FileText,
  Plus,
  Check,
  Receipt,
  Landmark,
  Settings2,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import LineSteps from '@/components/illustration/LineSteps';
import { toast } from '@/hooks/ui/use-toast';
import {
  invoiceService,
  type Invoice,
  type InvoiceStatus,
  type ProviderBillingSettings,
  type UnbilledSession,
  type VatStatus,
} from '@/services/api/invoiceService';

/* -------------------------------------------------------------------------- */

const fmt = invoiceService.formatEur;

/** NL-BE short date, e.g. "5 juli 2026". */
function formatDate(iso: string): string {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('nl-BE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const { t } = useTranslation();
  if (status === 'paid') {
    return <Badge variant="success">{t('invoicing.status.paid', 'Betaald')}</Badge>;
  }
  if (status === 'sent') {
    return <Badge variant="info">{t('invoicing.status.sent', 'Verstuurd')}</Badge>;
  }
  return <Badge variant="outline">{t('invoicing.status.draft', 'Klad')}</Badge>;
}

/* -------------------------------------------------------------------------- */
/* Facturen list                                                              */
/* -------------------------------------------------------------------------- */

function FacturenTab({
  invoices,
  unbilled,
  onOpen,
  onCreate,
}: {
  invoices: Invoice[];
  unbilled: UnbilledSession[];
  onOpen: (id: string) => void;
  onCreate: (sessionIds: string[]) => void;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selectedTotal = useMemo(
    () =>
      unbilled
        .filter((u) => selected.has(u.sessionId))
        .reduce((sum, u) => sum + u.amountCents, 0),
    [unbilled, selected],
  );

  return (
    <div className="space-y-8 animate-enter">
      {/* Unbilled sessions → create invoice */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-display-md text-foreground">
              {t('invoicing.unbilled.title', 'Onfactureerde sessies')}
            </h2>
            <p className="mt-1 text-body-sm text-muted-foreground">
              {t(
                'invoicing.unbilled.subtitle',
                'Afgeronde sessies die nog niet op een factuur staan. Selecteer en maak een factuur.',
              )}
            </p>
          </div>
          <Button
            disabled={selected.size === 0}
            onClick={() => {
              onCreate([...selected]);
              setSelected(new Set());
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('invoicing.unbilled.create', 'Maak factuur')}
            {selected.size > 0 ? ` · ${fmt(selectedTotal)}` : ''}
          </Button>
        </div>

        {unbilled.length === 0 ? (
          <div className="rounded-card border bg-card px-6 py-8 text-center text-body-sm text-muted-foreground">
            {t(
              'invoicing.unbilled.empty',
              'Alles is gefactureerd. Nieuwe afgeronde sessies verschijnen hier vanzelf.',
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-card border bg-card">
            <ul className="divide-y divide-border">
              {unbilled.map((u) => {
                const checked = selected.has(u.sessionId);
                return (
                  <li key={u.sessionId}>
                    <button
                      type="button"
                      onClick={() => toggle(u.sessionId)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                    >
                      <span
                        aria-hidden
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-ctl border ${
                          checked
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background'
                        }`}
                      >
                        {checked ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body-sm font-medium text-foreground">
                          {u.clientName}
                        </span>
                        <span className="block text-label text-muted-foreground">
                          {formatDate(u.date)} · {u.durationMin} min
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums text-body-sm text-foreground">
                        {fmt(u.amountCents)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <Separator />

      {/* Invoice list */}
      <section>
        <h2 className="mb-3 font-display text-display-md text-foreground">
          {t('invoicing.list.title', 'Facturen')}
        </h2>
        {invoices.length === 0 ? (
          <EmptyState
            bordered
            motif={<LineSteps />}
            title={t('invoicing.list.emptyTitle', 'Nog geen facturen')}
            description={t(
              'invoicing.list.emptyBody',
              'Maak je eerste factuur van een afgeronde sessie. Nummering en btw-vermelding regelt Bondable voor je.',
            )}
          />
        ) : (
          <div className="overflow-hidden rounded-card border bg-card">
            <ul className="divide-y divide-border">
              {invoices.map((inv) => {
                const totals = invoiceService.computeTotals(inv);
                return (
                  <li key={inv.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(inv.id)}
                      className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-muted/40"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ctl border bg-background text-muted-foreground">
                        <FileText className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body-sm font-medium text-foreground">
                          {inv.clientName}
                        </span>
                        <span className="block text-label text-muted-foreground">
                          {inv.number
                            ? `${inv.number} · ${formatDate(inv.issueDate)}`
                            : t('invoicing.list.draftLine', 'Klad · nog geen nummer')}
                        </span>
                      </span>
                      <span className="hidden shrink-0 sm:block">
                        <StatusBadge status={inv.status} />
                      </span>
                      <span className="shrink-0 tabular-nums text-body-sm font-medium text-foreground">
                        {fmt(totals.grossCents)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Invoice detail / preview                                                   */
/* -------------------------------------------------------------------------- */

function InvoiceDetail({
  invoice,
  settings,
  onBack,
  onIssue,
  onMarkPaid,
  onNote,
}: {
  invoice: Invoice;
  settings: ProviderBillingSettings;
  onBack: () => void;
  onIssue: () => void;
  onMarkPaid: () => void;
  onNote: (note: string) => void;
}) {
  const { t } = useTranslation();
  const totals = invoiceService.computeTotals(invoice);
  const [note, setNote] = useState(invoice.mutualiteitNote);
  const showVat = totals.vatCents > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-enter">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('invoicing.detail.back', 'Terug naar facturen')}
        </Button>
        <StatusBadge status={invoice.status} />
      </div>

      {/* The invoice "document" */}
      <div className="rounded-card border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-display-lg text-foreground">
              {t('invoicing.detail.heading', 'Factuur')}
            </h1>
            <p className="mt-1 text-body-sm text-muted-foreground">
              {invoice.number
                ? invoice.number
                : t('invoicing.detail.willNumber', 'Nummer volgt bij verzenden')}
            </p>
          </div>
          <div className="text-right text-label text-muted-foreground">
            <p className="whitespace-pre-line text-foreground">
              {settings.legalName}
            </p>
            <p className="whitespace-pre-line">{settings.practiceAddress}</p>
            <p className="mt-1">{settings.enterpriseNumber}</p>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="grid grid-cols-2 gap-4 text-body-sm">
          <div>
            <p className="text-label uppercase tracking-wide text-muted-foreground">
              {t('invoicing.detail.billedTo', 'Aan')}
            </p>
            <p className="mt-1 font-medium text-foreground">{invoice.clientName}</p>
          </div>
          <div className="text-right">
            <p className="text-label uppercase tracking-wide text-muted-foreground">
              {t('invoicing.detail.dates', 'Data')}
            </p>
            <p className="mt-1 text-foreground">
              {t('invoicing.detail.issued', 'Opgemaakt')}: {formatDate(invoice.issueDate)}
            </p>
            <p className="text-foreground">
              {t('invoicing.detail.due', 'Vervaldag')}: {formatDate(invoice.dueDate)}
            </p>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Line items */}
        <table className="w-full text-body-sm">
          <thead>
            <tr className="text-label uppercase tracking-wide text-muted-foreground">
              <th className="pb-2 text-left font-medium">
                {t('invoicing.detail.description', 'Omschrijving')}
              </th>
              <th className="pb-2 text-right font-medium">
                {t('invoicing.detail.qty', 'Aantal')}
              </th>
              <th className="pb-2 text-right font-medium">
                {t('invoicing.detail.unit', 'Bedrag')}
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((l) => (
              <tr key={l.id} className="border-t border-border">
                <td className="py-2.5 text-foreground">{l.description}</td>
                <td className="py-2.5 text-right tabular-nums text-foreground">
                  {l.qty}
                </td>
                <td className="py-2.5 text-right tabular-nums text-foreground">
                  {fmt(l.qty * l.unitCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Separator className="my-4" />

        <div className="ml-auto max-w-xs space-y-1.5 text-body-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>{t('invoicing.detail.net', 'Netto')}</span>
            <span className="tabular-nums text-foreground">{fmt(totals.netCents)}</span>
          </div>
          {showVat ? (
            <div className="flex justify-between text-muted-foreground">
              <span>{t('invoicing.detail.vat', 'Btw 21%')}</span>
              <span className="tabular-nums text-foreground">{fmt(totals.vatCents)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-border pt-1.5 font-medium">
            <span className="text-foreground">
              {t('invoicing.detail.total', 'Totaal')}
            </span>
            <span className="tabular-nums text-foreground">{fmt(totals.grossCents)}</span>
          </div>
        </div>

        {/* VAT clause — the Belgium differentiator */}
        <div className="mt-6 rounded-ctl border border-border bg-muted/40 px-3 py-2 text-label text-muted-foreground">
          {invoiceService.vatClause(invoice.vatStatus)}
        </div>

        {settings.iban ? (
          <p className="mt-4 text-label text-muted-foreground">
            {t('invoicing.detail.payTo', 'Te betalen op')} {settings.iban}
          </p>
        ) : null}
        {settings.invoiceFooter ? (
          <p className="mt-1 text-label text-muted-foreground">
            {settings.invoiceFooter}
          </p>
        ) : null}
      </div>

      {/* Mutualiteit / terugbetaling attest note */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-body font-medium">
            <Landmark className="h-4 w-4 text-muted-foreground" />
            {t('invoicing.detail.attestTitle', 'Attest voor terugbetaling')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-body-sm text-muted-foreground">
            {t(
              'invoicing.detail.attestBody',
              'Voeg een nota toe voor het ziekenfonds. Bondable geeft geen garantie op terugbetaling — dat beslist je mutualiteit.',
            )}
          </p>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => onNote(note)}
            rows={3}
            placeholder={t(
              'invoicing.detail.attestPlaceholder',
              'Bv. individuele psychologische begeleiding, erkenningsnummer vermeld.',
            )}
          />
          {settings.recognitionNumber ? (
            <p className="text-label text-muted-foreground">
              {t('invoicing.detail.recognition', 'Erkenningsnummer')}:{' '}
              {settings.recognitionNumber}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        {invoice.status === 'draft' ? (
          <Button onClick={onIssue}>
            <Receipt className="mr-2 h-4 w-4" />
            {t('invoicing.detail.issue', 'Verstuur factuur')}
          </Button>
        ) : null}
        {invoice.status === 'sent' ? (
          <Button onClick={onMarkPaid}>
            <Check className="mr-2 h-4 w-4" />
            {t('invoicing.detail.markPaid', 'Markeer als betaald')}
          </Button>
        ) : null}
        {invoice.status === 'paid' ? (
          <p className="text-body-sm text-success">
            {t('invoicing.detail.paidOn', 'Betaald op')}{' '}
            {formatDate(invoice.paidAt ?? '')}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Instellingen                                                               */
/* -------------------------------------------------------------------------- */

function InstellingenTab({
  settings,
  onSave,
}: {
  settings: ProviderBillingSettings;
  onSave: (patch: Partial<ProviderBillingSettings>) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<ProviderBillingSettings>(settings);

  const set = <K extends keyof ProviderBillingSettings>(
    key: K,
    value: ProviderBillingSettings[K],
  ) => setDraft((prev) => ({ ...prev, [key]: value }));

  const art44 = draft.vatStatus === 'vat_exempt_art44';

  return (
    <div className="max-w-2xl space-y-6 animate-enter">
      <Card>
        <CardHeader>
          <CardTitle className="text-body font-medium">
            {t('invoicing.settings.identityTitle', 'Praktijk en identiteit')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="legalName">
              {t('invoicing.settings.legalName', 'Wettelijke naam')}
            </Label>
            <Input
              id="legalName"
              value={draft.legalName}
              onChange={(e) => set('legalName', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">
              {t('invoicing.settings.address', 'Praktijkadres')}
            </Label>
            <Textarea
              id="address"
              rows={3}
              value={draft.practiceAddress}
              onChange={(e) => set('practiceAddress', e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="kbo">
                {t('invoicing.settings.enterprise', 'Ondernemingsnummer (KBO)')}
              </Label>
              <Input
                id="kbo"
                value={draft.enterpriseNumber}
                onChange={(e) => set('enterpriseNumber', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="iban">
                {t('invoicing.settings.iban', 'IBAN')}
              </Label>
              <Input
                id="iban"
                value={draft.iban}
                onChange={(e) => set('iban', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="recognition">
              {t('invoicing.settings.recognition', 'Erkennings-/visumnummer')}
            </Label>
            <Input
              id="recognition"
              value={draft.recognitionNumber}
              onChange={(e) => set('recognitionNumber', e.target.value)}
            />
            <p className="text-label text-muted-foreground">
              {t(
                'invoicing.settings.recognitionHint',
                'Verschijnt op het attest voor terugbetaling. Laat leeg als je geen erkenning hebt.',
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-body font-medium">
            {t('invoicing.settings.vatTitle', 'Btw en vrijstelling')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="vat">
              {t('invoicing.settings.vatStatus', 'Btw-regime')}
            </Label>
            <Select
              value={draft.vatStatus}
              onValueChange={(v) => set('vatStatus', v as VatStatus)}
            >
              <SelectTrigger id="vat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vat_exempt_art44">
                  {t('invoicing.settings.art44', 'Vrijgesteld — art. 44 (zorgverlening)')}
                </SelectItem>
                <SelectItem value="small_business_exempt">
                  {t(
                    'invoicing.settings.smallBiz',
                    'Vrijgesteld — kleine onderneming',
                  )}
                </SelectItem>
                <SelectItem value="vat_21">
                  {t('invoicing.settings.vat21', 'Btw 21% (bv. coaching)')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Art. 44 quick toggle + the exact clause that will print */}
          <div className="flex items-start justify-between gap-4 rounded-ctl border border-border bg-muted/40 px-3 py-3">
            <div>
              <p className="text-body-sm font-medium text-foreground">
                {t('invoicing.settings.art44Toggle', 'Btw-vrijstelling art. 44')}
              </p>
              <p className="mt-0.5 text-label text-muted-foreground">
                {invoiceService.vatClause(draft.vatStatus)}
              </p>
            </div>
            <Switch
              checked={art44}
              onCheckedChange={(on) =>
                set('vatStatus', on ? 'vat_exempt_art44' : 'vat_21')
              }
            />
          </div>
          <p className="text-label text-muted-foreground">
            {t(
              'invoicing.settings.vatHint',
              'Veel zorgprestaties zijn vrijgesteld van btw onder art. 44 §1 W.BTW. Twijfel je over je regime, vraag het je boekhouder.',
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-body font-medium">
            {t('invoicing.settings.numberingTitle', 'Nummering en tarief')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="prefix">
                {t('invoicing.settings.prefix', 'Nummerprefix')}
              </Label>
              <Input
                id="prefix"
                value={draft.numberingPrefix}
                onChange={(e) => set('numberingPrefix', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rate">
                {t('invoicing.settings.rate', 'Standaardtarief (EUR)')}
              </Label>
              <Input
                id="rate"
                type="number"
                min={0}
                step="0.5"
                value={(draft.defaultRateCents / 100).toString()}
                onChange={(e) =>
                  set(
                    'defaultRateCents',
                    Math.round(Number(e.target.value || 0) * 100),
                  )
                }
              />
            </div>
          </div>
          <p className="text-label text-muted-foreground">
            {t('invoicing.settings.numberingHint', 'Volgend nummer')}:{' '}
            <span className="tabular-nums text-foreground">
              {draft.numberingPrefix}-{String(draft.nextNumber).padStart(4, '0')}
            </span>{' '}
            {t(
              'invoicing.settings.gapless',
              '— opeenvolgend en zonder gaten, zoals de wet vraagt.',
            )}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="footer">
              {t('invoicing.settings.footer', 'Voettekst op factuur')}
            </Label>
            <Textarea
              id="footer"
              rows={2}
              value={draft.invoiceFooter}
              onChange={(e) => set('invoiceFooter', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => onSave(draft)}>
          {t('invoicing.settings.save', 'Instellingen bewaren')}
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function ProviderInvoicing() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<ProviderBillingSettings>(() =>
    invoiceService.getSettings(),
  );
  const [invoices, setInvoices] = useState<Invoice[]>(() =>
    invoiceService.listInvoices(),
  );
  const [unbilled, setUnbilled] = useState<UnbilledSession[]>(() =>
    invoiceService.listUnbilled(),
  );
  const [openId, setOpenId] = useState<string | null>(null);

  const refresh = () => {
    setInvoices(invoiceService.listInvoices());
    setUnbilled(invoiceService.listUnbilled());
    setSettings(invoiceService.getSettings());
  };

  const openInvoice = openId
    ? invoices.find((i) => i.id === openId) ?? null
    : null;

  const handleCreate = (sessionIds: string[]) => {
    try {
      const inv = invoiceService.createInvoiceFromSessions(sessionIds);
      refresh();
      setOpenId(inv.id);
      toast({
        title: t('invoicing.toast.created', 'Kladfactuur aangemaakt'),
        description: t(
          'invoicing.toast.createdBody',
          'Controleer de gegevens en verstuur wanneer je klaar bent.',
        ),
      });
    } catch (err) {
      toast({
        title: t('invoicing.toast.error', 'Er ging iets mis'),
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    }
  };

  const handleIssue = () => {
    if (!openId) return;
    const inv = invoiceService.issueInvoice(openId);
    refresh();
    toast({
      title: t('invoicing.toast.issued', 'Factuur verstuurd'),
      description: inv?.number
        ? t('invoicing.toast.issuedBody', 'Nummer {{n}} toegekend.', {
            n: inv.number,
          })
        : undefined,
    });
  };

  const handleMarkPaid = () => {
    if (!openId) return;
    invoiceService.markPaid(openId);
    refresh();
    toast({
      title: t('invoicing.toast.paid', 'Gemarkeerd als betaald'),
    });
  };

  const handleNote = (note: string) => {
    if (!openId) return;
    invoiceService.updateInvoice(openId, { mutualiteitNote: note });
    refresh();
  };

  const handleSaveSettings = (patch: Partial<ProviderBillingSettings>) => {
    const next = invoiceService.saveSettings(patch);
    setSettings(next);
    toast({
      title: t('invoicing.toast.settingsSaved', 'Instellingen bewaard'),
    });
  };

  return (
    <DashboardLayout userType="therapist">
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
        {openInvoice ? (
          <InvoiceDetail
            invoice={openInvoice}
            settings={settings}
            onBack={() => setOpenId(null)}
            onIssue={handleIssue}
            onMarkPaid={handleMarkPaid}
            onNote={handleNote}
          />
        ) : (
          <>
            <header className="mb-6">
              <h1 className="font-display text-display-lg text-foreground">
                {t('invoicing.title', 'Facturatie')}
              </h1>
              <p className="mt-1 text-body-sm text-muted-foreground">
                {t(
                  'invoicing.subtitle',
                  'Facturen voor je cliënten — btw, nummering en attest voor terugbetaling volgens de Belgische regels.',
                )}
              </p>
            </header>

            <Tabs defaultValue="facturen">
              <TabsList>
                <TabsTrigger value="facturen">
                  {t('invoicing.tabs.invoices', 'Facturen')}
                </TabsTrigger>
                <TabsTrigger value="instellingen">
                  <Settings2 className="mr-1.5 h-4 w-4" />
                  {t('invoicing.tabs.settings', 'Instellingen')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="facturen" className="mt-6">
                <FacturenTab
                  invoices={invoices}
                  unbilled={unbilled}
                  onOpen={setOpenId}
                  onCreate={handleCreate}
                />
              </TabsContent>

              <TabsContent value="instellingen" className="mt-6">
                <InstellingenTab settings={settings} onSave={handleSaveSettings} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
