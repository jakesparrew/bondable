/**
 * FinderDeadEnd — wat er gebeurt wanneer de finder niets vindt.
 *
 * Tot nu toe eindigde dat op "kom binnenkort terug": een doodlopend spoor dat
 * niets opvangt, terwijl dit exact het moment is waarop iemand hulp zoekt. Dat
 * is het slechtste moment om niets aan te bieden.
 *
 * We geven daarom drie eerlijke opties, in deze volgorde:
 *   1. praat vandaag met The Coach — nu al iets, geen wachttijd;
 *   2. laat je e-mailadres achter voor deze specialisatie in deze stad;
 *   3. bekijk de wachttijden in je buurt, zodat je weet waar je wél binnen kan.
 *
 * We beloven niets wat we niet kunnen waarmaken: geen "we vinden zeker iemand",
 * geen tellertje met hoeveel mensen al wachten.
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Clock, MessagesSquare, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import LineBranch from '@/components/illustration/LineBranch';
import { cn } from '@/lib/utils';
import { isBypassAvailable, setDemoRole } from '@/hooks/api/useAuthManager';
import { analyticsService } from '@/services/api/analyticsService';
import { ANALYTICS_EVENTS } from '@/config/analyticsEvents';
import { slugifyCity, type WaitlistSource } from '@/services/api/waitTimeService';

import WaitlistCapture from './WaitlistCapture';

export interface FinderDeadEndProps {
  /** Waar we vandaan komen — structureel, nooit klinisch. */
  source: Extract<WaitlistSource, 'find_zero_results' | 'find_no_match'>;
  /** Stad uit het filter of uit de intake. */
  cityName?: string | null;
  /** Facetlabel uit de finder, bv. "burnout". Nooit vrije tekst. */
  specialization?: string | null;
  /** Zijn er filters actief die de bezoeker kan verbreden. */
  hasFilters?: boolean;
  /** Verbreed / wis de zoekopdracht. */
  onReset?: () => void;
  /** Label voor de reset-knop (verschilt tussen directory en matcher). */
  resetLabel?: string;
  className?: string;
}

const FinderDeadEnd = ({
  source,
  cityName = null,
  specialization = null,
  hasFilters = false,
  onReset,
  resetLabel,
  className,
}: FinderDeadEndProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const citySlug = slugifyCity(cityName);
  const waitPath = citySlug ? `/wachttijden/${citySlug}` : '/wachttijden';
  const wachtruimtePath = citySlug
    ? `/wachtruimte?stad=${citySlug}`
    : '/wachtruimte';

  // Structureel event: alleen facetlabels en een teller, nooit vrije tekst.
  useEffect(() => {
    analyticsService.track(ANALYTICS_EVENTS.finder_search, {
      specialty: specialization ?? null,
      location: cityName ?? null,
      result_count: 0,
    });
  }, [specialization, cityName]);

  const talkToCoach = () => {
    if (isBypassAvailable()) {
      setDemoRole('client');
      window.location.assign('/dashboard/client/bond');
    } else {
      navigate('/login');
    }
  };

  const where = cityName
    ? t('deadend_where_city', 'in {{city}}', { city: cityName })
    : t('deadend_where_be', 'in jouw buurt');

  return (
    <section
      className={cn(
        'rounded-card border border-border bg-card p-6 sm:p-8',
        className,
      )}
    >
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <LineBranch className="h-20 w-20 shrink-0" />
        <div className="max-w-xl space-y-2">
          <h3 className="text-title font-semibold text-foreground">
            {t('deadend_title', 'We vonden nu niemand die past')}
          </h3>
          <p className="text-body-sm text-muted-foreground">
            {t(
              'deadend_body',
              'Dat is vervelend, en het zegt vooral iets over de wachtlijsten {{where}}. Je hoeft daarom niet met lege handen weg te gaan — dit kan je vandaag wel doen.',
              { where },
            )}
          </p>
          {hasFilters && onReset && (
            <Button
              variant="ghost"
              onClick={onReset}
              className="-ml-3 gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {resetLabel ?? t('deadend_reset', 'Verbreed je zoekopdracht')}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 1 — The Coach (de enige mint op deze pagina: de Bond-ingang) */}
        <article className="flex flex-col rounded-card border border-border p-5">
          <MessagesSquare
            className="h-5 w-5 shrink-0 text-primary"
            aria-hidden="true"
          />
          <h4 className="mt-3 text-body font-semibold text-foreground">
            {t('deadend_coach_title', 'Praat vandaag met The Coach')}
          </h4>
          <p className="mt-1 flex-1 text-body-sm text-muted-foreground">
            {t(
              'deadend_coach_body',
              'Een begeleid gesprek onder supervisie van een echte hulpverlener. Geen wachttijd, en het start meteen.',
            )}
          </p>
          <Button
            onClick={talkToCoach}
            className="mt-4 gap-1.5 bg-mint text-mint-foreground hover:bg-mint/90 focus-visible:ring-mint"
          >
            {t('deadend_coach_cta', 'Start een gesprek')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </article>

        {/* 2 — e-mail voor deze specialisatie in deze stad */}
        <article className="flex flex-col rounded-card border border-border p-5">
          <WaitlistCapture
            bare
            source={source}
            cityName={cityName}
            specialization={specialization}
          />
        </article>

        {/* 3 — de wachttijden in de buurt */}
        <article className="flex flex-col rounded-card border border-border p-5">
          <Clock className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <h4 className="mt-3 text-body font-semibold text-foreground">
            {cityName
              ? t('deadend_wait_title_city', 'Bekijk de wachttijden in {{city}}', {
                  city: cityName,
                })
              : t('deadend_wait_title', 'Bekijk de wachttijden in jouw buurt')}
          </h4>
          <p className="mt-1 flex-1 text-body-sm text-muted-foreground">
            {t(
              'deadend_wait_body',
              'Per stad en per discipline een indicatie van hoe lang je wacht, en wie er wél nog aanneemt.',
            )}
          </p>
          <Button asChild variant="outline" className="mt-4 gap-1.5">
            <Link to={waitPath}>
              {t('deadend_wait_cta', 'Naar de wachttijden')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </article>
      </div>

      <p className="mt-5 text-body-sm text-muted-foreground">
        {t(
          'deadend_wachtruimte',
          'Sta je al op een wachtlijst? In De Wachtruimte zet je je intake, je nulmeting en je doelen alvast klaar.',
        )}{' '}
        <Link
          to={wachtruimtePath}
          className="font-medium text-primary underline underline-offset-4"
        >
          {t('deadend_wachtruimte_link', 'Ga naar De Wachtruimte')}
        </Link>
      </p>
    </section>
  );
};

export default FinderDeadEnd;
