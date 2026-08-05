/**
 * RequestProviderDialog — the Finder CONVERSION moment.
 *
 * A reassuring, accessible "Aanvraag / Contact" form shared by the directory
 * cards, the public provider profile page, and the match cards. On submit it
 *   1. creates the Finder lead (finderService.createRequest),
 *   2. opens a two-sided lead thread (leadThreadService.createThread) so the
 *      hulpverlener has somewhere to REPLY and the visitor has somewhere to
 *      read that reply,
 *   3. queues the two stub e-mails (provider: new lead / client: confirmation
 *      with the link) — QUEUES, does not send. See leadThreadService.queueEmail.
 *
 * NO SIGNUP WALL. Someone reaching out on a bad day must not hit a password
 * form first. Name + e-mail are needed to answer them anyway; that becomes a
 * link to their thread. A password is offered AFTER sending, optional and
 * dismissible.
 *
 * HONESTY RULE FOR THIS FILE: e-mail is stubbed in this build, so nothing here
 * may claim an e-mail arrived or that an account was created. The success state
 * hands over the actual link and says plainly that no mail goes out yet.
 *
 * Brand: light deep-teal tokens only. bg-background/card/muted,
 * text-foreground/muted-foreground, border-border, rounded-ctl/rounded-card.
 * MINT IS AI-ONLY (Bond) and is never used on this finder surface. Destructive
 * red only for inline field errors. All copy via t(key, default); we never edit
 * src/locales/*.json.
 *
 * Referral-neutral by design: a pure intent-to-contact form. Price is never a
 * reason to pick a provider and there is no "promoted" framing anywhere.
 *
 * Graceful on the dev mock: provider may be null while the parent loads; the
 * submit button stays disabled until a provider is present.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  Link2,
  Loader2,
  Mail,
  MessageSquareHeart,
  ShieldCheck,
  X as XIcon,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/ui/use-toast';
import { useAuth, isBypassAvailable } from '@/hooks/api/useAuthManager';
import { finderService, type Modality, type Provider } from '@/services/api/finderService';
import {
  leadThreadService,
  leadThreadUrl,
  LEAD_EMAIL_TEMPLATE,
} from '@/services/api/leadThreadService';

/* -------------------------------------------------------------------------- */
/* Props                                                                       */
/* -------------------------------------------------------------------------- */

export interface RequestProviderDialogProps {
  /**
   * The provider being contacted. Accepts the full Provider or just the fields
   * this dialog needs, so directory cards / match cards can pass a lean object.
   * May be null while the parent is still loading.
   */
  provider: Pick<Provider, 'id' | 'fullName' | 'modalities'> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional: prefill the topic (e.g. a specialization tapped on a card). */
  defaultTopic?: string;
  /** Optional: fired after a request is successfully created. */
  onSubmitted?: () => void;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ModalityChoice = Modality | 'any';

type FieldErrors = {
  name?: string;
  email?: string;
  message?: string;
};

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

const RequestProviderDialog = ({
  provider,
  open,
  onOpenChange,
  defaultTopic,
  onSubmitted,
}: RequestProviderDialogProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();

  const isLoggedIn = Boolean(user);

  // Sensible defaults derived from the logged-in client (if any).
  const defaultName = useMemo(() => {
    if (!user) return '';
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const full = typeof meta.full_name === 'string' ? meta.full_name.trim() : '';
    if (full) return full;
    const first = typeof meta.first_name === 'string' ? meta.first_name : '';
    const last = typeof meta.last_name === 'string' ? meta.last_name : '';
    return [first, last].filter(Boolean).join(' ').trim();
  }, [user]);
  const defaultEmail = useMemo(() => user?.email ?? '', [user]);

  // Provider display name — null/loading-safe.
  const providerName = provider?.fullName?.trim()
    || t('finder_request_provider_fallback', 'deze hulpverlener');

  // The modalities this provider offers; fall back to the standard two.
  const modalityOptions: Modality[] = useMemo(() => {
    const offered = (provider?.modalities ?? []).filter(Boolean);
    return offered.length ? offered : ['in_person', 'online'];
  }, [provider]);

  const modalityLabel = (m: Modality): string =>
    m === 'online'
      ? t('finder_request_modality_online', 'Online')
      : m === 'in_person'
        ? t('finder_request_modality_in_person', 'Op locatie')
        : m;

  /* --------------------------- Form state ------------------------------- */
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [modality, setModality] = useState<ModalityChoice>('any');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  /** The magic link to the client's own thread — the thing that replaces mail. */
  const [threadUrl, setThreadUrl] = useState('');
  const [copied, setCopied] = useState(false);
  /** The account offer is post-hoc and dismissible. Never a gate. */
  const [accountOfferDismissed, setAccountOfferDismissed] = useState(false);

  // Reset / seed the form whenever the dialog (re)opens or its inputs change.
  useEffect(() => {
    if (!open) return;
    setName(defaultName);
    setEmail(defaultEmail);
    setTopic(defaultTopic ?? '');
    setMessage('');
    setModality('any');
    setErrors({});
    setSubmitting(false);
    setSent(false);
    setThreadUrl('');
    setCopied(false);
    setAccountOfferDismissed(false);
  }, [open, defaultName, defaultEmail, defaultTopic]);

  /** Bond lives behind the client dashboard in demo mode; /wachtruimte otherwise. */
  const coachHref = isBypassAvailable() ? '/dashboard/client/bond' : '/wachtruimte';

  const copyThreadUrl = async () => {
    if (!threadUrl) return;
    try {
      await navigator.clipboard.writeText(threadUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the link stays visible and selectable.
      toast({
        title: t('finder_request_copy_failed', 'Kopiëren lukte niet'),
        description: t(
          'finder_request_copy_failed_desc',
          'Selecteer de link hierboven en kopieer ze zelf.',
        ),
      });
    }
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!name.trim()) {
      next.name = t('finder_request_err_name', 'Vul je naam in.');
    }
    if (!email.trim()) {
      next.email = t('finder_request_err_email_required', 'Vul je e-mailadres in.');
    } else if (!EMAIL_RE.test(email.trim())) {
      next.email = t('finder_request_err_email_invalid', 'Vul een geldig e-mailadres in.');
    }
    if (!message.trim()) {
      next.message = t(
        'finder_request_err_message',
        'Schrijf een kort bericht zodat we je kunnen helpen.',
      );
    }
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider || submitting) return;

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      const request = await finderService.createRequest({
        providerId: provider.id,
        clientId: user?.id ?? null,
        clientName: name.trim(),
        clientEmail: email.trim(),
        topic: topic.trim() || undefined,
        message: message.trim(),
        preferredModality: modality === 'any' ? undefined : modality,
      });

      // The lead alone is a dead end: without a thread the hulpverlener has
      // nowhere to answer and the visitor has nowhere to read the answer.
      const thread = await leadThreadService.createThread({
        requestId: request.id,
        providerId: provider.id,
        providerName: providerName,
        clientName: name.trim(),
        clientEmail: email.trim(),
        topic: topic.trim() || null,
        message: message.trim(),
      });
      const url = leadThreadUrl(thread.token);
      setThreadUrl(url);

      // STUBS. queueEmail appends to a local outbox and returns — nothing is
      // sent. The success state below says so out loud.
      await leadThreadService.queueEmail({
        to: `provider:${provider.id}`,
        template: LEAD_EMAIL_TEMPLATE.providerNewLead,
        vars: {
          providerName,
          clientName: name.trim(),
          topic: topic.trim(),
          threadId: thread.id,
        },
      });
      await leadThreadService.queueEmail({
        to: email.trim(),
        template: LEAD_EMAIL_TEMPLATE.clientConfirmation,
        vars: {
          clientName: name.trim(),
          providerName,
          threadUrl: url,
        },
      });

      setSent(true);
      onSubmitted?.();
    } catch (err) {
      console.error('[RequestProviderDialog] createRequest failed:', err);
      toast({
        title: t('finder_request_error_title', 'Versturen mislukt'),
        description: t(
          'finder_request_error_desc',
          'Er ging iets mis bij het versturen van je aanvraag. Probeer het opnieuw.',
        ),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        {sent ? (
          /* ----------------------------- SUCCESS --------------------------- */
          /* Honest by construction: it states what happened (a request was
             filed), what will happen (an answer, usually within 48h), and where
             it will land (this link). It never claims an e-mail arrived or an
             account was made, because neither is true in this build. */
          <div className="py-2">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>

            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="text-foreground">
                {t('finder_request_success_title', 'Je aanvraag is verstuurd.')}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {t(
                  'finder_request_success_desc',
                  '{{provider}} antwoordt meestal binnen 48 uur. Het gesprek loopt via Bondable, niet via je mailbox — zo blijft wat je schrijft beschermd en staat alles op één plek.',
                  { provider: providerName },
                )}
              </DialogDescription>
            </DialogHeader>

            {/* The link IS the account, for now. Give it, do not promise it. */}
            {threadUrl && (
              <div className="mt-5 rounded-card border border-border bg-muted/40 p-4">
                <div className="flex items-start gap-3">
                  <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {t(
                        'finder_request_success_link_title',
                        'Bewaar deze link om het antwoord te lezen',
                      )}
                    </p>
                    <p
                      className="mt-2 break-all rounded-ctl border border-border bg-background px-3 py-2 text-xs text-muted-foreground"
                      data-testid="lead-thread-url"
                    >
                      {threadUrl}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void copyThreadUrl()}
                      >
                        {copied ? (
                          <Check className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Copy className="h-4 w-4" aria-hidden="true" />
                        )}
                        {copied
                          ? t('finder_request_success_link_copied', 'Gekopieerd')
                          : t('finder_request_success_link_copy', 'Link kopiëren')}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" asChild>
                        <a href={threadUrl} target="_blank" rel="noreferrer">
                          {t('finder_request_success_link_open', 'Gesprek openen')}
                        </a>
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t(
                        'finder_request_success_link_demo',
                        'In deze demo vertrekt er nog geen e-mail. Deze link is voorlopig de enige weg terug naar je gesprek.',
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* The highest-value next step is not a form — it is talking today. */}
            <div className="mt-4 rounded-card border border-border bg-card p-4">
              <p className="text-sm font-medium text-foreground">
                {t('finder_request_success_wait_title', 'Liever niet wachten')}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t(
                  'finder_request_success_wait_desc',
                  'Tot je antwoord krijgt, kan je vandaag al terecht bij The Coach. Geen wachtlijst, wanneer het jou past.',
                )}
              </p>
              <Button type="button" className="mt-3 w-full sm:w-auto" asChild>
                <Link to={coachHref} onClick={() => onOpenChange(false)}>
                  {t('finder_request_success_wait_cta', 'Praat vandaag met The Coach')}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>

            {/* Account offer — AFTER sending, optional, dismissible. Never a gate. */}
            {!isLoggedIn && !accountOfferDismissed && (
              <div className="relative mt-4 rounded-card border border-dashed border-border bg-card p-4">
                <button
                  type="button"
                  onClick={() => setAccountOfferDismissed(true)}
                  aria-label={t('finder_request_success_account_dismiss', 'Later')}
                  className="absolute right-2 top-2 rounded-ctl p-1 text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="h-4 w-4" aria-hidden="true" />
                </button>
                <div className="flex items-start gap-3 pr-6">
                  <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {t(
                        'finder_request_success_account_title',
                        'Wil je je gesprekken bewaren? Kies een wachtwoord',
                      )}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t(
                        'finder_request_success_account_desc',
                        'Dan vind je dit gesprek terug zonder de link, ook op een ander toestel. Het hoeft niet nu.',
                      )}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" asChild>
                        <Link to="/setup-password" onClick={() => onOpenChange(false)}>
                          {t('finder_request_success_account_cta', 'Wachtwoord kiezen')}
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setAccountOfferDismissed(true)}
                      >
                        {t('finder_request_success_account_skip', 'Later')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('finder_request_success_done', 'Sluiten')}
              </Button>
            </div>
          </div>
        ) : (
          /* ------------------------------- FORM ---------------------------- */
          <>
            <DialogHeader>
              <div className="mb-1 flex items-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <MessageSquareHeart className="h-5 w-5 text-primary" aria-hidden="true" />
                </span>
              </div>
              <DialogTitle className="text-foreground">
                {t('finder_request_title', 'Neem contact op met {{provider}}', {
                  provider: providerName,
                })}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {isLoggedIn
                  ? t(
                      'finder_request_subtitle_client',
                      'Stuur een korte aanvraag. Ze komt veilig aan en wordt meestal binnen 48 uur beantwoord.',
                    )
                  : t(
                      'finder_request_subtitle_visitor',
                      'Stuur een vrijblijvende aanvraag. Je hebt geen account nodig — je naam en e-mailadres zijn er alleen om je te kunnen antwoorden.',
                    )}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="rpd-name" className="text-muted-foreground">
                  {t('finder_request_label_name', 'Je naam')}
                </Label>
                <Input
                  id="rpd-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('finder_request_ph_name', 'Voor- en achternaam')}
                  autoComplete="name"
                  disabled={submitting}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'rpd-name-err' : undefined}
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                />
                {errors.name && (
                  <p id="rpd-name-err" className="text-sm text-destructive">
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="rpd-email" className="text-muted-foreground">
                  {t('finder_request_label_email', 'E-mailadres')}
                </Label>
                <Input
                  id="rpd-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('finder_request_ph_email', 'jij@voorbeeld.be')}
                  autoComplete="email"
                  disabled={submitting}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'rpd-email-err' : undefined}
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                />
                {errors.email && (
                  <p id="rpd-email-err" className="text-sm text-destructive">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Topic + modality */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rpd-topic" className="text-muted-foreground">
                    {t('finder_request_label_topic', 'Onderwerp')}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      {t('finder_request_optional', '(optioneel)')}
                    </span>
                  </Label>
                  <Input
                    id="rpd-topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder={t('finder_request_ph_topic', 'Bv. angst, relaties, werk')}
                    disabled={submitting}
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rpd-modality" className="text-muted-foreground">
                    {t('finder_request_label_modality', 'Voorkeur')}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      {t('finder_request_optional', '(optioneel)')}
                    </span>
                  </Label>
                  <Select
                    value={modality}
                    onValueChange={(v) => setModality(v as ModalityChoice)}
                    disabled={submitting}
                  >
                    <SelectTrigger
                      id="rpd-modality"
                      className="bg-background border-border text-foreground"
                    >
                      <SelectValue
                        placeholder={t('finder_request_modality_any', 'Geen voorkeur')}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">
                        {t('finder_request_modality_any', 'Geen voorkeur')}
                      </SelectItem>
                      {modalityOptions.map((m) => (
                        <SelectItem key={m} value={m}>
                          {modalityLabel(m)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="rpd-message" className="text-muted-foreground">
                  {t('finder_request_label_message', 'Je bericht')}
                </Label>
                <Textarea
                  id="rpd-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t(
                    'finder_request_ph_message',
                    'Vertel kort waar je hulp bij zoekt en wat je hoopt te bereiken.',
                  )}
                  rows={4}
                  disabled={submitting}
                  aria-invalid={Boolean(errors.message)}
                  aria-describedby={errors.message ? 'rpd-message-err' : undefined}
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground resize-none"
                />
                {errors.message && (
                  <p id="rpd-message-err" className="text-sm text-destructive">
                    {errors.message}
                  </p>
                )}
              </div>

              {/* Reassurance line — privacy / no-spam, builds conversion trust. */}
              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <p className="text-xs text-muted-foreground">
                  {isLoggedIn
                    ? t(
                        'finder_request_reassure_client',
                        'Je aanvraag wordt veilig en vertrouwelijk bezorgd aan de hulpverlener.',
                      )
                    : t(
                        'finder_request_reassure_visitor',
                        'Vrijblijvend en vertrouwelijk. Na het versturen krijg je een eigen link naar het gesprek. Geen account nodig, geen spam.',
                      )}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={submitting}
                >
                  {t('finder_request_cancel', 'Annuleren')}
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !provider}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      {t('finder_request_sending', 'Versturen…')}
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                      {t('finder_request_submit', 'Aanvraag versturen')}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RequestProviderDialog;
