/**
 * ProviderLeads — the therapist/coach "New client requests" inbox for the
 * Bondable Finder. Lists incoming Finder leads addressed to the signed-in
 * provider (finderService.listRequestsForProvider) with topic, message,
 * preferred modality and date, plus Accept / Decline actions
 * (finderService.respondToRequest).
 *
 * Design: light deep-teal + mint brand TOKENS only (bg-card, text-foreground,
 * border-border, bg-primary). shadcn/ui + lucide-react. New copy via
 * t('key','English default'). Runs on a dev MOCK, so empty / loading / error
 * states are all handled gracefully.
 *
 * REFERRAL-NEUTRAL by design: leads are shown newest-first only — there is no
 * payment-based prioritisation and no "promoted" placement.
 */

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Inbox,
  Check,
  X,
  Loader2,
  Monitor,
  MapPin,
  Calendar as CalendarIcon,
  Mail,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthManager } from '@/hooks/api/useAuthManager';
import {
  finderService,
  type ProviderRequest,
} from '@/services/api/finderService';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const initialsOf = (name: string | null): string => {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
};

/* -------------------------------------------------------------------------- */
/* Single lead row                                                             */
/* -------------------------------------------------------------------------- */

interface LeadCardProps {
  lead: ProviderRequest;
  busy: boolean;
  onRespond: (id: string, status: 'accepted' | 'declined') => void;
}

const LeadCard = ({ lead, busy, onRespond }: LeadCardProps) => {
  const { t, i18n } = useTranslation();

  const modalityLabel = (m: string | null): string => {
    if (m === 'online') return t('finder_modality_online', 'Online');
    if (m === 'in_person') return t('finder_modality_in_person', 'Op locatie');
    return m ?? t('finder_modality_any', 'Geen voorkeur');
  };

  const dateLabel = lead.createdAt
    ? new Date(lead.createdAt).toLocaleDateString(i18n.language || undefined, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const isPending = lead.status === 'pending';
  const isAccepted = lead.status === 'accepted';

  return (
    <li className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
      <div className="flex items-start gap-3">
        {/* Avatar (initials) */}
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-primary"
          aria-hidden="true"
        >
          {initialsOf(lead.clientName)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">
              {lead.clientName ??
                t('finder_lead_anonymous', 'Nieuwe aanvraag')}
            </p>
            {lead.topic && (
              <Badge variant="secondary" className="font-medium">
                {lead.topic}
              </Badge>
            )}
            {!isPending && (
              <Badge variant={isAccepted ? 'default' : 'outline'}>
                {isAccepted
                  ? t('finder_lead_status_accepted', 'Geaccepteerd')
                  : t('finder_lead_status_declined', 'Afgewezen')}
              </Badge>
            )}
          </div>

          {/* Meta line: modality + date + email */}
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              {lead.preferredModality === 'online' ? (
                <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {modalityLabel(lead.preferredModality)}
            </span>
            {dateLabel && (
              <span className="inline-flex items-center gap-1">
                <CalendarIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {dateLabel}
              </span>
            )}
            {lead.clientEmail && (
              <span className="inline-flex items-center gap-1 truncate">
                <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{lead.clientEmail}</span>
              </span>
            )}
          </div>

          {/* Message */}
          {lead.message && (
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">
              {lead.message}
            </p>
          )}

          {/* Actions (pending only) */}
          {isPending && (
            <div className="mt-3 flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => onRespond(lead.id, 'accepted')}
                className="gap-1.5"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="h-4 w-4" aria-hidden="true" />
                )}
                {t('finder_lead_accept', 'Accepteren')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => onRespond(lead.id, 'declined')}
                className="gap-1.5"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                {t('finder_lead_decline', 'Afwijzen')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
};

/* -------------------------------------------------------------------------- */
/* Inbox                                                                       */
/* -------------------------------------------------------------------------- */

interface ProviderLeadsProps {
  /** Max leads to show; the rest are hinted with a counter. Default: all. */
  limit?: number;
}

const ProviderLeads = ({ limit }: ProviderLeadsProps) => {
  const { t } = useTranslation();
  const { user } = useAuthManager();
  const providerId = user?.id ?? '';

  const [leads, setLeads] = useState<ProviderRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!providerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const data = await finderService.listRequestsForProvider(providerId);
      setLeads(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRespond = useCallback(
    async (id: string, status: 'accepted' | 'declined') => {
      setBusyId(id);
      // Optimistic update so the UI feels instant on the mock backend.
      const previous = leads;
      const lead = leads.find((l) => l.id === id);
      setLeads((cur) =>
        cur.map((l) =>
          l.id === id
            ? { ...l, status, respondedAt: new Date().toISOString() }
            : l,
        ),
      );
      try {
        await finderService.respondToRequest(id, status);
        if (status === 'accepted') {
          toast.success(
            t('finder_lead_accepted_toast', 'Cliënt verbonden'),
            {
              description: lead?.clientName
                ? t(
                    'finder_lead_accepted_desc_named',
                    '{{name}} is op de hoogte gebracht. Je kunt nu een eerste afspraak plannen.',
                    { name: lead.clientName },
                  )
                : t(
                    'finder_lead_accepted_desc',
                    'De cliënt is op de hoogte gebracht. Je kunt nu een eerste afspraak plannen.',
                  ),
            },
          );
        } else {
          toast(
            t('finder_lead_declined_toast', 'Aanvraag afgewezen'),
            {
              description: t(
                'finder_lead_declined_desc',
                'De aanvraag is verwijderd uit je inbox.',
              ),
            },
          );
        }
      } catch {
        // Roll back the optimistic change on failure.
        setLeads(previous);
        toast.error(
          t('finder_lead_error_toast', 'Er ging iets mis'),
          {
            description: t(
              'finder_lead_error_desc',
              'Kon de aanvraag niet bijwerken. Probeer het opnieuw.',
            ),
          },
        );
      } finally {
        setBusyId(null);
      }
    },
    [leads, t],
  );

  const pending = leads.filter((l) => l.status === 'pending');
  const visible = typeof limit === 'number' ? pending.slice(0, limit) : pending;
  const hiddenCount = pending.length - visible.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">
              <Inbox className="h-4 w-4" aria-hidden="true" />
            </span>
            <CardTitle className="text-base">
              {t('finder_leads_title', 'Nieuwe cliëntaanvragen')}
            </CardTitle>
          </div>
          {pending.length > 0 && (
            <Badge variant="default" aria-label={String(pending.length)}>
              {pending.length}
            </Badge>
          )}
        </div>
        <CardDescription>
          {t(
            'finder_leads_subtitle',
            'Aanvragen via de Bondable Finder. Geaccepteerd = cliënt verbonden.',
          )}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Loading */}
        {loading && (
          <div className="space-y-3" aria-busy="true">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-xl border border-border bg-muted/40 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t(
                'finder_leads_error',
                'Kon aanvragen niet laden. Probeer het later opnieuw.',
              )}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => void load()}
            >
              {t('finder_leads_retry', 'Opnieuw proberen')}
            </Button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && pending.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary">
              <Inbox className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="text-sm font-medium text-foreground">
              {t('finder_leads_empty_title', 'Geen nieuwe aanvragen')}
            </p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              {t(
                'finder_leads_empty_desc',
                'Nieuwe aanvragen via de Finder verschijnen hier. Zorg dat je openbaar profiel gepubliceerd is om gevonden te worden.',
              )}
            </p>
          </div>
        )}

        {/* List */}
        {!loading && !error && pending.length > 0 && (
          <>
            <ul className="space-y-3">
              {visible.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  busy={busyId === lead.id}
                  onRespond={handleRespond}
                />
              ))}
            </ul>
            {hiddenCount > 0 && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {t(
                  'finder_leads_more',
                  '+{{count}} meer aanvragen',
                  { count: hiddenCount },
                )}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ProviderLeads;
