/**
 * PracticeSettings — group-practice management for a practice owner/manager
 * (route /dashboard/therapist/practice). Tickets T-PG-12/13.
 *
 * Three tabs:
 *  - Overzicht: name, city, seat-usage meter (x/limit) with a quiet Practice-tier
 *    keyline note (NOT mint — practice is not an AI surface).
 *  - Team: member list with role badges (owner/manager/staff) + discipline label
 *    via providerLabel; invite-by-email form → shows the generated
 *    /practice-invite/:token link with copy.
 *  - Publiek profiel: practice finder listing toggle (placeholder).
 *
 * Managers see OPERATIONS ONLY. This page never shows notes, journals or
 * messages — that boundary is structural, encoded in practiceService (which
 * exposes members/seats/invites only), not a UI filter. No mint anywhere here.
 */

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, Users, MapPin, ShieldCheck, Link2, X, Building2 } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/ui/use-toast';
import { providerLabel } from '@/lib/providerTypes';
import {
  practiceService,
  type Practice,
  type PracticeMember,
  type PracticeInvite,
  type PracticeRole,
  type SeatUsage,
} from '@/services/api/practiceService';

const ROLE_BADGE: Record<PracticeRole, { variant: 'trust' | 'practice' | 'outline'; key: string; nl: string }> = {
  owner: { variant: 'trust', key: 'practice_role_owner', nl: 'Eigenaar' },
  manager: { variant: 'practice', key: 'practice_role_manager', nl: 'Beheerder' },
  staff: { variant: 'outline', key: 'practice_role_staff', nl: 'Teamlid' },
};

const PracticeSettings = () => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [practice, setPractice] = useState<Practice | null>(null);
  const [members, setMembers] = useState<PracticeMember[]>([]);
  const [invites, setInvites] = useState<PracticeInvite[]>([]);
  const [seats, setSeats] = useState<SeatUsage | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<PracticeRole>('staff');
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    const [p, m, i, s] = await Promise.all([
      practiceService.getMyPractice(),
      practiceService.listMembers(),
      practiceService.listInvites(),
      practiceService.getSeatUsage(),
    ]);
    setPractice(p);
    setMembers(m);
    setInvites(i);
    setSeats(s);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const inviteLinkFor = (token: string) => `${window.location.origin}/practice-invite/${token}`;

  const submitInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    const res = await practiceService.inviteStaff(inviteEmail, inviteRole);
    if (!res.ok) {
      const reason =
        res.reason === 'seat_limit'
          ? t('practice_invite_err_seats', 'Alle zitplaatsen zijn bezet. Verhoog het Practice-abonnement om meer teamleden toe te voegen.')
          : res.reason === 'duplicate'
            ? t('practice_invite_err_dup', 'Dit e-mailadres is al lid of al uitgenodigd.')
            : t('practice_invite_err_none', 'Maak eerst een praktijk aan.');
      toast({ title: reason, variant: 'destructive' });
      return;
    }
    setLastLink(inviteLinkFor(res.invite.token));
    setInviteEmail('');
    setInviteRole('staff');
    setCopied(false);
    toast({
      title: t('practice_invite_ok', 'Uitnodiging klaar'),
      description: t('practice_invite_ok_desc', 'Deel de link met je collega, dan maken zij zelf hun profiel aan.'),
    });
    await refresh();
  };

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast({ title: t('copy_failed', 'Kopiëren lukte niet'), variant: 'destructive' });
    }
  };

  const revoke = async (id: string) => {
    await practiceService.revokeInvite(id);
    await refresh();
  };

  const togglePublish = async () => {
    if (!practice) return;
    const next = await practiceService.updatePractice({ isPublished: !practice.isPublished });
    setPractice(next);
    await refresh();
  };

  const seatPct = seats && seats.limit > 0 ? Math.min(100, Math.round((seats.used / seats.limit) * 100)) : 0;

  return (
    <DashboardLayout userType="therapist">
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
        <div className="mb-6">
          <p className="text-body-sm font-medium text-muted-foreground">
            {t('practice_eyebrow', 'Groepspraktijk')}
          </p>
          <h1 className="font-display text-display-lg text-foreground">
            {practice?.name ?? t('practice_title_empty', 'Jouw praktijk')}
          </h1>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">{t('practice_tab_overview', 'Overzicht')}</TabsTrigger>
            <TabsTrigger value="team">{t('practice_tab_team', 'Team')}</TabsTrigger>
            <TabsTrigger value="public">{t('practice_tab_public', 'Publiek profiel')}</TabsTrigger>
          </TabsList>

          {/* ---------------------------------------------------------------- */}
          {/* OVERZICHT                                                        */}
          {/* ---------------------------------------------------------------- */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground">{t('practice_name', 'Praktijknaam')}</Label>
                    <div className="flex items-center gap-2 text-foreground">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{practice?.name ?? '—'}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground">{t('practice_city', 'Stad')}</Label>
                    <div className="flex items-center gap-2 text-foreground">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{practice?.city ?? '—'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seat usage meter */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-body-sm font-medium text-foreground">
                      {t('practice_seats', 'Zitplaatsen')}
                    </span>
                  </div>
                  <span className="text-body-sm text-muted-foreground">
                    {t('practice_seats_count', '{{used}} van {{limit}} in gebruik', {
                      used: seats?.used ?? 0,
                      limit: seats?.limit ?? 0,
                    })}
                  </span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${seatPct}%` }}
                  />
                </div>
                {seats && seats.pendingInvites > 0 ? (
                  <p className="mt-2 text-caption text-muted-foreground">
                    {t('practice_seats_pending', '{{n}} openstaande uitnodiging(en) meegeteld', {
                      n: seats.pendingInvites,
                    })}
                  </p>
                ) : null}

                {/* Quiet Practice-tier keyline note — NOT mint (practice is not AI). */}
                <div className="mt-5 flex items-start gap-3 rounded-ctl border border-border bg-card p-3">
                  <Badge variant="practice">{t('tier_practice', 'Practice')}</Badge>
                  <p className="text-caption text-muted-foreground">
                    {t(
                      'practice_seats_note',
                      'Zitplaatsen horen bij het Practice-abonnement. Elk teamlid beheert zijn eigen agenda en cliënten — jij ziet alleen de werking van de praktijk, nooit de dossiers.',
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------------------------------------------------------------- */}
          {/* TEAM                                                             */}
          {/* ---------------------------------------------------------------- */}
          <TabsContent value="team" className="mt-6 space-y-6">
            {/* Member list */}
            <div className="overflow-hidden rounded-card border border-border bg-card">
              <div className="border-b border-border px-5 py-3">
                <h2 className="text-body-sm font-semibold text-foreground">
                  {t('practice_members', 'Teamleden')}
                </h2>
              </div>
              <ul className="divide-y divide-border">
                {members.map((m) => {
                  const badge = ROLE_BADGE[m.role];
                  return (
                    <li key={m.id} className="flex items-center justify-between gap-4 px-5 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-body-sm font-medium text-primary">
                          {m.name.slice(0, 1)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-body-sm font-medium text-foreground">{m.name}</p>
                          <p className="truncate text-caption text-muted-foreground">
                            {providerLabel(m.providerType, t, { capitalize: true })} · {m.email}
                          </p>
                        </div>
                      </div>
                      <Badge variant={badge.variant}>{t(badge.key, badge.nl)}</Badge>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Pending invites */}
            {invites.length > 0 ? (
              <div className="overflow-hidden rounded-card border border-border bg-card">
                <div className="border-b border-border px-5 py-3">
                  <h2 className="text-body-sm font-semibold text-foreground">
                    {t('practice_pending', 'Openstaande uitnodigingen')}
                  </h2>
                </div>
                <ul className="divide-y divide-border">
                  {invites.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-4 px-5 py-4">
                      <div className="min-w-0">
                        <p className="truncate text-body-sm text-foreground">{i.email}</p>
                        <p className="truncate text-caption text-muted-foreground">
                          {t(ROLE_BADGE[i.role].key, ROLE_BADGE[i.role].nl)}
                          {' · '}
                          <button
                            type="button"
                            onClick={() => copyLink(inviteLinkFor(i.token))}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <Link2 className="h-3 w-3" />
                            {t('practice_copy_link', 'Kopieer link')}
                          </button>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => revoke(i.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-ctl text-muted-foreground hover:bg-secondary hover:text-foreground"
                        aria-label={t('practice_revoke', 'Intrekken')}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Invite form */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-body-sm font-semibold text-foreground">
                  {t('practice_invite_title', 'Nodig een collega uit')}
                </h2>
                <p className="mt-1 text-caption text-muted-foreground">
                  {t(
                    'practice_invite_sub',
                    'Stuur een uitnodiging per e-mail. Je collega maakt zelf zijn profiel aan via de link.',
                  )}
                </p>
                <form onSubmit={submitInvite} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-muted-foreground">{t('email', 'E-mail')}</Label>
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="collega@praktijk.be"
                    />
                  </div>
                  <div className="space-y-1.5 sm:w-44">
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
                  <Button type="submit" disabled={!inviteEmail.trim()}>
                    {t('practice_invite_send', 'Uitnodigen')}
                  </Button>
                </form>

                {/* Manager scope note */}
                <p className="mt-3 text-caption text-muted-foreground">
                  {t(
                    'practice_manager_scope',
                    'Een beheerder ziet de werking van de praktijk — aanvragen, bezetting, respons. Nooit notities, dagboeken of gesprekken van cliënten.',
                  )}
                </p>

                {lastLink ? (
                  <div className="mt-4 flex items-center gap-2 rounded-ctl border border-border bg-secondary/40 p-3">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                    <code className="min-w-0 flex-1 truncate text-caption text-foreground">{lastLink}</code>
                    <Button size="sm" variant="outline" onClick={() => copyLink(lastLink)}>
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? t('copied', 'Gekopieerd') : t('copy', 'Kopieer')}
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------------------------------------------------------------- */}
          {/* PUBLIEK PROFIEL                                                  */}
          {/* ---------------------------------------------------------------- */}
          <TabsContent value="public" className="mt-6 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-body-sm font-semibold text-foreground">
                      {t('practice_listing_title', 'Vindbaarheid in de zoekgids')}
                    </h2>
                    <p className="mt-1 max-w-md text-caption text-muted-foreground">
                      {t(
                        'practice_listing_sub',
                        'Zet je praktijkpagina online zodat cliënten jullie team via de zoekgids kunnen vinden. De pagina toont elk teamlid met zijn eigen profiel — de praktijk staat nooit boven individuele hulpverleners.',
                      )}
                    </p>
                  </div>
                  <Badge variant={practice?.isPublished ? 'success' : 'outline'}>
                    {practice?.isPublished
                      ? t('practice_live', 'Online')
                      : t('practice_offline', 'Nog niet online')}
                  </Badge>
                </div>
                <div className="mt-5">
                  <Button variant={practice?.isPublished ? 'outline' : 'default'} onClick={togglePublish}>
                    {practice?.isPublished
                      ? t('practice_unpublish', 'Offline halen')
                      : t('practice_publish', 'Praktijkpagina online zetten')}
                  </Button>
                </div>
                {practice ? (
                  <p className="mt-3 text-caption text-muted-foreground">
                    {t('practice_url', 'Straks bereikbaar via')}{' '}
                    <span className="font-mono text-foreground">/find/practice/{practice.slug}</span>
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default PracticeSettings;
