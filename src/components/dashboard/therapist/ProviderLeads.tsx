/**
 * ProviderLeads — the therapist/coach "New client requests" inbox for the
 * Bondable Finder. Lists incoming Finder leads addressed to the signed-in
 * provider (finderService.listRequestsForProvider) with topic, message,
 * preferred modality and date, plus Accept / Decline actions
 * (finderService.respondToRequest).
 *
 * WHAT WAS MISSING: accepting a lead did nothing for the person who wrote it.
 * Every lead now carries a THREAD (leadThreadService), so this inbox can send a
 * real answer back — which is the only thing that actually helps the client and
 * the only thing that stops the 48h clock.
 *
 * The 48h ageing chip is deliberately quiet: it is a nudge for the provider,
 * never a shaming device, and it never reorders anything (referral-neutral —
 * leads are newest-first only, no payment-based prioritisation, no "promoted"
 * placement).
 *
 * Design: light deep-teal brand TOKENS only (bg-card, text-foreground,
 * border-border, bg-primary). MINT IS AI-ONLY and is not used here. shadcn/ui +
 * lucide-react. New copy via t('key','NL default'). Runs on a dev MOCK, so
 * empty / loading / error states are all handled gracefully.
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
  Clock,
  CornerUpLeft,
  Send,
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
import { Textarea } from '@/components/ui/textarea';
import { useAuthManager } from '@/hooks/api/useAuthManager';
import {
  finderService,
  type ProviderRequest,
} from '@/services/api/finderService';
import {
  leadThreadService,
  LEAD_EMAIL_TEMPLATE,
  LEAD_SLA_MS,
  type LeadThread,
} from '@/services/api/leadThreadService';

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

const HOUR = 60 * 60 * 1000;

/** Hours a lead has been waiting, or null when the date is unusable. */
const hoursWaiting = (createdAt: string | null): number | null => {
  if (!createdAt) return null;
  const ms = Date.now() - new Date(createdAt).getTime();
  return Number.isFinite(ms) ? Math.max(0, Math.round(ms / HOUR)) : null;
};

/* -------------------------------------------------------------------------- */
/* Single lead row                                                             */
/* -------------------------------------------------------------------------- */

interface LeadCardProps {
  lead: ProviderRequest;
  /** The two-sided thread for this lead, if one was opened. */
  thread: LeadThread | null;
  busy: boolean;
  onRespond: (id: string, status: 'accepted' | 'declined') => void;
  /** Appends a provider message to the thread. Resolves true on success. */
  onReply: (threadId: string, body: string) => Promise<boolean>;
  /**
   * False for threads whose backing request row is gone (the mock
   * provider_requests table is in-memory and empties on reload). Answering the
   * person still works; accept/decline has nothing to write to.
   */
  canRespond?: boolean;
}

const LeadCard = ({
  lead,
  thread,
  busy,
  onRespond,
  onReply,
  canRespond = true,
}: LeadCardProps) => {
  const { t, i18n } = useTranslation();

  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  const answered = thread?.messages.some((m) => m.from === 'provider') ?? false;
  const waited = hoursWaiting(lead.createdAt);
  const overdue = !answered && waited !== null && waited * HOUR > LEAD_SLA_MS;

  const submitReply = async () => {
    const body = replyText.trim();
    if (!thread || !body || replying) return;
    setReplying(true);
    const ok = await onReply(thread.id, body);
    setReplying(false);
    if (ok) {
      setReplyText('');
      setReplyOpen(false);
    }
  };

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
            {answered && (
              <Badge variant="success">
                {t('finder_lead_status_answered', 'Beantwoord')}
              </Badge>
            )}
            {/* Quiet 48h ageing — a nudge, never a ranking signal. */}
            {!answered && waited !== null && (
              <Badge variant={overdue ? 'warning' : 'outline'}>
                <Clock className="mr-1 h-3 w-3" aria-hidden="true" />
                {overdue
                  ? t('finder_lead_age_over', 'Meer dan 48 u onbeantwoord')
                  : t('finder_lead_age', '{{hours}} u onderweg', { hours: waited })}
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

          {/* Everything already said in this thread, so a reply has context. */}
          {thread && thread.messages.length > 1 && (
            <ol className="mt-3 space-y-2 border-l border-border pl-3">
              {thread.messages.slice(1).map((m) => (
                <li key={m.id}>
                  <p className="text-xs font-medium text-muted-foreground">
                    {m.from === 'provider'
                      ? t('finder_lead_thread_you', 'Jij')
                      : lead.clientName ??
                        t('finder_lead_anonymous', 'Nieuwe aanvraag')}
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {m.body}
                  </p>
                </li>
              ))}
            </ol>
          )}

          {/* Actions */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {isPending && canRespond && (
              <>
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
              </>
            )}
            {thread && !replyOpen && (
              <Button
                type="button"
                size="sm"
                variant={isPending && canRespond ? 'ghost' : 'default'}
                onClick={() => setReplyOpen(true)}
                className="gap-1.5"
              >
                <CornerUpLeft className="h-4 w-4" aria-hidden="true" />
                {answered
                  ? t('finder_lead_reply_again', 'Nog iets schrijven')
                  : t('finder_lead_reply', 'Antwoorden')}
              </Button>
            )}
          </div>

          {/* Reply composer — the thing that actually closes the loop. */}
          {thread && replyOpen && (
            <div className="mt-3 rounded-ctl border border-border bg-background p-3">
              <label
                htmlFor={`lead-reply-${lead.id}`}
                className="text-xs font-medium text-muted-foreground"
              >
                {t('finder_lead_reply_label', 'Je antwoord')}
              </label>
              <Textarea
                id={`lead-reply-${lead.id}`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={3}
                disabled={replying}
                placeholder={t(
                  'finder_lead_reply_ph',
                  'Bijvoorbeeld: of je plaats hebt, wanneer een eerste gesprek kan, en wat de cliënt mag verwachten.',
                )}
                className="mt-2 resize-none border-border bg-card text-foreground placeholder:text-muted-foreground"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {t(
                    'finder_lead_reply_note',
                    'Je antwoord verschijnt op de persoonlijke gesprekspagina van de cliënt.',
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={replying}
                    onClick={() => {
                      setReplyOpen(false);
                      setReplyText('');
                    }}
                  >
                    {t('finder_lead_reply_cancel', 'Annuleren')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={replying || !replyText.trim()}
                    onClick={() => void submitReply()}
                    className="gap-1.5"
                  >
                    {replying ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Send className="h-4 w-4" aria-hidden="true" />
                    )}
                    {t('finder_lead_reply_send', 'Antwoord versturen')}
                  </Button>
                </div>
              </div>
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
  /** Threads keyed by the finder request id they belong to. */
  const [threads, setThreads] = useState<Record<string, LeadThread>>({});
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
      const [data, threadList] = await Promise.all([
        finderService.listRequestsForProvider(providerId),
        leadThreadService.listForProvider(providerId),
      ]);
      setLeads(data);
      setThreads(
        Object.fromEntries(threadList.map((th) => [th.requestId, th])),
      );
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
          // HONEST: accepting only marks the lead. Nothing reaches the client
          // until you write to them, so the toast asks for exactly that.
          toast.success(
            t('finder_lead_accepted_toast', 'Aanvraag geaccepteerd'),
            {
              description: lead?.clientName
                ? t(
                    'finder_lead_accepted_desc_named',
                    '{{name}} weet dit pas als je antwoordt. Schrijf een kort bericht met wat mogelijk is.',
                    { name: lead.clientName },
                  )
                : t(
                    'finder_lead_accepted_desc',
                    'De cliënt weet dit pas als je antwoordt. Schrijf een kort bericht met wat mogelijk is.',
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

  const handleReply = useCallback(
    async (threadId: string, body: string): Promise<boolean> => {
      try {
        const next = await leadThreadService.addMessage(threadId, 'provider', body);
        if (!next) return false;
        setThreads((cur) => ({ ...cur, [next.requestId]: next }));
        // STUB — queueEmail only appends to the local outbox. The message is
        // already live on the client's thread page; the mail is the nice-to-have.
        await leadThreadService.queueEmail({
          to: next.clientEmail,
          template: LEAD_EMAIL_TEMPLATE.clientReply,
          vars: {
            clientName: next.clientName,
            providerName: next.providerName,
            threadId: next.id,
          },
        });
        toast.success(t('finder_lead_reply_sent', 'Je antwoord staat klaar'), {
          description: t(
            'finder_lead_reply_sent_desc',
            '{{name}} leest het op de gesprekspagina. Er vertrekt in deze demo nog geen e-mail.',
            { name: next.clientName },
          ),
        });
        return true;
      } catch {
        toast.error(t('finder_lead_error_toast', 'Er ging iets mis'), {
          description: t(
            'finder_lead_reply_error_desc',
            'Je antwoord kon niet worden toegevoegd. Probeer het opnieuw.',
          ),
        });
        return false;
      }
    },
    [t],
  );

  /**
   * Accepted leads whose client is still waiting for a first word. Without this
   * section an accepted lead would drop out of the inbox unanswered — the exact
   * dead end this whole path exists to remove.
   */
  const awaitingReply = leads.filter(
    (l) =>
      l.status === 'accepted' &&
      threads[l.id] &&
      !threads[l.id].messages.some((m) => m.from === 'provider'),
  );

  /**
   * Threads whose backing request row is gone. The mock provider_requests table
   * lives in memory and empties on reload, while threads persist — without this
   * a client who wrote yesterday would silently vanish from the inbox. Rendered
   * read-only from the thread itself; accept/decline is not offered because
   * there is no row to write to.
   */
  const knownRequestIds = new Set(leads.map((l) => l.id));
  const orphanThreads = Object.values(threads).filter(
    (th) => !knownRequestIds.has(th.requestId),
  );
  const orphanLeads: ProviderRequest[] = orphanThreads.map((th) => ({
    id: th.requestId,
    providerId: th.providerId,
    clientId: null,
    clientName: th.clientName,
    clientEmail: th.clientEmail,
    topic: th.topic,
    message: th.messages[0]?.body ?? null,
    preferredModality: null,
    status: 'pending',
    createdAt: th.createdAt,
    respondedAt: null,
  }));

  const pending = [...leads.filter((l) => l.status === 'pending'), ...orphanLeads].sort(
    (a, b) =>
      new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
  );
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
            'Aanvragen via de Bondable Finder. Een antwoord binnen 48 uur is wat we cliënten beloven.',
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
        {!loading && !error && pending.length === 0 && awaitingReply.length === 0 && (
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
                  thread={threads[lead.id] ?? null}
                  busy={busyId === lead.id}
                  onRespond={handleRespond}
                  onReply={handleReply}
                  canRespond={knownRequestIds.has(lead.id)}
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

        {/* Accepted, but the client has not heard a word yet. */}
        {!loading && !error && awaitingReply.length > 0 && (
          <div className={pending.length > 0 ? 'mt-6' : ''}>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {t(
                'finder_leads_awaiting_title',
                'Geaccepteerd, nog geen antwoord geschreven',
              )}
            </p>
            <ul className="space-y-3">
              {awaitingReply.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  thread={threads[lead.id] ?? null}
                  busy={busyId === lead.id}
                  onRespond={handleRespond}
                  onReply={handleReply}
                />
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProviderLeads;
