/**
 * PracticeInviteAccept — PUBLIC staff self-onboarding page
 * (`/practice-invite/:token`). Ticket T-PG-13.
 *
 * A colleague opens the invite link, sees which practice + role they're joining,
 * fills in their OWN name + discipline (PROVIDER_TYPES picker), and accepts. On
 * finish (demo) we set the provider role and drop them into the dashboard. Reuses
 * the warm InviteAccept grammar — slim top bar, single card, honest copy, no
 * mint (practice/onboarding is not an AI surface).
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Building2, CheckCircle2, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/ui/use-toast';
import { isBypassAvailable, setDemoRole } from '@/hooks/api/useAuthManager';
import { PROVIDER_TYPES, providerLabel, type ProviderType } from '@/lib/providerTypes';
import { practiceService, type Practice, type PracticeRole } from '@/services/api/practiceService';

const ROLE_LABEL: Record<PracticeRole, { key: string; nl: string }> = {
  owner: { key: 'practice_role_owner', nl: 'Eigenaar' },
  manager: { key: 'practice_role_manager', nl: 'Beheerder' },
  staff: { key: 'practice_role_staff', nl: 'Teamlid' },
};

const PracticeInviteAccept = () => {
  const { t } = useTranslation();
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [practice, setPractice] = useState<Practice | null>(null);
  const [role, setRole] = useState<PracticeRole>('staff');
  const [email, setEmail] = useState('');
  const [invalid, setInvalid] = useState(false);

  const [name, setName] = useState('');
  const [providerType, setProviderType] = useState<ProviderType>('clinical_psychologist');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) {
        setInvalid(true);
        setLoading(false);
        return;
      }
      const res = await practiceService.getInviteByToken(token);
      if (!active) return;
      if (!res) {
        setInvalid(true);
      } else {
        setPractice(res.practice);
        setRole(res.invite.role);
        setEmail(res.invite.email);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const canSubmit = name.trim().length > 1 && !!providerType;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !token) return;
    const res = await practiceService.acceptInvite(token, { name, providerType });
    if (!res.ok) {
      setInvalid(true);
      toast({
        title:
          res.reason === 'expired'
            ? t('practice_accept_expired', 'Deze uitnodiging is verlopen.')
            : t('practice_accept_invalid', 'Deze uitnodiging is niet meer geldig.'),
        variant: 'destructive',
      });
      return;
    }
    setSubmitted(true);
  };

  const enterDashboard = () => {
    if (isBypassAvailable()) {
      setDemoRole('therapist');
      window.location.assign('/dashboard/therapist');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/favicon.ico" alt="" className="h-8 w-8" />
            <span className="text-lg font-semibold tracking-tight text-primary">Bondable</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            {t('practice_invite_secure', 'Beveiligde teamuitnodiging')}
          </span>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6">
          {loading ? (
            <div className="rounded-card border border-border bg-card p-8 text-center text-muted-foreground">
              {t('loading', 'Even geduld…')}
            </div>
          ) : invalid ? (
            <div className="rounded-card border border-border bg-card p-8 text-center">
              <h1 className="font-display text-display-md text-foreground">
                {t('practice_invite_bad_title', 'Uitnodiging niet gevonden')}
              </h1>
              <p className="mx-auto mt-2 max-w-md text-body-sm text-muted-foreground">
                {t(
                  'practice_invite_bad_body',
                  'Deze link is verlopen of al gebruikt. Vraag de praktijk gerust om een nieuwe uitnodiging.',
                )}
              </p>
              <Button variant="outline" className="mt-6" onClick={() => navigate('/')}>
                {t('back_home', 'Terug naar start')}
              </Button>
            </div>
          ) : submitted ? (
            <div className="rounded-card border border-border bg-card p-8 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
                <CheckCircle2 className="h-7 w-7" />
              </span>
              <h1 className="mt-5 font-display text-display-md text-foreground">
                {t('practice_accept_done_title', 'Welkom bij het team')}
              </h1>
              <p className="mx-auto mt-2 max-w-md text-body-sm text-muted-foreground">
                {t(
                  'practice_accept_done_body',
                  'Je hoort nu bij {{practice}}. Je beheert je eigen agenda en cliënten — de praktijk ziet enkel de werking, nooit je dossiers.',
                  { practice: practice?.name },
                )}
              </p>
              <Button size="lg" className="mt-6" onClick={enterDashboard}>
                {t('practice_accept_done_cta', 'Ga naar mijn dashboard')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  {practice?.name}
                </span>
                <h1 className="mt-4 font-display text-display-md text-foreground">
                  {t('practice_accept_title', 'Word deel van de praktijk')}
                </h1>
                <p className="mt-2 flex items-center gap-2 text-body-sm text-muted-foreground">
                  {t('practice_accept_role_intro', 'Je wordt uitgenodigd als')}{' '}
                  <Badge variant="outline">{t(ROLE_LABEL[role].key, ROLE_LABEL[role].nl)}</Badge>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 rounded-card border border-border bg-card p-6">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground">
                    {t('practice_accept_name', 'Je naam')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Lotte Vermeulen"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-muted-foreground">
                    {t('practice_accept_discipline', 'Je discipline')} <span className="text-destructive">*</span>
                  </Label>
                  <Select value={providerType} onValueChange={(v) => setProviderType(v as ProviderType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDER_TYPES.map((pt) => (
                        <SelectItem key={pt} value={pt}>
                          {providerLabel(pt, t, { capitalize: true })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-muted-foreground">{t('email', 'E-mail')}</Label>
                  <Input value={email} disabled readOnly />
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
                  {t('practice_accept_submit', 'Uitnodiging aanvaarden')}
                </Button>
                <p className="text-center text-caption text-muted-foreground">
                  {t(
                    'practice_accept_note',
                    'Je gegevens blijven van jou. De praktijk ziet je profiel en de werking, nooit je cliëntdossiers.',
                  )}
                </p>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default PracticeInviteAccept;
