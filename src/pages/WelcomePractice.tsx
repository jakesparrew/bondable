/**
 * WelcomePractice — practice-owner first-run (`/welcome/practice`).
 * Tickets T-OA-11 (+ leans on T-PG-12/13).
 *
 * A brief, calm two-step: (1) create the practice — name + city → creator
 * becomes owner; (2) invite staff — generate shareable /practice-invite/:token
 * links, then hand off to the full Team management in PracticeSettings. Standalone
 * layout, LineBranch motif, no mint (practice/onboarding is not an AI surface).
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Copy, Check, Plus, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import LineBranch from '@/components/illustration/LineBranch';
import { useToast } from '@/hooks/ui/use-toast';
import { practiceService, type PracticeRole } from '@/services/api/practiceService';

type Step = 'create' | 'invite';

interface SentInvite {
  email: string;
  role: PracticeRole;
  link: string;
}

const WelcomePractice = () => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('create');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<PracticeRole>('staff');
  const [sent, setSent] = useState<SentInvite[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const createPractice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !city.trim()) return;
    await practiceService.createPractice(name, city);
    setStep('invite');
  };

  const addInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    const res = await practiceService.inviteStaff(inviteEmail, inviteRole);
    if (!res.ok) {
      toast({
        title:
          res.reason === 'seat_limit'
            ? t('practice_invite_err_seats', 'Alle zitplaatsen zijn bezet. Verhoog het Practice-abonnement om meer teamleden toe te voegen.')
            : res.reason === 'duplicate'
              ? t('practice_invite_err_dup', 'Dit e-mailadres is al lid of al uitgenodigd.')
              : t('practice_invite_err_none', 'Maak eerst een praktijk aan.'),
        variant: 'destructive',
      });
      return;
    }
    setSent((prev) => [
      ...prev,
      {
        email: res.invite.email,
        role: res.invite.role,
        link: `${window.location.origin}/practice-invite/${res.invite.token}`,
      },
    ]);
    setInviteEmail('');
    setInviteRole('staff');
  };

  const copy = async (link: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1600);
    } catch {
      toast({ title: t('copy_failed', 'Kopiëren lukte niet'), variant: 'destructive' });
    }
  };

  const finish = () => window.location.assign('/dashboard/therapist/practice');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-2.5 px-4 sm:px-6">
          <img src="/favicon.ico" alt="" className="h-8 w-8" />
          <span className="text-lg font-semibold tracking-tight text-primary">Bondable</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6">
        <div className="flex justify-center">
          <LineBranch className="h-24 w-24 text-primary/50" />
        </div>

        {step === 'create' ? (
          <>
            <h1 className="mt-6 text-center font-display text-display-lg text-foreground">
              {t('welcome_practice_title', 'Zet je praktijk op')}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-center text-body-sm text-muted-foreground">
              {t(
                'welcome_practice_body',
                'Een gedeelde thuis voor je team. Jij wordt eigenaar en beheert wie erbij hoort — elk teamlid houdt zijn eigen agenda en cliënten.',
              )}
            </p>

            <form
              onSubmit={createPractice}
              className="mx-auto mt-8 max-w-md space-y-4 rounded-card border border-border bg-card p-6"
            >
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">
                  {t('practice_name', 'Praktijknaam')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Praktijk De Brug"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">
                  {t('practice_city', 'Stad')} <span className="text-destructive">*</span>
                </Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Leuven" required />
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={!name.trim() || !city.trim()}>
                {t('welcome_practice_create', 'Praktijk aanmaken')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-center font-display text-display-lg text-foreground">
              {t('welcome_practice_invite_title', 'Nodig je team uit')}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-center text-body-sm text-muted-foreground">
              {t(
                'welcome_practice_invite_body',
                'Deel een link met je collega’s. Zij maken zelf hun profiel aan en kiezen hun discipline.',
              )}
            </p>

            <form
              onSubmit={addInvite}
              className="mx-auto mt-8 max-w-md space-y-3 rounded-card border border-border bg-card p-6"
            >
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">{t('email', 'E-mail')}</Label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="collega@praktijk.be"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">{t('practice_role', 'Rol')}</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as PracticeRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">{t('practice_role_staff', 'Teamlid')}</SelectItem>
                    <SelectItem value="manager">{t('practice_role_manager', 'Beheerder')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" variant="outline" className="w-full" disabled={!inviteEmail.trim()}>
                <Plus className="h-4 w-4" />
                {t('welcome_practice_add_invite', 'Uitnodiging toevoegen')}
              </Button>
            </form>

            {sent.length > 0 ? (
              <ul className="mx-auto mt-4 max-w-md space-y-2">
                {sent.map((s, idx) => (
                  <li
                    key={s.link}
                    className="flex items-center gap-2 rounded-ctl border border-border bg-card px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body-sm text-foreground">{s.email}</p>
                      <p className="truncate text-caption text-muted-foreground">{s.link}</p>
                    </div>
                    <Badge variant="outline">
                      {s.role === 'manager'
                        ? t('practice_role_manager', 'Beheerder')
                        : t('practice_role_staff', 'Teamlid')}
                    </Badge>
                    <Button size="sm" variant="ghost" onClick={() => copy(s.link, idx)}>
                      {copiedIdx === idx ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mx-auto mt-4 flex max-w-md items-center justify-center gap-2 text-caption text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {t('welcome_practice_no_invites', 'Nog niemand uitgenodigd — dat kan ook later.')}
              </p>
            )}

            <div className="mx-auto mt-8 flex max-w-md items-center justify-between gap-3">
              <button
                type="button"
                onClick={finish}
                className="text-body-sm text-muted-foreground hover:text-foreground"
              >
                {t('skip_for_now', 'Later doen')}
              </button>
              <Button size="lg" onClick={finish}>
                {t('welcome_practice_finish', 'Naar mijn praktijk')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default WelcomePractice;
