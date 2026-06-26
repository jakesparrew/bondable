/**
 * RequestProviderDialog — the Finder CONVERSION moment.
 *
 * A reassuring, accessible "Aanvraag / Contact" form shared by the directory
 * cards, the public provider profile page, and the match cards. On submit it
 * creates a Finder lead via finderService.createRequest, then shows a success
 * state.
 *
 * Two framings of success:
 *   • New visitor (NOT logged in) → lead-gen + "we maken meteen je gratis
 *     Bondable-cliëntaccount aan" so they can connect and start their traject.
 *   • Logged-in client            → skip the account framing, just confirm the
 *     request and point them to their account to follow up.
 *
 * Brand: light deep-teal + mint tokens ONLY. Primary deep-teal for CTAs;
 * bg-background/card/muted, text-foreground/muted-foreground, border-border.
 * Mint is reserved for AI surfaces (matching/Bond) — not used here. Destructive
 * red is reserved for emergencies — not used here (only for inline field
 * errors via the destructive token, which is the shadcn convention). All copy
 * via t(key, default); we never edit src/locales/*.json.
 *
 * Referral-neutral by design: a pure intent-to-contact form. Price is never a
 * reason to pick a provider and there is no "promoted" framing anywhere.
 *
 * Graceful on the dev mock: provider may be null while the parent loads; the
 * submit button stays disabled until a provider is present.
 */

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  Loader2,
  Mail,
  MessageSquareHeart,
  ShieldCheck,
  Sparkles,
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
import { useAuth } from '@/hooks/api/useAuthManager';
import { finderService, type Modality, type Provider } from '@/services/api/finderService';

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
  }, [open, defaultName, defaultEmail, defaultTopic]);

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
      await finderService.createRequest({
        providerId: provider.id,
        clientId: user?.id ?? null,
        clientName: name.trim(),
        clientEmail: email.trim(),
        topic: topic.trim() || undefined,
        message: message.trim(),
        preferredModality: modality === 'any' ? undefined : modality,
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
          <div className="text-center py-2">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-7 w-7 text-primary" aria-hidden="true" />
            </div>

            <DialogHeader className="space-y-2">
              <DialogTitle className="text-center text-foreground">
                {t('finder_request_success_title', 'Je aanvraag is verstuurd')}
              </DialogTitle>
              <DialogDescription className="text-center text-muted-foreground">
                {isLoggedIn
                  ? t(
                      'finder_request_success_desc_client',
                      'Je aanvraag is verstuurd naar {{provider}}. Je hoort snel iets terug — je kan het verloop volgen in je Bondable-account.',
                      { provider: providerName },
                    )
                  : t(
                      'finder_request_success_desc_visitor',
                      'Je aanvraag is verstuurd naar {{provider}}. We maken meteen je gratis Bondable-cliëntaccount aan zodat je kan verbinden en je traject kan starten.',
                      { provider: providerName },
                    )}
              </DialogDescription>
            </DialogHeader>

            {/* New-visitor account framing — reassuring, lead-gen forward. */}
            {!isLoggedIn && (
              <div className="mt-5 rounded-lg border border-border bg-muted/50 p-4 text-left">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {t('finder_request_success_account_title', 'Je gratis cliëntaccount')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t(
                        'finder_request_success_account_desc',
                        'We sturen een uitnodiging naar {{email}}. Activeer je account in één klik om veilig te berichten, sessies te plannen en je traject op te volgen.',
                        {
                          email:
                            email.trim() || t('finder_request_your_email', 'je e-mailadres'),
                        },
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-center">
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {t('finder_request_success_done', 'Klaar')}
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
                      'Stuur een korte aanvraag. We bezorgen ze veilig en je hoort snel iets terug.',
                    )
                  : t(
                      'finder_request_subtitle_visitor',
                      'Stuur een vrijblijvende aanvraag. Geen account nodig om te starten — we helpen je daarna meteen verder.',
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
                        'Vrijblijvend en vertrouwelijk. We maken alleen een gratis cliëntaccount aan om je verder te helpen — geen spam.',
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
