/**
 * FinderFilters — the filter rail for the public Finder directory.
 *
 * Controlled by Find.tsx. Exposes FIT-based filters only — specialization,
 * language, modality, regulated-clinician-vs-coach, city, and "accepting new
 * clients". Referral-neutral by design: there is NO price filter and NO
 * "promoted"/"sponsored" toggle anywhere. New strings via t('key','default').
 *
 * Light deep-teal brand tokens only (no mint — this is not an AI surface).
 */

import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FinderFilters as Filters } from '@/services/api/finderService';

/** Sentinel for "no choice" in single-select dropdowns (Radix forbids ''). */
const ANY = '__any__';

export interface FinderFiltersProps {
  filters: Filters;
  onChange: (next: Filters) => void;
  onReset: () => void;
  /** Distinct values discovered in the current provider set (for the dropdowns). */
  options: {
    specializations: string[];
    languages: string[];
    cities: string[];
  };
}

const FinderFilters = ({ filters, onChange, onReset, options }: FinderFiltersProps) => {
  const { t } = useTranslation();

  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  const activeCount =
    (filters.specialization ? 1 : 0) +
    (filters.language ? 1 : 0) +
    (filters.modality ? 1 : 0) +
    (filters.regulated !== undefined ? 1 : 0) +
    (filters.city ? 1 : 0) +
    (filters.acceptingNew ? 1 : 0);

  const regulatedValue =
    filters.regulated === undefined ? ANY : filters.regulated ? 'regulated' : 'coach';

  const modalityLabel = (m: string) =>
    m === 'online'
      ? t('finder_modality_online', 'Online')
      : m === 'in_person'
        ? t('finder_modality_in_person', 'Op locatie')
        : m;

  return (
    <aside
      aria-label={t('finder_filters_aria', 'Filters')}
      className="rounded-lg border border-border bg-card p-4 sm:p-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          {t('finder_filters_title', 'Filters')}
        </h2>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={onReset}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            {t('finder_filters_reset', 'Wissen')}
          </Button>
        )}
      </div>

      <div className="mt-4 space-y-5">
        {/* Regulated clinician vs coach */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-foreground">
            {t('finder_filter_kind', 'Type hulpverlener')}
          </Label>
          <Select
            value={regulatedValue}
            onValueChange={(v) =>
              set({
                regulated:
                  v === ANY ? undefined : v === 'regulated' ? true : false,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>
                {t('finder_filter_kind_any', 'Alle')}
              </SelectItem>
              <SelectItem value="regulated">
                {t('finder_badge_regulated', 'Erkende hulpverlener')}
              </SelectItem>
              <SelectItem value="coach">
                {t('finder_badge_coach', 'Coach')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Specialization */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-foreground">
            {t('finder_filter_specialization', 'Specialisatie')}
          </Label>
          <Select
            value={filters.specialization ?? ANY}
            onValueChange={(v) => set({ specialization: v === ANY ? undefined : v })}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={t('finder_filter_any', 'Alle')}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>{t('finder_filter_any', 'Alle')}</SelectItem>
              {options.specializations.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Language */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-foreground">
            {t('finder_filter_language', 'Taal')}
          </Label>
          <Select
            value={filters.language ?? ANY}
            onValueChange={(v) => set({ language: v === ANY ? undefined : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('finder_filter_any', 'Alle')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>{t('finder_filter_any', 'Alle')}</SelectItem>
              {options.languages.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Modality */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-foreground">
            {t('finder_filter_modality', 'Vorm')}
          </Label>
          <Select
            value={filters.modality ?? ANY}
            onValueChange={(v) => set({ modality: v === ANY ? undefined : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('finder_filter_any', 'Alle')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>{t('finder_filter_any', 'Alle')}</SelectItem>
              <SelectItem value="online">{modalityLabel('online')}</SelectItem>
              <SelectItem value="in_person">{modalityLabel('in_person')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* City */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-foreground">
            {t('finder_filter_city', 'Stad')}
          </Label>
          <Select
            value={filters.city ?? ANY}
            onValueChange={(v) => set({ city: v === ANY ? undefined : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('finder_filter_any', 'Alle')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>{t('finder_filter_any', 'Alle')}</SelectItem>
              {options.cities.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Accepting new clients */}
        <label
          htmlFor="finder-accepting-new"
          className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border bg-background px-3 py-2.5"
        >
          <Checkbox
            id="finder-accepting-new"
            checked={!!filters.acceptingNew}
            onCheckedChange={(c) => set({ acceptingNew: c === true ? true : undefined })}
          />
          <span className="text-sm text-foreground">
            {t('finder_filter_accepting_new', 'Neemt nieuwe cliënten aan')}
          </span>
        </label>
      </div>
    </aside>
  );
};

export default FinderFilters;
