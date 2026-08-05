/**
 * WachtruimteCrisis — de nooduitgang, op elke wachtsurface.
 *
 * Wie op een wachtlijst staat kan het ondertussen zwaarder krijgen. Dit blok
 * staat daarom op elke pagina van de Wachtruimte en de Wachtlijstradar.
 *
 * REGELS (niet onderhandelbaar): dit is nooit gated, nooit een nudge, nooit
 * onderdeel van een experiment, en het staat nooit achter een klik. De nummers
 * zijn het grootste element; de tekst is kort en gebiedend.
 */

import { useTranslation } from 'react-i18next';
import { Phone } from 'lucide-react';

interface CrisisLine {
  number: string;
  /** Wat je moet intoetsen (spaties eruit). */
  tel: string;
  label: string;
}

interface WachtruimteCrisisProps {
  /** Compacte variant voor onderaan een lange pagina. */
  compact?: boolean;
}

const WachtruimteCrisis = ({ compact = false }: WachtruimteCrisisProps) => {
  const { t } = useTranslation();

  const lines: CrisisLine[] = [
    {
      number: '1813',
      tel: '1813',
      label: t('crisis_line_be', 'Zelfmoordlijn België, dag en nacht, gratis'),
    },
    {
      number: '113',
      tel: '113',
      label: t('crisis_line_nl', 'Zelfmoordpreventie Nederland, dag en nacht'),
    },
    {
      number: '112',
      tel: '112',
      label: t('crisis_line_eu', 'Noodnummer bij acuut gevaar'),
    },
  ];

  return (
    <section
      aria-label={t('crisis_aria', 'Hulp bij acute nood')}
      className="rounded-card border border-border bg-card p-5 sm:p-6"
    >
      <p className="text-body font-semibold text-foreground">
        {t('crisis_title', 'Kan je niet wachten')}
      </p>
      <p className="mt-1 text-body-sm text-muted-foreground">
        {t(
          'crisis_sub',
          'Bel meteen. Je hoeft niet uit te leggen waarom je belt en het kost niets.',
        )}
      </p>

      <ul
        className={
          compact
            ? 'mt-4 flex flex-wrap items-center gap-x-6 gap-y-3'
            : 'mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3'
        }
      >
        {lines.map((line) => (
          <li key={line.number}>
            <a
              href={`tel:${line.tel}`}
              className="group inline-flex flex-col rounded-ctl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="inline-flex items-center gap-2 text-3xl font-semibold tabular text-foreground group-hover:text-primary">
                <Phone className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                {line.number}
              </span>
              <span className="mt-0.5 text-body-sm text-muted-foreground">
                {line.label}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default WachtruimteCrisis;
