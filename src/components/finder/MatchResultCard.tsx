/**
 * MatchResultCard — one provider in the FIT-based matching shortlist.
 *
 * Renders the provider summary (photo, name, regulated-vs-coach indicator,
 * headline, specializations/languages/modalities) plus a TRANSPARENT
 * "waarom deze match" explanation built from MatchResult.whyMatch / reasons
 * (fit signals only — never price, never "promoted"). Each card offers a
 * "Bekijk profiel" link and a "Contact / Aanvraag" button so the CLIENT picks
 * from the shortlist; nothing is assigned.
 *
 * Mint accent is allowed here because matching is Bondable's AI/matching
 * surface. Otherwise light deep-teal brand tokens only. New strings via
 * t('key', 'default').
 */

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  ShieldCheck,
  Globe,
  MapPin,
  Video,
  Users,
  ArrowRight,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { MatchResult } from '@/services/api/finderService';

interface MatchResultCardProps {
  match: MatchResult;
  /** 1-based position in the shortlist (for the "Beste match" emphasis). */
  rank: number;
  onContact: (match: MatchResult) => void;
}

const initialsOf = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';

const MatchResultCard = ({ match, rank, onContact }: MatchResultCardProps) => {
  const { t } = useTranslation();
  const { provider, whyMatch, reasons } = match;

  const modalityLabel = (m: string) =>
    m === 'online'
      ? t('finder_modality_online', 'Online')
      : m === 'in_person'
        ? t('finder_modality_in_person', 'Op locatie')
        : m;

  const isTop = rank === 1;

  return (
    <Card className="flex flex-col gap-4 rounded-2xl border-border bg-card p-5 transition-shadow hover:shadow-md sm:flex-row sm:p-6">
      {/* Summary */}
      <div className="flex flex-1 gap-4">
        <Avatar className="h-14 w-14 shrink-0 border border-border">
          {provider.photoUrl && (
            <AvatarImage src={provider.photoUrl} alt={provider.fullName} />
          )}
          <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
            {initialsOf(provider.fullName)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              {provider.fullName}
            </h3>
            {isTop && (
              <Badge className="gap-1 border-transparent bg-mint text-mint-foreground hover:bg-mint">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                {t('finder_match_best', 'Beste match')}
              </Badge>
            )}
          </div>

          {/* Regulated clinician vs coach — transparency indicator */}
          <div className="flex flex-wrap items-center gap-2">
            {provider.isRegulated ? (
              <Badge
                variant="secondary"
                className="gap-1 border-border bg-background text-foreground"
              >
                <ShieldCheck className="h-3 w-3 text-primary" aria-hidden="true" />
                {t('finder_badge_regulated', 'Erkende hulpverlener')}
              </Badge>
            ) : (
              <Badge variant="outline" className="border-border">
                {t('finder_badge_coach', 'Coach')}
              </Badge>
            )}
            {provider.credentials && (
              <span className="text-xs text-muted-foreground">
                {provider.credentials}
              </span>
            )}
          </div>

          {provider.headline && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {provider.headline}
            </p>
          )}

          {/* Quick fit facts */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-xs text-muted-foreground">
            {provider.languages.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                {provider.languages.map((l) => l.toUpperCase()).join(', ')}
              </span>
            )}
            {provider.modalities.length > 0 && (
              <span className="inline-flex items-center gap-1">
                {provider.modalities.includes('online') ? (
                  <Video className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {provider.modalities.map(modalityLabel).join(' · ')}
              </span>
            )}
            {provider.city && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {provider.city}
              </span>
            )}
          </div>

          {provider.specializations.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {provider.specializations.slice(0, 4).map((s) => (
                <Badge
                  key={s}
                  variant="secondary"
                  className="border-transparent bg-muted text-[11px] font-normal text-muted-foreground"
                >
                  {s}
                </Badge>
              ))}
            </div>
          )}

          {/* WHY THIS MATCH — transparent, fit-based */}
          <div className="mt-2 rounded-xl border border-mint/30 bg-mint/10 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-mint" aria-hidden="true" />
              {t('finder_match_why', 'Waarom deze match')}
            </p>
            {reasons.length > 0 ? (
              <ul className="mt-1.5 space-y-1">
                {reasons.map((reason) => (
                  <li
                    key={reason}
                    className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-mint"
                    />
                    {reason}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {whyMatch}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions — the client chooses */}
      <div className="flex shrink-0 flex-row gap-2 sm:w-44 sm:flex-col">
        <Button onClick={() => onContact(match)} className="flex-1 gap-1.5">
          {t('finder_match_contact', 'Contact / Aanvraag')}
        </Button>
        <Button asChild variant="outline" className="flex-1 gap-1.5">
          <Link to={`/find/${provider.id}`}>
            {t('finder_match_view_profile', 'Bekijk profiel')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </Card>
  );
};

export default MatchResultCard;
