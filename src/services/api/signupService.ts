/**
 * signupService — the provider self-signup spine (Track 1, audit P0).
 *
 * WHY THIS EXISTS: every €39 CTA used to dead-end on /login, which calls
 * `supabase.auth.signUp` against the in-memory mock — nothing was created and no
 * trial ever started. This module is the ONE place that turns "ik wil starten"
 * into a real local account state: demo role, a stamped 14-day full-Pro trial, an
 * optional founding-member number, and a provider profile draft that the
 * onboarding surfaces pick up.
 *
 * MOCK MODE (current): there is no network. Everything is localStorage-backed and
 * survives reloads, so the demo never shows an empty screen. When the real backend
 * lands, only the internals change — `createProviderAccount`, `getTrialState` and
 * `getFoundingState` keep their signatures and every caller stays identical.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NEVER STORE THE PASSWORD. `createProviderAccount` accepts one because the real
 * sign-up call will need it, but it is used and dropped in the same tick — it is
 * never written to localStorage, never logged, never put in analytics properties.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * DICHOTOMIEVERBOD: the founding number and the trial are workflow/commercial
 * state ONLY. Neither is ever an input to finder ranking or visibility.
 */

import { ANALYTICS_EVENTS } from '@/config/analyticsEvents';
import { setDemoRole } from '@/hooks/api/useAuthManager';
import { setDemoTier } from '@/hooks/useEntitlements';
import {
  recomputeRegulated,
  type ProviderType,
  type VerificationStatus,
} from '@/lib/providerTypes';
import { analyticsService } from '@/services/api/analyticsService';

// ── Storage keys ─────────────────────────────────────────────────────────────

const TRIAL_STARTED_KEY = 'bondable_trial_started_at';
const TRIAL_ENDS_KEY = 'bondable_trial_ends_at';
const FOUNDING_MEMBER_KEY = 'bondable_founding_member';
const FOUNDING_CLAIMED_KEY = 'bondable_founding_claimed';
const PROFILE_DRAFT_KEY = 'bondable_provider_profile_draft';
const SIGNUP_STARTED_KEY = 'bondable_signup_started';

/** Full-Pro trial length in days. No card, no auto-charge. */
export const TRIAL_DAYS = 14;

/** How many founding places exist in total. Hard cap — it never moves. */
export const FOUNDING_CAP = 100;

/**
 * Places already claimed before this browser. Bondable is pre-launch, so this is
 * deliberately 0: we do not manufacture scarcity. When the backend lands this
 * baseline comes from the real member count.
 */
const FOUNDING_BASELINE = 0;

const DAY_MS = 24 * 60 * 60 * 1000;
const hasWindow = typeof window !== 'undefined';

function read(key: string): string | null {
  if (!hasWindow) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  if (!hasWindow) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* silent-fail (quota, private mode) */
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface ProviderSignupInput {
  firstName: string;
  lastName: string;
  email: string;
  /** Used for the sign-up call only — never persisted. */
  password: string;
  providerType: ProviderType;
  city: string;
  /** Optional visum / erkenningsnummer / certificaat reference. */
  credentialRef?: string;
}

/** The provider profile draft the onboarding + public-profile surfaces read. */
export interface ProviderProfileDraft {
  firstName: string;
  lastName: string;
  email: string;
  providerType: ProviderType;
  city: string;
  credentialRef: string;
  /** Always starts unverified — the badge is earned, never bought. */
  verificationStatus: VerificationStatus;
  /** DERIVED, never self-declared (see providerTypes.recomputeRegulated). */
  isRegulated: boolean;
  /** Founding number, or null when the cap was already reached. */
  foundingNumber: number | null;
  createdAt: string;
}

export interface TrialState {
  active: boolean;
  /** Whole days left, floored at 0. */
  daysLeft: number;
  /** ISO end timestamp, or null when no trial was ever started. */
  endsAt: string | null;
  /** ISO start timestamp, or null. */
  startedAt: string | null;
  /** Trial length, for copy that wants to say "14 dagen". */
  totalDays: number;
}

export interface FoundingState {
  isFounding: boolean;
  /** 1-based place, or null when this browser has no founding membership. */
  number: number | null;
  /** Places still open. */
  remaining: number;
  cap: number;
}

export interface SignupResult {
  profile: ProviderProfileDraft;
  trial: TrialState;
  founding: FoundingState;
}

// ── Founding programme ───────────────────────────────────────────────────────

function readClaimed(): number {
  const raw = read(FOUNDING_CLAIMED_KEY);
  const parsed = raw === null ? NaN : Number.parseInt(raw, 10);
  const base = Number.isFinite(parsed) ? parsed : FOUNDING_BASELINE;
  return Math.min(Math.max(base, 0), FOUNDING_CAP);
}

function readMemberNumber(): number | null {
  const raw = read(FOUNDING_MEMBER_KEY);
  const parsed = raw === null ? NaN : Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Current founding-programme state. Safe to call on a cold browser: it reports
 * the full cap as remaining rather than inventing a count.
 */
export function getFoundingState(): FoundingState {
  const number = readMemberNumber();
  const claimed = readClaimed();
  return {
    isFounding: number !== null,
    number,
    remaining: Math.max(FOUNDING_CAP - claimed, 0),
    cap: FOUNDING_CAP,
  };
}

/** Claim the next founding place, or return null when the cap is reached. */
function claimFoundingPlace(): number | null {
  const existing = readMemberNumber();
  if (existing !== null) return existing;

  const claimed = readClaimed();
  if (claimed >= FOUNDING_CAP) return null;

  const next = claimed + 1;
  write(FOUNDING_CLAIMED_KEY, String(next));
  write(FOUNDING_MEMBER_KEY, String(next));
  return next;
}

// ── Trial ────────────────────────────────────────────────────────────────────

/**
 * The 14-day full-Pro trial state. `active` is false once the end date passes;
 * nothing is deleted at that point — the account simply reads as free again.
 */
export function getTrialState(): TrialState {
  const startedAt = read(TRIAL_STARTED_KEY);
  const endsAt = read(TRIAL_ENDS_KEY);
  if (!endsAt) {
    return { active: false, daysLeft: 0, endsAt: null, startedAt, totalDays: TRIAL_DAYS };
  }

  const end = new Date(endsAt).getTime();
  if (!Number.isFinite(end)) {
    return { active: false, daysLeft: 0, endsAt: null, startedAt, totalDays: TRIAL_DAYS };
  }

  const msLeft = end - Date.now();
  return {
    active: msLeft > 0,
    daysLeft: msLeft > 0 ? Math.ceil(msLeft / DAY_MS) : 0,
    endsAt,
    startedAt,
    totalDays: TRIAL_DAYS,
  };
}

/** Stamp a fresh trial window and unlock Pro for its duration. */
function startTrial(): TrialState {
  const now = new Date();
  const end = new Date(now.getTime() + TRIAL_DAYS * DAY_MS);
  write(TRIAL_STARTED_KEY, now.toISOString());
  write(TRIAL_ENDS_KEY, end.toISOString());
  // The trial IS full Pro — the demo tier makes that real rather than cosmetic.
  setDemoTier('pro');
  analyticsService.track(ANALYTICS_EVENTS.trial_started, { tier: 'pro' });
  return getTrialState();
}

// ── Profile draft ────────────────────────────────────────────────────────────

/** The persisted provider profile draft, or null when nobody signed up here. */
export function getProviderProfileDraft(): ProviderProfileDraft | null {
  const raw = read(PROFILE_DRAFT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as ProviderProfileDraft) : null;
  } catch {
    return null;
  }
}

// ── Funnel ───────────────────────────────────────────────────────────────────

/**
 * Fire `signup_started` once per browser. Call it when the provider actually
 * begins filling the form, so the funnel measures intent rather than page views.
 */
export function beginProviderSignup(channel = 'signup_provider'): void {
  if (read(SIGNUP_STARTED_KEY) === '1') return;
  write(SIGNUP_STARTED_KEY, '1');
  analyticsService.track(ANALYTICS_EVENTS.signup_started, { role: 'provider', channel });
}

const trim = (v: string | undefined) => (v ?? '').trim();

/**
 * Create a provider account (mock).
 *
 * Sets the demo role to `therapist`, stamps the 14-day full-Pro trial, claims a
 * founding place when one is left, and persists a profile draft. The password is
 * accepted for signature-compatibility with the real backend call and is dropped
 * immediately — it never reaches storage.
 */
export function createProviderAccount(input: ProviderSignupInput): SignupResult {
  beginProviderSignup();

  const foundingNumber = claimFoundingPlace();

  const profile: ProviderProfileDraft = {
    firstName: trim(input.firstName),
    lastName: trim(input.lastName),
    email: trim(input.email).toLowerCase(),
    providerType: input.providerType,
    city: trim(input.city),
    credentialRef: trim(input.credentialRef),
    // Verification happens later, by a human, in the verification queue.
    verificationStatus: 'unverified',
    isRegulated: recomputeRegulated(input.providerType, 'unverified'),
    foundingNumber,
    createdAt: new Date().toISOString(),
  };

  write(PROFILE_DRAFT_KEY, JSON.stringify(profile));
  setDemoRole('therapist');

  const trial = startTrial();

  analyticsService.track(ANALYTICS_EVENTS.signup_completed, {
    role: 'provider',
    channel: 'signup_provider',
  });

  return { profile, trial, founding: getFoundingState() };
}

export const signupService = {
  createProviderAccount,
  beginProviderSignup,
  getTrialState,
  getFoundingState,
  getProviderProfileDraft,
  TRIAL_DAYS,
  FOUNDING_CAP,
};

export default signupService;
