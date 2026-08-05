/**
 * WaitlistCapture — het enige eerlijke antwoord op "we hebben niets voor je".
 *
 * Waar de finder vroeger doodliep ("kom binnenkort terug") vangen we nu iets op:
 * een e-mailadres voor een specialisatie in een stad. Dat is de enige manier
 * waarop we later kunnen laten weten dat er een plek vrijkomt.
 *
 * GDPR: één doel, expliciet aangevinkt, uitschrijven met één klik. We vragen
 * NOOIT waar iemand mee zit — geen vrije tekst, geen klacht, geen diagnose.
 * Wat we bewaren is een adres, een stad en een facetlabel uit de finder.
 */

import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { analyticsService } from '@/services/api/analyticsService';
import { ANALYTICS_EVENTS } from '@/config/analyticsEvents';
import {
  isPlausibleEmail,
  saveWaitlistInterest,
  type DisciplineId,
  type WaitlistSource,
} from '@/services/api/waitTimeService';

export interface WaitlistCaptureProps {
  /** Waar dit formulier staat — puur structureel, nooit klinisch. */
  source: WaitlistSource;
  /** Stad waarvoor iemand wacht (uit een filter of uit de stadspagina). */
  cityName?: string | null;
  /** Facetlabel uit de finder, bv. "burnout". Nooit vrije tekst. */
  specialization?: string | null;
  disciplineId?: DisciplineId | null;
  /** Compacte variant zonder eigen kaartrand (voor gebruik binnen een kaart). */
  bare?: boolean;
  onSaved?: () => void;
}

const WaitlistCapture = ({
  source,
  cityName = null,
  specialization = null,
  disciplineId = null,
  bare = false,
  onSaved,
}: WaitlistCaptureProps) => {
  const { t } = useTranslation();
  const emailId = useId();
  const consentId = useId();

  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const where = cityName
    ? t('waitlist_where_city', 'in {{city}}', { city: cityName })
    : t('waitlist_where_be', 'in jouw buurt');

  const what = specialization
    ? t('waitlist_what_spec', 'voor {{spec}}', { spec: specialization })
    : t('waitlist_what_generic', 'voor jouw vraag');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isPlausibleEmail(email)) {
      setError(
        t('waitlist_error_email', 'Vul een e-mailadres in waarop we je kunnen bereiken.'),
      );
      return;
    }
    if (!consent) {
      setError(
        t(
          'waitlist_error_consent',
          'Vink aan dat we je e-mailadres hiervoor mogen gebruiken.',
        ),
      );
      return;
    }
    saveWaitlistInterest({
      email,
      cityName,
      specialization,
      disciplineId,
      source,
    });
    // Structureel event: geen adres, geen stad-vrije-tekst, geen klacht.
    analyticsService.track(ANALYTICS_EVENTS.lead_received, {});
    setError(null);
    setSaved(true);
    onSaved?.();
  };

  const shell = bare
    ? 'space-y-3'
    : 'rounded-card border border-border bg-card p-5 sm:p-6 space-y-3';

  if (saved) {
    return (
      <div className={shell}>
        <p className="inline-flex items-center gap-2 text-body font-semibold text-foreground">
          <Check className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
          {t('waitlist_saved_title', 'Genoteerd')}
        </p>
        <p className="text-body-sm text-muted-foreground">
          {t(
            'waitlist_saved_body',
            'We laten het weten zodra er een plek vrijkomt {{where}} {{what}}. Ondertussen hoef je niet stil te zitten — in De Wachtruimte kan je vandaag al beginnen.',
            { where, what },
          )}
        </p>
      </div>
    );
  }

  return (
    <form className={shell} onSubmit={handleSubmit} noValidate>
      <div className="space-y-1">
        <p className="text-body font-semibold text-foreground">
          {t('waitlist_title', 'Laat je e-mailadres achter')}
        </p>
        <p className="text-body-sm text-muted-foreground">
          {t(
            'waitlist_sub',
            'We sturen één bericht zodra er plek vrijkomt {{where}} {{what}}. Geen nieuwsbrief.',
            { where, what },
          )}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={emailId} className="text-body-sm">
          {t('waitlist_email_label', 'E-mailadres')}
        </Label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id={emailId}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            placeholder={t('waitlist_email_ph', 'jij@voorbeeld.be')}
            className="h-11 rounded-ctl pl-9"
            aria-invalid={!!error}
          />
        </div>
      </div>

      <div className="flex items-start gap-2.5">
        <Checkbox
          id={consentId}
          checked={consent}
          onCheckedChange={(v) => {
            setConsent(v === true);
            if (error) setError(null);
          }}
          className="mt-0.5"
        />
        <Label
          htmlFor={consentId}
          className="text-body-sm font-normal leading-snug text-muted-foreground"
        >
          {t(
            'waitlist_consent',
            'Bondable mag mijn e-mailadres hiervoor gebruiken. Uitschrijven kan met één klik in elke mail.',
          )}
        </Label>
      </div>

      {error && (
        <p className="text-body-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full sm:w-auto">
        {t('waitlist_submit', 'Hou me op de hoogte')}
      </Button>
    </form>
  );
};

export default WaitlistCapture;
