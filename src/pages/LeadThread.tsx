/**
 * LeadThread — the PUBLIC reply page for a Finder lead (`/lead/:token`).
 *
 * A visitor contacts a hulpverlener without an account. The link they keep
 * lands here: the question they asked, the answer when it comes, and a box to
 * write back. No account, no password, no wall.
 *
 * WHY THE THREAD IS HERE AND NOT IN THEIR MAILBOX: what people write on this
 * page is special-category health content (GDPR art. 9). Keeping it in the
 * platform keeps it out of plain e-mail, keeps the 48h afspraak visible, and
 * keeps the record in one place.
 *
 * Standalone chrome (slim top bar + footer, NO DashboardLayout) like
 * PracticeInviteAccept / Pricing. `noIndex` is non-negotiable: the token in the
 * URL is the only thing guarding this content, so it must never be indexed.
 *
 * No mint anywhere — this is a lead/finder surface, not an AI surface.
 *
 * The parent wires the route: /lead/:token -> LeadThread @ @/pages/LeadThread.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Lock, Phone, Send, Loader2 } from 'lucide-react';

import Seo from '@/components/seo/Seo';
import EmptyState from '@/components/ui/empty-state';
import LineMeet from '@/components/illustration/LineMeet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/ui/use-toast';
import {
  leadThreadService,
  LEAD_EMAIL_TEMPLATE,
  isOverdue,
  type LeadThread as LeadThreadRecord,
} from '@/services/api/leadThreadService';

/* -------------------------------------------------------------------------- */
/* Small pieces                                                                */
/* -------------------------------------------------------------------------- */

const CrisisLine = () => {
  const { t } = useTranslation();
  return (
    <div className="rounded-ctl border border-border bg-card p-3">
      <p className="text-body-sm text-muted-foreground">
        {t(
          'lead_thread_crisis',
          'Bondable is geen noodhulp. Als het nu niet veilig voelt, bel dan meteen.',
        )}
      </p>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-foreground">
        <span className="inline-flex items-center gap-1">
          <Phone className="h-3.5 w-3.5" aria-hidden="true" />
          1813 (BE)
        </span>
        <span className="inline-flex items-center gap-1">
          <Phone className="h-3.5 w-3.5" aria-hidden="true" />
          113 (NL)
        </span>
        <span className="inline-flex items-center gap-1 text-destructive">
          <Phone className="h-3.5 w-3.5" aria-hidden="true" />
          112
        </span>
      </p>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

const LeadThread = () => {
  const { t, i18n } = useTranslation();
  const { token } = useParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [thread, setThread] = useState<LeadThreadRecord | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      const found = await leadThreadService.getByToken(token);
      if (!active) return;
      setThread(found);
      setLoading(false);
      if (found) void leadThreadService.markRead(token, 'client');
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const stamp = useCallback(
    (iso: string): string => {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '';
      return d.toLocaleDateString(i18n.language || undefined, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    },
    [i18n.language],
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = reply.trim();
    if (!thread || !body || sending) return;
    setSending(true);
    try {
      const next = await leadThreadService.addMessage(thread.token, 'client', body);
      if (next) {
        setThread(next);
        setReply('');
        // Stub only — nothing is sent. See leadThreadService.queueEmail.
        await leadThreadService.queueEmail({
          to: `provider:${next.providerId}`,
          template: LEAD_EMAIL_TEMPLATE.providerNewLead,
          vars: {
            providerName: next.providerName,
            clientName: next.clientName,
            threadId: next.id,
          },
        });
        toast({
          title: t('lead_thread_sent_title', 'Je bericht staat in het gesprek'),
          description: t(
            'lead_thread_sent_desc',
            '{{provider}} ziet het bij de volgende keer dat de aanvragen bekeken worden.',
            { provider: next.providerName },
          ),
        });
      }
    } catch (err) {
      console.error('[LeadThread] addMessage failed:', err);
      toast({
        title: t('lead_thread_error_title', 'Versturen mislukt'),
        description: t(
          'lead_thread_error_desc',
          'Je bericht kon niet worden toegevoegd. Probeer het opnieuw.',
        ),
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const answered = thread?.messages.some((m) => m.from === 'provider') ?? false;
  const overdue = thread ? isOverdue(thread) : false;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Seo
        title={t('lead_thread_seo_title', 'Je gesprek')}
        description={t(
          'lead_thread_seo_desc',
          'Je persoonlijke gesprek met een hulpverlener op Bondable.',
        )}
        path={token ? `/lead/${token}` : '/lead'}
        noIndex
      />

      {/* Slim public top bar — same grammar as de andere publieke pagina's. */}
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/favicon.ico" alt="" className="h-8 w-8" />
            <span className="text-lg font-semibold tracking-tight text-primary">
              Bondable
            </span>
          </Link>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {t('lead_thread_private', 'Privégesprek via je persoonlijke link')}
          </span>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
          {loading ? (
            <div className="rounded-card border border-border bg-card p-8 text-center text-muted-foreground">
              {t('loading', 'Even geduld…')}
            </div>
          ) : !thread ? (
            /* --------------------- Unknown / expired token ------------------ */
            <>
              <EmptyState
                bordered
                motif={<LineMeet />}
                title={t('lead_thread_missing_title', 'We vinden dit gesprek niet')}
                description={t(
                  'lead_thread_missing_body',
                  'Deze link klopt niet meer, of het gesprek staat op een ander toestel. Je kan gerust opnieuw contact opnemen — je verliest niets.',
                )}
                action={
                  <Button asChild size="lg">
                    <Link to="/find">
                      {t('lead_thread_missing_cta', 'Zoek een hulpverlener')}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                }
              />
              <div className="mt-6">
                <CrisisLine />
              </div>
            </>
          ) : (
            /* ------------------------------ Thread -------------------------- */
            <>
              <div className="mb-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{thread.providerName}</Badge>
                  {thread.topic ? (
                    <Badge variant="secondary">{thread.topic}</Badge>
                  ) : null}
                  {answered ? (
                    <Badge variant="success">
                      {t('lead_thread_badge_answered', 'Beantwoord')}
                    </Badge>
                  ) : (
                    <Badge variant={overdue ? 'warning' : 'info'}>
                      {overdue
                        ? t('lead_thread_badge_late', 'Langer dan 48 uur onderweg')
                        : t('lead_thread_badge_waiting', 'In behandeling')}
                    </Badge>
                  )}
                </div>

                <h1 className="mt-4 font-display text-display-md text-foreground">
                  {t('lead_thread_title', 'Je gesprek met {{provider}}', {
                    provider: thread.providerName,
                  })}
                </h1>
                <p className="mt-2 max-w-xl text-body-sm text-muted-foreground">
                  {answered
                    ? t(
                        'lead_thread_intro_answered',
                        'Je hebt antwoord. Alles blijft hier staan, zodat je het rustig kan herlezen en verder kan schrijven.',
                      )
                    : overdue
                      ? t(
                          'lead_thread_intro_late',
                          'Je aanvraag staat er langer dan 48 uur. Dat is langer dan de afspraak. Je mag gerust iets bijschrijven, of een andere hulpverlener aanschrijven.',
                        )
                      : t(
                          'lead_thread_intro_waiting',
                          '{{provider}} antwoordt meestal binnen 48 uur. Zodra er een antwoord is, verschijnt het hier.',
                          { provider: thread.providerName },
                        )}
                </p>
              </div>

              {/* Messages */}
              <ol className="space-y-3">
                {thread.messages.map((m) => {
                  const mine = m.from === 'client';
                  return (
                    <li
                      key={m.id}
                      className={
                        mine
                          ? 'rounded-card border border-border bg-card p-4'
                          : 'rounded-card border border-primary/30 bg-secondary/40 p-4'
                      }
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {mine
                            ? t('lead_thread_from_you', 'Jij')
                            : thread.providerName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {stamp(m.at)}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-body-sm leading-relaxed text-foreground/90">
                        {m.body}
                      </p>
                    </li>
                  );
                })}
              </ol>

              {!answered && (
                <div className="mt-3 rounded-card border border-dashed border-border bg-card p-4">
                  <p className="text-body-sm text-muted-foreground">
                    {t(
                      'lead_thread_pending_note',
                      'Er is nog geen antwoord. Je hoeft niets te doen — deze pagina blijft van jou.',
                    )}
                  </p>
                </div>
              )}

              {/* Composer */}
              <form
                onSubmit={handleSend}
                className="mt-6 rounded-card border border-border bg-card p-4"
              >
                <label
                  htmlFor="lead-reply"
                  className="text-sm font-medium text-foreground"
                >
                  {t('lead_thread_composer_label', 'Iets toevoegen')}
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(
                    'lead_thread_composer_hint',
                    'Wat je hier schrijft blijft tussen jou en {{provider}}.',
                    { provider: thread.providerName },
                  )}
                </p>
                <Textarea
                  id="lead-reply"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  disabled={sending}
                  placeholder={t(
                    'lead_thread_composer_ph',
                    'Bijvoorbeeld: wanneer je beschikbaar bent, of iets dat je nog wil meegeven.',
                  )}
                  className="mt-3 resize-none border-border bg-background text-foreground placeholder:text-muted-foreground"
                />
                <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    {t(
                      'lead_thread_composer_note',
                      'Je bericht komt in de aanvragen van de hulpverlener terecht.',
                    )}
                  </p>
                  <Button type="submit" disabled={sending || !reply.trim()}>
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Send className="h-4 w-4" aria-hidden="true" />
                    )}
                    {t('lead_thread_composer_submit', 'Versturen')}
                  </Button>
                </div>
              </form>

              {/* Quiet safety line — always present on a contact surface. */}
              <div className="mt-6">
                <CrisisLine />
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
          <p className="text-xs text-muted-foreground">
            {t(
              'lead_thread_footer',
              'Deze pagina is alleen bereikbaar met jouw persoonlijke link en wordt niet door zoekmachines getoond.',
            )}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LeadThread;
