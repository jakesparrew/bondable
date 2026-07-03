/**
 * VerificationQueue — provider-verification review surface for the owner cockpit
 * (ticket T-OC-7, plan 07 §2). This is the review side: the owner approves or
 * rejects a provider's submitted credentials, and that decision is the SINGLE
 * gate on the Finder trust badge.
 *
 * is_regulated INVARIANT (R8): never self-declared. Approving flips the
 * verification_status to 'verified'; the badge is then GOVERNED by
 * `recomputeRegulated(type, 'verified')` (see verificationService). On approve we
 * surface the resulting badge — "Erkend hulpverlener" (regulated clinician) or
 * "Geverifieerde coach" (coach) per R9 — computed from the law, never typed by hand.
 *
 * Reject records a note and "sends" a templated NL comms message to a mock outbox.
 *
 * Route: /dashboard/admin/verification (parent wires the route + nav).
 */

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BadgeCheck,
  Check,
  FileText,
  ShieldQuestion,
  X,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EmptyState } from '@/components/ui/empty-state';
import LineBranch from '@/components/illustration/LineBranch';
import { PROVIDER_TYPE_META } from '@/lib/providerTypes';
import {
  verificationService,
  resultingBadge,
  type ProviderVerification,
  type CommsNote,
} from '@/services/api/verificationService';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function formatDate(iso: string, locale?: string): string {
  try {
    return new Date(iso).toLocaleString(locale || undefined, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/* -------------------------------------------------------------------------- */
/* Result banner (post-decision badge)                                         */
/* -------------------------------------------------------------------------- */

const ResultBanner = ({ v }: { v: ProviderVerification }) => {
  const { t } = useTranslation();
  const badge = resultingBadge(v);

  if (v.status === 'approved') {
    return (
      <div className="flex items-start gap-2.5 rounded-card border border-primary/30 bg-secondary/40 px-3 py-2.5">
        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="text-body-sm font-semibold text-foreground">
            {t('verif_approved', 'Goedgekeurd')}
          </p>
          {badge.label && (
            <p className="mt-1 flex items-center gap-1.5 text-label text-muted-foreground">
              {t('verif_badge_issued', 'Badge toegekend')}:
              <Badge variant={badge.isRegulated ? 'trust' : 'success'}>{badge.label}</Badge>
            </p>
          )}
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t(
              'verif_derived_note',
              'is_regulated is afgeleid via recomputeRegulated — nooit zelf aangevinkt.',
            )}
          </p>
        </div>
      </div>
    );
  }

  if (v.status === 'rejected') {
    return (
      <div className="flex items-start gap-2.5 rounded-card border border-destructive/30 bg-destructive-soft px-3 py-2.5">
        <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
        <div>
          <p className="text-body-sm font-semibold text-foreground">
            {t('verif_rejected', 'Afgewezen')}
          </p>
          {v.decisionNote && (
            <p className="mt-0.5 text-label text-muted-foreground">{v.decisionNote}</p>
          )}
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t('verif_reject_sent', 'Een bericht met de reden is naar de hulpverlener verstuurd.')}
          </p>
        </div>
      </div>
    );
  }

  return null;
};

/* -------------------------------------------------------------------------- */
/* Case detail                                                                 */
/* -------------------------------------------------------------------------- */

const VerificationDetail = ({
  v,
  onMutated,
}: {
  v: ProviderVerification;
  onMutated: () => void;
}) => {
  const { t, i18n } = useTranslation();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const typeMeta = PROVIDER_TYPE_META[v.providerType];
  const decided = v.status === 'approved' || v.status === 'rejected';

  const doApprove = async () => {
    setBusy(true);
    await verificationService.approve(v.id);
    setBusy(false);
    onMutated();
  };

  const doReject = async () => {
    if (!note.trim()) return;
    setBusy(true);
    await verificationService.reject(v.id, note.trim());
    setBusy(false);
    setNote('');
    onMutated();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-body-sm font-bold text-foreground">{v.providerName}</h3>
          <Badge variant={v.regulatedType ? 'trust' : 'outline'}>{cap(typeMeta.nl)}</Badge>
          {v.regulatedType ? (
            <Badge variant="info">{t('verif_kind_regulated', 'Erkend beroep')}</Badge>
          ) : (
            <Badge variant="outline">{t('verif_kind_coach', 'Coach / begeleider')}</Badge>
          )}
        </div>
        <p className="mt-1 text-label text-muted-foreground">
          {t('verif_submitted', 'Ingediend')}: {formatDate(v.submittedAt, i18n.language)}
        </p>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-5 py-4">
          {decided && <ResultBanner v={v} />}

          {/* Submitted credentials */}
          <section>
            <h4 className="mb-2 text-label font-semibold uppercase tracking-wide text-muted-foreground">
              {t('verif_credentials', 'Ingediende documenten')}
            </h4>
            <div className="space-y-2">
              {v.credentials.map((cred) => (
                <div
                  key={cred.kind}
                  className="rounded-card border border-border bg-card p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-body-sm font-medium text-foreground">{cred.label}</p>
                      {cred.value && (
                        <p className="mt-0.5 font-mono text-label tabular-nums text-muted-foreground">
                          {cred.value}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {cred.kind}
                    </Badge>
                  </div>
                  {/* Doc-preview placeholder */}
                  {cred.fileName && (
                    <div className="mt-2 flex items-center gap-2 rounded-ctl border border-dashed border-border bg-background px-3 py-4 text-label text-muted-foreground">
                      <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{cred.fileName}</span>
                      <span className="ml-auto shrink-0 text-[11px]">
                        {t('verif_preview_stub', 'Voorbeeld — nog niet gekoppeld')}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {v.regulatedType && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                {t(
                  'verif_registry_hint',
                  'Controleer het visum- of erkenningsnummer in het federale register vóór goedkeuring.',
                )}
              </p>
            )}
          </section>

          {/* Decision trail */}
          <section>
            <h4 className="mb-2 text-label font-semibold uppercase tracking-wide text-muted-foreground">
              {t('verif_trail', 'Beslissingsspoor')}
            </h4>
            <ol className="space-y-2">
              {v.events.map((ev) => (
                <li key={ev.id} className="flex gap-2.5 text-body-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-foreground">
                      <span className="font-medium">{ev.action}</span>{' '}
                      <span className="text-muted-foreground">· {ev.actor}</span>
                    </p>
                    {ev.note && <p className="text-muted-foreground">{ev.note}</p>}
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(ev.at, i18n.language)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </ScrollArea>

      {/* Decision panel */}
      {!decided && (
        <div className="space-y-3 border-t border-border px-4 py-3">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t(
              'verif_reject_placeholder',
              'Reden bij afwijzing — deze tekst gaat mee in het bericht aan de hulpverlener',
            )}
            className="min-h-[64px] resize-none text-body-sm"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={doApprove} disabled={busy} className="gap-1.5">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              {t('verif_approve', 'Goedkeuren')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={doReject}
              disabled={busy || !note.trim()}
              className="gap-1.5"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              {t('verif_reject', 'Afwijzen')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Row                                                                         */
/* -------------------------------------------------------------------------- */

const VerificationRow = ({
  v,
  active,
  onSelect,
}: {
  v: ProviderVerification;
  active: boolean;
  onSelect: () => void;
}) => {
  const { i18n } = useTranslation();
  const typeMeta = PROVIDER_TYPE_META[v.providerType];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full flex-col gap-1.5 rounded-card border p-3 text-left transition-colors ${
        active
          ? 'border-primary bg-accent'
          : 'border-border bg-card hover:border-primary/50 hover:bg-accent/40'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-body-sm font-semibold text-foreground">
          {v.providerName}
        </span>
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {formatDate(v.submittedAt, i18n.language)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={v.regulatedType ? 'trust' : 'outline'}>{cap(typeMeta.nl)}</Badge>
        {v.status === 'pending' && <Badge variant="warning">In behandeling</Badge>}
        {v.status === 'approved' && <Badge variant="success">Goedgekeurd</Badge>}
        {v.status === 'rejected' && <Badge variant="destructive">Afgewezen</Badge>}
      </div>
    </button>
  );
};

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

const VerificationQueue = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<ProviderVerification[]>([]);
  const [outbox, setOutbox] = useState<CommsNote[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    void Promise.all([verificationService.list(), verificationService.outbox()]).then(
      ([rows, out]) => {
        setItems(rows);
        setOutbox(out);
        setLoading(false);
      },
    );
  };

  useEffect(() => {
    refresh();
  }, []);

  const pending = useMemo(
    () => items.filter((v) => v.status === 'pending' || v.status === 'needs_info'),
    [items],
  );

  const selected = useMemo(
    () => items.find((v) => v.id === selectedId) ?? null,
    [items, selectedId],
  );

  useEffect(() => {
    if (!selectedId && items.length > 0) {
      setSelectedId((pending[0] ?? items[0]).id);
    }
  }, [items, pending, selectedId]);

  return (
    <DashboardLayout userType="admin">
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-display-md text-foreground">
            {t('verif_title', 'Verificatie')}
          </h1>
          <p className="text-body-sm text-muted-foreground">
            {t(
              'verif_subtitle',
              'Beoordeel ingediende visa, erkenningsnummers en certificaten. De beslissing bepaalt de vertrouwensbadge in de Finder.',
            )}
          </p>
        </div>

        {loading ? (
          <p className="text-body-sm text-muted-foreground">{t('common_loading', 'Laden…')}</p>
        ) : pending.length === 0 && items.length === 0 ? (
          <EmptyState
            bordered
            motif={<LineBranch />}
            title={t('verif_empty_title', 'Geen aanvragen in behandeling')}
            description={t(
              'verif_empty_desc',
              'Zodra een hulpverlener documenten indient, verschijnt de aanvraag hier.',
            )}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-5 xl:col-span-4">
              <div className="mb-2 flex items-center gap-1.5 text-label font-semibold uppercase tracking-wide text-muted-foreground">
                <ShieldQuestion className="h-3.5 w-3.5" aria-hidden="true" />
                {t('verif_list_title', 'Aanvragen')}
                {pending.length > 0 && (
                  <Badge variant="warning" className="ml-1">
                    {pending.length}
                  </Badge>
                )}
              </div>
              <ScrollArea className="h-[62vh] pr-1">
                <div className="space-y-2">
                  {items.map((v) => (
                    <VerificationRow
                      key={v.id}
                      v={v}
                      active={v.id === selectedId}
                      onSelect={() => setSelectedId(v.id)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="lg:col-span-7 xl:col-span-8">
              <div className="min-h-[62vh] rounded-card border border-border bg-card">
                {selected ? (
                  <VerificationDetail v={selected} onMutated={refresh} />
                ) : (
                  <div className="flex h-full min-h-[62vh] items-center justify-center p-8 text-center">
                    <p className="text-body-sm text-muted-foreground">
                      {t('verif_select', 'Kies een aanvraag links')}
                    </p>
                  </div>
                )}
              </div>

              {/* Mock comms outbox — rejection notes that were "sent" */}
              {outbox.length > 0 && (
                <div className="mt-4 rounded-card border border-border bg-card p-4">
                  <h4 className="mb-2 text-label font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('verif_outbox', 'Verzonden berichten (mock)')}
                  </h4>
                  <ul className="space-y-2">
                    {outbox.map((note) => (
                      <li key={note.id} className="rounded-ctl border border-border bg-background p-3">
                        <p className="text-body-sm font-medium text-foreground">
                          {note.subject} · {note.to}
                        </p>
                        <p className="mt-1 whitespace-pre-line text-label text-muted-foreground">
                          {note.body}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default VerificationQueue;
