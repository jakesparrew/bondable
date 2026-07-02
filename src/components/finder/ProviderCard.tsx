/**
 * ProviderCard — one provider tile in the public Finder directory grid.
 *
 * Shows photo/avatar, name, headline, specialization chips, languages, a
 * regulated-clinician-vs-coach badge, city, rating, and two actions:
 *  - "Bekijk profiel" → /find/:providerId
 *  - "Contact / Aanvraag" → opens RequestProviderDialog (via onRequest)
 *
 * Referral-neutral by design: no price is shown here, and there is NO
 * "promoted"/"sponsored" treatment — every card is rendered identically. The
 * regulated/coach distinction is a transparency signal, not a ranking.
 *
 * Light deep-teal brand tokens only (no mint — this is not an AI surface).
 */

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Star, ShieldCheck, CheckCircle2 } from 'lucide-react';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Provider } from '@/services/api/finderService';
import { providerBadge, providerLabel } from '@/lib/providerTypes';

interface ProviderCardProps {
  provider: Provider;
  /** Opens the contact / request dialog for this provider. */
  onRequest: (provider: Provider) => void;
}

const initialsOf = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';

const MAX_SPEC_CHIPS = 3;

const ProviderCard = ({ provider, onRequest }: ProviderCardProps) => {
  const { t } = useTranslation();

  const modalityLabel = (m: string) =>
    m === 'online'
      ? t('finder_modality_online', 'Online')
      : m === 'in_person'
        ? t('finder_modality_in_person', 'Op locatie')
        : m;

  const visibleSpecs = provider.specializations.slice(0, MAX_SPEC_CHIPS);
  const extraSpecs = provider.specializations.length - visibleSpecs.length;

  const badge = providerBadge(
    {
      providerType: provider.providerType,
      verificationStatus: provider.verificationStatus,
      isRegulated: provider.isRegulated,
    },
    t,
  );
  const typeLabel = providerLabel(provider.providerType, t, { capitalize: true });

  return (
    <Card className="flex h-full flex-col overflow-hidden border-border transition-shadow hover:shadow-raise hover:border-primary/20">
      <CardContent className="flex-1 p-5">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 border border-border">
            {provider.photoUrl && (
              <AvatarImage src={provider.photoUrl} alt={provider.fullName} />
            )}
            <AvatarFallback className="bg-primary/10 text-base font-semibold text-primary">
              {initialsOf(provider.fullName)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate text-base font-semibold text-foreground">
                {provider.fullName}
              </h3>
            </div>

            {/* Type label + trust badge — transparency signal, never a ranking */}
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-body-sm text-muted-foreground">{typeLabel}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Badge variant={badge.variant} className="gap-1">
                      {badge.kind === 'regulated' && <ShieldCheck className="h-3.5 w-3.5" />}
                      {badge.kind === 'verified_coach' && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {badge.label}
                    </Badge>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">{badge.tooltip}</TooltipContent>
              </Tooltip>
            </div>

            {/* Meta: city + rating */}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {provider.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {provider.city}
                </span>
              )}
              {provider.rating != null && (
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-current text-primary" />
                  <span className="font-medium text-foreground">
                    {provider.rating.toFixed(1)}
                  </span>
                  {provider.reviewCount != null && (
                    <span className="text-muted-foreground">
                      ({provider.reviewCount})
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Headline */}
        {provider.headline && (
          <p className="mt-4 line-clamp-2 text-sm text-foreground/90">
            {provider.headline}
          </p>
        )}

        {/* Specialization chips */}
        {visibleSpecs.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {visibleSpecs.map((s) => (
              <Badge key={s} variant="secondary" className="font-normal">
                {s}
              </Badge>
            ))}
            {extraSpecs > 0 && (
              <Badge variant="outline" className="font-normal text-muted-foreground">
                +{extraSpecs}
              </Badge>
            )}
          </div>
        )}

        {/* Languages + modalities + availability */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {provider.languages.length > 0 && (
            <span>
              {t('finder_card_languages', 'Talen')}: {provider.languages.join(', ')}
            </span>
          )}
          {provider.modalities.length > 0 && (
            <span>{provider.modalities.map(modalityLabel).join(' · ')}</span>
          )}
        </div>

        {provider.acceptingNewClients && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t('finder_card_accepting', 'Neemt nieuwe cliënten aan')}
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-2 border-t border-border bg-muted/30 p-3">
        <Button asChild variant="outline" className="flex-1">
          <Link to={`/find/${provider.id}`}>
            {t('finder_card_view', 'Bekijk profiel')}
          </Link>
        </Button>
        <Button className="flex-1" onClick={() => onRequest(provider)}>
          {t('finder_card_contact', 'Contact / Aanvraag')}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProviderCard;
