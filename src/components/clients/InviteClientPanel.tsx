/**
 * InviteClientPanel — therapist-side "invite a client" flow (MOCKUP).
 *
 * Instead of the therapist typing in all of a client's details, they generate a
 * personal invite link (and optionally "send" it by email). The client opens
 * `/invite/:token` and fills in their OWN profile. Front-end only: the link is
 * generated client-side and "sending" shows a toast. Light brand tokens; strings
 * via t('key','default').
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/ui/use-toast';
import { Link2, Copy, Check, Send, Mail, Clock, UserPlus } from 'lucide-react';

interface PendingInvite {
  token: string;
  name: string;
  email: string;
  link: string;
}

const makeToken = (): string => {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  // Fallback token (non-crypto) — fine for a front-end mockup.
  return `inv-${Math.abs(Date.now() ^ (performance.now() * 1000)).toString(36)}`;
};

const InviteClientPanel = () => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [invites, setInvites] = useState<PendingInvite[]>([]);

  const generate = () => {
    const token = makeToken();
    const url = `${window.location.origin}/invite/${token}`;
    setLink(url);
    setCopied(false);
    setInvites((prev) => [
      {
        token,
        name: firstName.trim() || t('invite_unnamed', 'Nieuwe cliënt'),
        email: email.trim(),
        link: url,
      },
      ...prev,
    ]);
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast({ title: t('invite_copied', 'Link gekopieerd') });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: t('invite_copy_failed', 'Kopiëren mislukt'),
        description: t('invite_copy_failed_desc', 'Kopieer de link handmatig.'),
        variant: 'destructive',
      });
    }
  };

  const send = () => {
    if (!link) generate();
    if (!email.trim()) {
      toast({
        title: t('invite_need_email', 'E-mail nodig'),
        description: t('invite_need_email_desc', 'Vul een e-mailadres in om de uitnodiging te versturen.'),
        variant: 'destructive',
      });
      return;
    }
    // MOCKUP: a real backend would email the invite link to the client.
    toast({
      title: t('invite_sent', 'Uitnodiging verstuurd'),
      description: t('invite_sent_desc', 'We hebben de uitnodiging naar {{email}} gestuurd.', { email }),
    });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground text-lg">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-primary">
              <UserPlus className="h-4 w-4" />
            </span>
            {t('invite_panel_title', 'Nodig een cliënt uit')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t(
              'invite_panel_desc',
              'Stuur een uitnodigingslink. De cliënt maakt zelf een account aan en vult zijn eigen profiel in — jij hoeft niets in te voeren.',
            )}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">{t('invite_first_name_opt', 'Voornaam (optioneel)')}</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t('enter_first_name', 'Voornaam')}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">{t('invite_email_opt', 'E-mail (voor versturen)')}</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('enter_email_address', 'naam@voorbeeld.be')}
                className="bg-background border-border"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={generate} variant="outline" className="gap-2">
              <Link2 className="h-4 w-4" />
              {link ? t('invite_regen', 'Nieuwe link') : t('invite_gen', 'Genereer uitnodigingslink')}
            </Button>
            <Button type="button" onClick={send} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <Send className="h-4 w-4" />
              {t('invite_send', 'Verstuur uitnodiging')}
            </Button>
          </div>

          {link && (
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">{t('invite_link_label', 'Uitnodigingslink')}</Label>
              <div className="flex gap-2">
                <Input readOnly value={link} className="bg-secondary/40 border-border font-mono text-xs" />
                <Button type="button" onClick={copy} variant="outline" className="shrink-0 gap-2">
                  {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  {copied ? t('invite_copied_short', 'Gekopieerd') : t('invite_copy', 'Kopieer')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('invite_link_hint', 'Deel deze link met je cliënt. Hij vult zelf zijn profiel aan.')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {invites.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-base">
              {t('invite_pending_title', 'Openstaande uitnodigingen')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invites.map((inv) => (
              <div
                key={inv.token}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{inv.name}</p>
                  <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {inv.email || t('invite_no_email', 'geen e-mail — alleen link')}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {t('invite_status_pending', 'In afwachting')}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InviteClientPanel;
