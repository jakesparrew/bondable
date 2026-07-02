/**
 * providerTypes — the single source of truth for Bondable's provider taxonomy.
 *
 * Generalizes the old single "therapist" archetype into a typed set of care &
 * coaching professions (docs/plan/02). Drives: finder type facet + badges, the
 * derived `is_regulated` invariant, onboarding credential steps, and Bond's
 * supervision framing. Naming rule: the more SPECIFIC the label, the better —
 * a client sees "je psycholoog An", never a generic "provider".
 *
 * `is_regulated` is DERIVED, never self-declared: regulated type AND verified.
 */

import type { TFunction } from 'i18next';

export type ProviderType =
  | 'clinical_psychologist'
  | 'clinical_orthopedagogue'
  | 'psychotherapist'
  | 'coach'
  | 'counselor'
  | 'other';

export type CredentialKind =
  | 'visum'
  | 'erkenningsnummer'
  | 'base_profession'
  | 'psychotherapy_training'
  | 'diploma'
  | 'certificate';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface ProviderTypeMeta {
  /** Eligible for the "Erkend hulpverlener" badge (still needs verification). */
  regulated: boolean;
  /** What the verification queue asks this type to supply. */
  credentialKinds: CredentialKind[];
  /** `other` is hidden from the finder in v1. */
  finderListed: boolean;
  /** Bond frames its supervision copy clinically vs coaching. */
  bondSupervisionCopy: 'clinical' | 'coaching';
  /** NL/EN specific labels (lowercase; caller capitalizes as needed). */
  nl: string;
  en: string;
}

export const PROVIDER_TYPE_META: Record<ProviderType, ProviderTypeMeta> = {
  clinical_psychologist: {
    regulated: true,
    credentialKinds: ['visum', 'erkenningsnummer'],
    finderListed: true,
    bondSupervisionCopy: 'clinical',
    nl: 'psycholoog',
    en: 'psychologist',
  },
  clinical_orthopedagogue: {
    regulated: true,
    credentialKinds: ['visum', 'erkenningsnummer'],
    finderListed: true,
    bondSupervisionCopy: 'clinical',
    nl: 'orthopedagoog',
    en: 'educational psychologist',
  },
  psychotherapist: {
    regulated: true,
    credentialKinds: ['base_profession', 'psychotherapy_training'],
    finderListed: true,
    bondSupervisionCopy: 'clinical',
    nl: 'psychotherapeut',
    en: 'psychotherapist',
  },
  coach: {
    regulated: false,
    credentialKinds: ['certificate'],
    finderListed: true,
    bondSupervisionCopy: 'coaching',
    nl: 'coach',
    en: 'coach',
  },
  counselor: {
    regulated: false,
    credentialKinds: ['certificate', 'diploma'],
    finderListed: true,
    bondSupervisionCopy: 'coaching',
    nl: 'begeleider',
    en: 'counselor',
  },
  other: {
    regulated: false,
    credentialKinds: ['certificate'],
    finderListed: false,
    bondSupervisionCopy: 'coaching',
    nl: 'hulpverlener',
    en: 'provider',
  },
};

/** All provider types (stable order for facets/pickers). */
export const PROVIDER_TYPES = Object.keys(PROVIDER_TYPE_META) as ProviderType[];

/** Types that show up in the public finder facet. */
export const FINDER_PROVIDER_TYPES = PROVIDER_TYPES.filter(
  (t) => PROVIDER_TYPE_META[t].finderListed,
);

/** Generic fallback label when the type is unknown or mixed. */
export const GENERIC_PROVIDER_LABEL = { nl: 'hulpverlener', en: 'provider' } as const;

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * Localized label for a provider type. Defaults to the NL specific label (NL is
 * the reference language; inline defaults keep us off locale-file churn).
 */
export function providerLabel(
  type: ProviderType | null | undefined,
  t: TFunction,
  opts: { capitalize?: boolean } = {},
): string {
  if (!type || !PROVIDER_TYPE_META[type]) {
    const generic = t('provider_type_generic', GENERIC_PROVIDER_LABEL.nl);
    return opts.capitalize ? cap(generic) : generic;
  }
  const meta = PROVIDER_TYPE_META[type];
  const label = t(`provider_type_${type}`, meta.nl);
  return opts.capitalize ? cap(label) : label;
}

/**
 * DERIVED `is_regulated` — the ONLY correct way to compute it.
 * True iff the type is a regulated profession AND credentials are verified.
 */
export function recomputeRegulated(
  type: ProviderType | null | undefined,
  verification: VerificationStatus | null | undefined,
): boolean {
  if (!type || !PROVIDER_TYPE_META[type]) return false;
  return PROVIDER_TYPE_META[type].regulated && verification === 'verified';
}

export type ProviderBadgeKind = 'regulated' | 'verified_coach' | 'unverified' | 'plain';

export interface ProviderBadgeMeta {
  kind: ProviderBadgeKind;
  /** Maps to <Badge variant="...">. Never mint, never gold. */
  variant: 'trust' | 'success' | 'outline';
  label: string;
  /** Short explanation for a tooltip — badge is transparency, never ranking. */
  tooltip: string;
}

/**
 * The finder trust badge for a provider — a transparency signal, NEVER a ranking
 * input (dichotomieverbod). Three meaningful states + a plain fallback.
 */
export function providerBadge(
  args: {
    providerType?: ProviderType | null;
    verificationStatus?: VerificationStatus | null;
    isRegulated?: boolean | null;
  },
  t: TFunction,
): ProviderBadgeMeta {
  const { providerType: type, verificationStatus, isRegulated } = args;
  const regulatedType = !!type && PROVIDER_TYPE_META[type]?.regulated;

  // Regulated + verified (trusts the stored invariant OR the derived rule).
  if (isRegulated || recomputeRegulated(type, verificationStatus)) {
    return {
      kind: 'regulated',
      variant: 'trust',
      label: t('finder_badge_regulated', 'Erkend hulpverlener'),
      tooltip: t(
        'finder_badge_regulated_tip',
        'Erkende zorgverlener met een geverifieerd visum of erkenningsnummer.',
      ),
    };
  }

  // Coach/counselor with a verified certificate.
  if (!regulatedType && verificationStatus === 'verified') {
    return {
      kind: 'verified_coach',
      variant: 'success',
      label: t('finder_badge_verified_coach', 'Geverifieerde coach'),
      tooltip: t(
        'finder_badge_verified_coach_tip',
        'Coach met minstens één geverifieerd certificaat.',
      ),
    };
  }

  // Regulated type still awaiting verification — badged like a coach until clear.
  if (regulatedType && (verificationStatus === 'pending' || verificationStatus === 'unverified')) {
    return {
      kind: 'unverified',
      variant: 'outline',
      label: t('finder_badge_pending', 'Verificatie in behandeling'),
      tooltip: t(
        'finder_badge_pending_tip',
        'De erkenning van deze hulpverlener wordt nog gecontroleerd.',
      ),
    };
  }

  // Plain: coach without a verified certificate → show the type label.
  return {
    kind: 'plain',
    variant: 'outline',
    label: providerLabel(type ?? 'coach', t, { capitalize: true }),
    tooltip: t('finder_badge_plain_tip', 'Niet-erkende hulpverlener of coach.'),
  };
}
