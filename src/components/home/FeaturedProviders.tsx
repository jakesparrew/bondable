/**
 * FeaturedProviders — a homepage strip of REAL provider profiles from the
 * finder, so clients immediately see that finding a hulpverlener is a thing
 * you can do here.
 *
 * NEUTRALITY (dichotomieverbod): this is NOT curation and NOT paid placement.
 * We show providers who are currently accepting new clients, in the exact
 * neutral order finderService returns (alphabetical). The caption says
 * precisely that, and the section links to /how-ranking-works. No provider can
 * ever buy this spot.
 *
 * Photos: none are fabricated. The product uses teal initials avatars until a
 * provider uploads a real photo — the homepage shows exactly what the finder
 * shows (photoUrl when present, initials otherwise).
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, ShieldCheck, CheckCircle2, ArrowRight, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { finderService, type Provider } from '@/services/api/finderService';
import { providerBadge, providerLabel } from '@/lib/providerTypes';

const initialsOf = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';

const FeaturedProviders = () => {
  const { t } = useTranslation();
  const [providers, setProviders] = useState<Provider[]>([]);

  useEffect(() => {
    let active = true;
    // Neutral selection: accepting-new only, service order (alphabetical),
    // first three. Nothing here is rankable, buyable or hand-picked.
    finderService
      .listProviders({ acceptingNew: true })
      .then((list) => {
        if (active) setProviders(list.slice(0, 3));
      })
      .catch(() => {
        if (active) setProviders([]);
      });
    return () => {
      active = false;
    };
  }, []);

  // No providers seeded/available: render nothing rather than an empty promise.
  if (providers.length === 0) return null;

  return (
    <section className="border-t border-border bg-card">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Search className="h-4 w-4 text-primary" />
              {t('home_featured_eyebrow', 'In de finder')}
            </span>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {t('home_featured_title', 'Hulpverleners die nu nieuwe cliënten aannemen')}
            </h2>
          </div>
          <Link
            to="/how-ranking-works"
            className="text-body-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {t('home_featured_neutral', 'Volgorde op fit, nooit op betaling')}
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((p) => {
            const badge = providerBadge(
              {
                providerType: p.providerType,
                verificationStatus: p.verificationStatus,
                isRegulated: p.isRegulated,
              },
              t,
            );
            return (
              <Link
                key={p.id}
                to={`/find/${p.id}`}
                className="group rounded-card border border-border bg-background p-5 transition-all hover:border-primary/20 hover:shadow-raise"
              >
                <div className="flex items-start gap-3.5">
                  <Avatar className="h-14 w-14 border border-border">
                    {p.photoUrl && <AvatarImage src={p.photoUrl} alt={p.fullName} />}
                    <AvatarFallback className="bg-primary/10 text-base font-semibold text-primary">
                      {initialsOf(p.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-title font-semibold text-foreground">
                      {p.fullName}
                    </p>
                    <p className="text-body-sm text-muted-foreground">
                      {providerLabel(p.providerType, t, { capitalize: true })}
                      {p.city ? (
                        <span className="inline-flex items-center gap-1">
                          {' · '}
                          <MapPin className="h-3 w-3" />
                          {p.city}
                        </span>
                      ) : null}
                    </p>
                    <div className="mt-1.5">
                      <Badge variant={badge.variant} className="gap-1">
                        {badge.kind === 'regulated' && <ShieldCheck className="h-3 w-3" />}
                        {badge.kind === 'verified_coach' && <CheckCircle2 className="h-3 w-3" />}
                        {badge.label}
                      </Badge>
                    </div>
                  </div>
                </div>

                {p.headline && (
                  <p className="mt-3.5 line-clamp-2 text-body-sm text-foreground/90">
                    {p.headline}
                  </p>
                )}

                <p className="mt-3 inline-flex items-center gap-1.5 text-label font-medium text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t('finder_card_accepting', 'Neemt nieuwe cliënten aan')}
                </p>
              </Link>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <Button asChild size="lg" className="h-13 rounded-ctl px-8 text-base">
            <Link to="/find">
              {t('home_featured_cta', 'Vind een hulpverlener die bij jou past')}
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProviders;
