/**
 * WachtruimtePage — de publieke pagina rond WachtruimtePanel.
 *
 * De ouder-app mount dit op /wachtruimte. Het is bewust een pagina in de
 * feature-map en niet in src/pages: de Wachtruimte is een surface die ook
 * ingebed kan worden (client-dashboard, finder), en dan hoort alles bij elkaar.
 *
 * ?stad=gent maakt de tekst en het e-mailveld concreet zonder dat er ooit iets
 * gevoeligs in de URL staat — een stadsnaam is geen gezondheidsgegeven.
 */

import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight } from 'lucide-react';

import FinderLayout from '@/components/finder/FinderLayout';
import Seo from '@/components/seo/Seo';
import { Button } from '@/components/ui/button';

import WachtruimtePanel from './WachtruimtePanel';

const WachtruimtePage = () => {
  const { t } = useTranslation();
  const [params] = useSearchParams();

  const cityParam = params.get('stad');
  const cityName = cityParam
    ? cityParam.charAt(0).toUpperCase() + cityParam.slice(1)
    : null;
  const specialization = params.get('thema');

  return (
    <FinderLayout>
      <Seo
        path="/wachtruimte"
        title="De Wachtruimte — begin terwijl je wacht op een therapeut"
        description="Sta je op een wachtlijst voor een psycholoog of therapeut? Praat vandaag met The Coach, vul je intake alvast in, doe een nulmeting en noteer je doelen. Zo is je eerste gesprek meteen drie gesprekken waard."
      />

      <div className="mx-auto w-full max-w-4xl">
        <WachtruimtePanel
          variant="page"
          cityName={cityName}
          specialization={specialization}
        />

        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-6">
          <Button asChild variant="outline" className="gap-1.5">
            <Link to="/wachttijden">
              {t('wachtruimte_to_index', 'Bekijk de wachttijden per stad')}
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="ghost" className="gap-1.5 text-muted-foreground">
            <Link to="/find">
              {t('wachtruimte_to_find', 'Zoek een hulpverlener')}
            </Link>
          </Button>
        </div>
      </div>
    </FinderLayout>
  );
};

export default WachtruimtePage;
