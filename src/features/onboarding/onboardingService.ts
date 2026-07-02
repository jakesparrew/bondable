/**
 * onboardingService — mock-backed (localStorage) onboarding progress + the
 * coach-mark governance ledger. Survives the demo environment; a real backend
 * later swaps this for onboarding_progress rows. All timing rules (R21's 14d/7d)
 * are documented but not enforced in the mock.
 */

import type { OnboardingProgress, OnboardingRole, StepDef } from './types';

const KEY = (role: OnboardingRole) => `bondable_onboarding_${role}`;
const LEDGER_KEY = 'bondable_coachmarks';

/** Solo-provider activation steps (R21). */
export const PROVIDER_STEPS: StepDef[] = [
  {
    key: 'profile',
    labelKey: 'ob_prov_profile',
    labelDefault: 'Vervolledig je profiel',
    hintKey: 'ob_prov_profile_hint',
    hintDefault: 'Naam, discipline en een korte introductie.',
    to: '/dashboard/therapist/profile',
  },
  {
    key: 'availability',
    labelKey: 'ob_prov_availability',
    labelDefault: 'Stel je beschikbaarheid in',
    hintKey: 'ob_prov_availability_hint',
    hintDefault: 'Wanneer kunnen cliënten bij je terecht?',
    to: '/dashboard/therapist/weekly-timetable',
  },
  {
    key: 'invite',
    labelKey: 'ob_prov_invite',
    labelDefault: 'Nodig je eerste cliënt uit',
    hintKey: 'ob_prov_invite_hint',
    hintDefault: 'Stuur een link — de cliënt vult zelf zijn profiel in.',
    to: '/dashboard/therapist/add-client',
  },
  {
    key: 'publish',
    labelKey: 'ob_prov_publish',
    labelDefault: 'Publiceer je finder-profiel',
    hintKey: 'ob_prov_publish_hint',
    hintDefault: 'Zo kunnen nieuwe cliënten je vinden.',
    to: '/dashboard/therapist/public-profile',
  },
  {
    key: 'session',
    labelKey: 'ob_prov_session',
    labelDefault: 'Plan je eerste sessie',
    hintKey: 'ob_prov_session_hint',
    hintDefault: 'Leg een eerste afspraak vast in je agenda.',
    to: '/dashboard/therapist/sessions',
  },
  {
    key: 'bond',
    labelKey: 'ob_prov_bond',
    labelDefault: 'Stel Bond in voor je cliënten',
    hintKey: 'ob_prov_bond_hint',
    hintDefault: 'De AI-begeleider werkt onder jouw supervisie.',
    to: '/dashboard/therapist/settings',
  },
];

/** Client activation steps (R21). */
export const CLIENT_STEPS: StepDef[] = [
  {
    key: 'goals',
    labelKey: 'ob_cli_goals',
    labelDefault: 'Bepaal waar je aan wil werken',
    hintKey: 'ob_cli_goals_hint',
    hintDefault: 'Een paar woorden volstaan om te starten.',
  },
  {
    key: 'consent',
    labelKey: 'ob_cli_consent',
    labelDefault: 'Geef je toestemming',
    hintKey: 'ob_cli_consent_hint',
    hintDefault: 'Zodat je veilig met je begeleider kan werken.',
  },
  {
    key: 'met_bond',
    labelKey: 'ob_cli_bond',
    labelDefault: 'Maak kennis met Bond',
    hintKey: 'ob_cli_bond_hint',
    hintDefault: 'Je AI-begeleider tussen de sessies door.',
  },
];

export const stepsFor = (role: OnboardingRole): StepDef[] =>
  role === 'provider' ? PROVIDER_STEPS : CLIENT_STEPS;

/** Steps whose completion together defines "activated" (R21). */
const ACTIVATION_KEYS: Record<OnboardingRole, string[]> = {
  provider: ['profile', 'availability', 'invite', 'session'],
  client: ['goals', 'consent', 'met_bond'],
};

const emptyProgress = (role: OnboardingRole): OnboardingProgress => ({
  role,
  steps: {},
  dismissed: false,
  welcomeSeen: false,
  activatedAt: null,
});

const read = (role: OnboardingRole): OnboardingProgress => {
  if (typeof window === 'undefined') return emptyProgress(role);
  try {
    const raw = window.localStorage.getItem(KEY(role));
    if (!raw) return emptyProgress(role);
    const parsed = JSON.parse(raw) as Partial<OnboardingProgress>;
    return { ...emptyProgress(role), ...parsed, role };
  } catch {
    return emptyProgress(role);
  }
};

const write = (p: OnboardingProgress) => {
  try {
    window.localStorage.setItem(KEY(p.role), JSON.stringify(p));
  } catch {
    /* ignore storage failures */
  }
};

const computeActivated = (p: OnboardingProgress): string | null => {
  if (p.activatedAt) return p.activatedAt; // sticky once reached
  const need = ACTIVATION_KEYS[p.role];
  const done = need.every((k) => p.steps[k]);
  // NB: mock does not stamp real time; keep a fixed marker so it's deterministic.
  return done ? '2026-01-01T00:00:00.000Z' : null;
};

export const onboardingService = {
  getProgress(role: OnboardingRole): OnboardingProgress {
    const p = read(role);
    p.activatedAt = computeActivated(p);
    return p;
  },

  isActivated(role: OnboardingRole): boolean {
    return this.getProgress(role).activatedAt != null;
  },

  setStep(role: OnboardingRole, key: string, done = true): OnboardingProgress {
    const p = read(role);
    p.steps = { ...p.steps, [key]: done };
    p.activatedAt = computeActivated(p);
    write(p);
    return p;
  },

  dismiss(role: OnboardingRole): void {
    const p = read(role);
    p.dismissed = true;
    write(p);
  },

  markWelcomeSeen(role: OnboardingRole): void {
    const p = read(role);
    p.welcomeSeen = true;
    write(p);
  },

  hasSeenWelcome(role: OnboardingRole): boolean {
    return read(role).welcomeSeen;
  },

  reset(role: OnboardingRole): void {
    try {
      window.localStorage.removeItem(KEY(role));
    } catch {
      /* ignore */
    }
  },
};

/* -------------------------------------------------------------------------- */
/* Coach-mark governance ledger (R15 caps)                                     */
/* -------------------------------------------------------------------------- */
/* Rules: a given coach-mark id shows ONCE ever; at most 5 coach-marks per day; */
/* callers enforce the per-surface cap (max 3) by counting their own ids.       */

interface CoachmarkLedger {
  seen: Record<string, true>;
  day: string; // yyyy-mm-dd bucket (from a passed-in date; mock uses 'demo')
  dayCount: number;
}

const readLedger = (): CoachmarkLedger => {
  if (typeof window === 'undefined') return { seen: {}, day: 'demo', dayCount: 0 };
  try {
    const raw = window.localStorage.getItem(LEDGER_KEY);
    if (!raw) return { seen: {}, day: 'demo', dayCount: 0 };
    return JSON.parse(raw) as CoachmarkLedger;
  } catch {
    return { seen: {}, day: 'demo', dayCount: 0 };
  }
};

const writeLedger = (l: CoachmarkLedger) => {
  try {
    window.localStorage.setItem(LEDGER_KEY, JSON.stringify(l));
  } catch {
    /* ignore */
  }
};

export const coachmarks = {
  /** Whether this coach-mark may show (first-visit-only + 5/day + width gate). */
  canShow(id: string): boolean {
    if (typeof window !== 'undefined' && window.innerWidth < 640) return false; // none < 640px
    const l = readLedger();
    if (l.seen[id]) return false;
    if (l.dayCount >= 5) return false;
    return true;
  },
  record(id: string): void {
    const l = readLedger();
    if (l.seen[id]) return;
    l.seen[id] = true;
    l.dayCount = (l.dayCount || 0) + 1;
    writeLedger(l);
  },
};
