/**
 * InviteAccept — PUBLIC client self-onboarding page (`/invite/:token`).
 *
 * A therapist invites a client from "Add client" → the client opens this link and
 * fills in their OWN profile, so the therapist doesn't have to enter it. This is
 * a front-end MOCKUP: submitting shows a success state and (in demo) drops the
 * client into their own dashboard. Light deep-teal brand tokens; mint reserved
 * for AI surfaces. Strings use t('key','default').
 */

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, HeartHandshake, CheckCircle2, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/ui/use-toast';
import { isBypassAvailable, setDemoRole } from '@/hooks/api/useAuthManager';

const InviteAccept = () => {
  const { t } = useTranslation();
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    dateOfBirth: '',
    goals: '',
  });
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const canSubmit =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.email.trim() &&
    form.password.length >= 8 &&
    consent;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    // MOCKUP: a real backend would create the account, save the self-entered
    // profile and link it to the inviting therapist (via the token).
    setSubmitted(true);
  };

  const enterDashboard = () => {
    if (isBypassAvailable()) {
      setDemoRole('client');
      window.location.assign('/dashboard/client');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Slim top bar */}
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/favicon.ico" alt="" className="h-8 w-8" />
            <span className="text-lg font-semibold tracking-tight text-primary">Bondable</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            {t('invite_secure', 'Beveiligde uitnodiging')}
          </span>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
          {submitted ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
                <CheckCircle2 className="h-7 w-7" />
              </span>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight">
                {t('invite_done_title', 'Je profiel is aangemaakt')}
              </h1>
              <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                {t(
                  'invite_done_body',
                  'Bedankt {{name}}! Je hulpverlener ziet je profiel nu en neemt binnenkort contact op. Je kunt meteen aan de slag in je eigen omgeving.',
                  { name: form.firstName },
                )}
              </p>
              <Button size="lg" className="mt-6" onClick={enterDashboard}>
                {t('invite_done_cta', 'Ga naar mijn dashboard')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              {/* Intro */}
              <div className="mb-6">
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                  <HeartHandshake className="h-3.5 w-3.5 text-primary" />
                  {t('invite_eyebrow', 'Uitnodiging van je hulpverlener')}
                </span>
                <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {t('invite_title', 'Maak je profiel aan')}
                </h1>
                <p className="mt-2 text-muted-foreground">
                  {t(
                    'invite_subtitle',
                    'Je bent uitgenodigd om je eigen profiel bij Bondable aan te maken. Vul je gegevens zelf in — zo houd jij de controle over je informatie.',
                  )}
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-5 rounded-2xl border border-border bg-card p-6"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground">
                      {t('first_name', 'Voornaam')} <span className="text-destructive">*</span>
                    </Label>
                    <Input value={form.firstName} onChange={set('firstName')} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground">
                      {t('last_name', 'Achternaam')} <span className="text-destructive">*</span>
                    </Label>
                    <Input value={form.lastName} onChange={set('lastName')} required />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground">
                      {t('email', 'E-mail')} <span className="text-destructive">*</span>
                    </Label>
                    <Input type="email" value={form.email} onChange={set('email')} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground">
                      {t('invite_password', 'Kies een wachtwoord')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={set('password')}
                      placeholder={t('invite_password_ph', 'Minstens 8 tekens')}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground">{t('phone', 'Telefoon')}</Label>
                    <Input value={form.phone} onChange={set('phone')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground">{t('date_of_birth', 'Geboortedatum')}</Label>
                    <Input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-muted-foreground">
                    {t('invite_goals', 'Waar wil je aan werken? (optioneel)')}
                  </Label>
                  <Textarea
                    value={form.goals}
                    onChange={set('goals')}
                    rows={3}
                    placeholder={t('invite_goals_ph', 'Bijv. omgaan met stress, slaap, relaties…')}
                  />
                </div>

                <label className="flex items-start gap-3 rounded-lg border border-border bg-secondary/40 p-3">
                  <Checkbox
                    checked={consent}
                    onCheckedChange={(c) => setConsent(!!c)}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-muted-foreground">
                    {t(
                      'invite_consent',
                      'Ik ga akkoord met de verwerking van mijn (gezondheids)gegevens om met mijn hulpverlener te kunnen werken, volgens het privacybeleid.',
                    )}
                  </span>
                </label>

                <Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
                  {t('invite_submit', 'Profiel aanmaken')}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  {t('invite_token_note', 'Uitnodigingscode')}: <span className="font-mono">{token}</span>
                </p>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default InviteAccept;
