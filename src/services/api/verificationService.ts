/**
 * verificationService.ts — mock (localStorage) provider-verification queue for
 * the owner cockpit (ticket T-OC-7, plan 07 §2).
 *
 * This is the REVIEW side of verification. A provider submits credentials
 * (visum / erkenningsnummer for regulated clinicians; a certificate for coaches)
 * and the owner approves or rejects. The decision is the SINGLE gate on the
 * Finder trust badge.
 *
 * THE is_regulated INVARIANT (ruling R8): `is_regulated` is DERIVED, never
 * self-declared. There is exactly one correct way to compute it —
 * `recomputeRegulated(type, verificationStatus)` in `@/lib/providerTypes`. This
 * service is the ONLY writer that flips a provider's verification_status to
 * `verified`; the moment it does, `recomputeRegulated(type, 'verified')` governs
 * whether the "Erkend hulpverlener" badge lights up. We never set an
 * `is_regulated` boolean directly — we set the verification decision and let the
 * derivation follow. approve() therefore records the new status AND exposes the
 * resulting badge via `recomputeRegulated`, so the UI can never drift from the law.
 *
 * BADGE LABELS (ruling R9, plan 07 §2):
 *   - regulated type + verified  → "Erkend hulpverlener"
 *   - coach/counselor + verified → "Geverifieerde coach"
 * The Finder ranking function must NOT read verification status as a weight
 * (dichotomieverbod — badges are transparency only).
 *
 * The pending queue is seeded from adminService.listProviders(): a psycholoog
 * awaiting a visum and a coach awaiting a certificate. Decisions persist to
 * localStorage; a reject "sends" a templated comms note to a mock outbox.
 */

import { adminService } from '@/services/api/adminService';
import {
  PROVIDER_TYPE_META,
  recomputeRegulated,
  type ProviderType,
  type VerificationStatus,
} from '@/lib/providerTypes';

// ── Types ────────────────────────────────────────────────────────────────────

export type VerificationDecisionStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'needs_info';

/** A single credential a provider submitted for review. */
export interface SubmittedCredential {
  /** e.g. 'visum', 'erkenningsnummer', 'certificate' — mirrors CredentialKind. */
  kind: string;
  /** Human label shown in the reviewer UI. */
  label: string;
  /** The claimed identifier (visum nr / erkenningsnummer), if any. */
  value?: string;
  /** Mock filename for the doc-preview placeholder. */
  fileName?: string;
}

/** One decision-trail row (mirrors the shared case_events concept). */
export interface VerificationEvent {
  id: string;
  action: 'submitted' | 'approved' | 'rejected' | 'needs_info' | 'note';
  actor: string;
  note?: string;
  at: string;
}

export interface ProviderVerification {
  id: string;
  providerId: string;
  providerName: string;
  providerType: ProviderType;
  /** Whether this type is eligible for the regulated badge at all. */
  regulatedType: boolean;
  status: VerificationDecisionStatus;
  /** The credentials submitted for review. */
  credentials: SubmittedCredential[];
  /** The reviewer's decision note (required on reject / needs_info). */
  decisionNote: string | null;
  /** ISO 8601 when the provider submitted. */
  submittedAt: string;
  /** ISO 8601 when a decision landed; null while pending. */
  decidedAt: string | null;
  events: VerificationEvent[];
}

/** A "sent" comms message (mock outbox) — a reject/needs_info produces one. */
export interface CommsNote {
  id: string;
  to: string;
  subject: string;
  body: string;
  at: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const QUEUE_KEY = 'bondable_provider_verifications';
const OUTBOX_KEY = 'bondable_verification_outbox';
const OWNER = 'Gaëtan (eigenaar)';

// ── localStorage helpers ────────────────────────────────────────────────────────

const hasWindow = typeof window !== 'undefined';

function read<T>(key: string, fallback: T): T {
  if (!hasWindow) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (!hasWindow) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* silent-fail */
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

// ── Status mapping ──────────────────────────────────────────────────────────────

/**
 * Map the queue decision status to the taxonomy's VerificationStatus so we can
 * feed `recomputeRegulated`. `approved` → 'verified'; a pending regulated type is
 * 'pending'; a rejection is 'rejected'.
 */
export function toVerificationStatus(
  s: VerificationDecisionStatus,
): VerificationStatus {
  switch (s) {
    case 'approved':
      return 'verified';
    case 'rejected':
      return 'rejected';
    case 'needs_info':
    case 'pending':
    default:
      return 'pending';
  }
}

/**
 * The resulting Finder badge label after a decision — computed from the LAW, not
 * hand-written. Regulated + verified → "Erkend hulpverlener"; coach + verified →
 * "Geverifieerde coach" (R9). Anything else → no trust badge yet.
 */
export function resultingBadge(v: ProviderVerification): {
  isRegulated: boolean;
  label: string | null;
} {
  const status = toVerificationStatus(v.status);
  const isRegulated = recomputeRegulated(v.providerType, status);
  if (isRegulated) {
    return { isRegulated: true, label: 'Erkend hulpverlener' };
  }
  if (!v.regulatedType && status === 'verified') {
    return { isRegulated: false, label: 'Geverifieerde coach' };
  }
  return { isRegulated: false, label: null };
}

// ── Seed ────────────────────────────────────────────────────────────────────

/**
 * Seed the pending queue: a psycholoog awaiting a visum + erkenningsnummer, and
 * a coach awaiting a certificate. Provider identity is pulled from
 * adminService.listProviders() where possible; falls back to concrete names.
 */
async function buildSeed(): Promise<ProviderVerification[]> {
  let clinicianName = 'Dr. Elke Vandromme';
  let coachName = 'Tom Vandenberghe';
  try {
    const providers = await adminService.listProviders();
    const regulated = providers.find((p) => p.isRegulated);
    const coach = providers.find((p) => !p.isRegulated);
    if (regulated) clinicianName = regulated.fullName;
    if (coach) coachName = coach.fullName;
  } catch {
    /* use fallback names */
  }

  const clinicianType: ProviderType = 'clinical_psychologist';
  const coachType: ProviderType = 'coach';

  return [
    {
      id: 'pv-1',
      providerId: 'pending-clinician',
      providerName: clinicianName,
      providerType: clinicianType,
      regulatedType: PROVIDER_TYPE_META[clinicianType].regulated,
      status: 'pending',
      credentials: [
        {
          kind: 'visum',
          label: 'Visumnummer (FOD Volksgezondheid)',
          value: '287451',
          fileName: 'visum-fod.pdf',
        },
        {
          kind: 'erkenningsnummer',
          label: 'Erkenningsnummer Psychologencommissie',
          value: '912.045.887',
          fileName: 'erkenning-compsy.pdf',
        },
      ],
      decisionNote: null,
      submittedAt: '2026-07-01T10:15:00Z',
      decidedAt: null,
      events: [
        {
          id: 'pv-1-ev-1',
          action: 'submitted',
          actor: clinicianName,
          note: 'Registratie als erkend klinisch psycholoog aangevraagd.',
          at: '2026-07-01T10:15:00Z',
        },
      ],
    },
    {
      id: 'pv-2',
      providerId: 'pending-coach',
      providerName: coachName,
      providerType: coachType,
      regulatedType: PROVIDER_TYPE_META[coachType].regulated,
      status: 'pending',
      credentials: [
        {
          kind: 'certificate',
          label: 'Certificaat stress- & veerkrachtcoaching',
          fileName: 'certificaat-coaching-academie.pdf',
        },
      ],
      decisionNote: null,
      submittedAt: '2026-07-02T08:40:00Z',
      decidedAt: null,
      events: [
        {
          id: 'pv-2-ev-1',
          action: 'submitted',
          actor: coachName,
          note: 'Verificatie als coach aangevraagd.',
          at: '2026-07-02T08:40:00Z',
        },
      ],
    },
    {
      id: 'pv-3',
      providerId: 'verified-psychotherapist',
      providerName: 'Maarten Claes',
      providerType: 'psychotherapist',
      regulatedType: PROVIDER_TYPE_META.psychotherapist.regulated,
      status: 'approved',
      credentials: [
        {
          kind: 'base_profession',
          label: 'Basisberoep (master klinische psychologie)',
          value: 'Master KUL 2014',
          fileName: 'diploma-kul.pdf',
        },
        {
          kind: 'psychotherapy_training',
          label: 'Psychotherapie-opleiding (4 jaar)',
          fileName: 'attest-psychotherapie.pdf',
        },
      ],
      decisionNote: 'Basisberoep en opleiding bevestigd in het federale register.',
      submittedAt: '2026-06-18T09:00:00Z',
      decidedAt: '2026-06-19T11:20:00Z',
      events: [
        {
          id: 'pv-3-ev-1',
          action: 'submitted',
          actor: 'Maarten Claes',
          at: '2026-06-18T09:00:00Z',
        },
        {
          id: 'pv-3-ev-2',
          action: 'approved',
          actor: OWNER,
          note: 'Geverifieerd in het register — badge Erkend hulpverlener toegekend.',
          at: '2026-06-19T11:20:00Z',
        },
      ],
    },
  ];
}

// ── Store ────────────────────────────────────────────────────────────────────

let seededPromise: Promise<ProviderVerification[]> | null = null;

async function loadQueue(): Promise<ProviderVerification[]> {
  const stored = read<ProviderVerification[] | null>(QUEUE_KEY, null);
  if (stored && Array.isArray(stored) && stored.length > 0) return stored;
  if (!seededPromise) {
    seededPromise = buildSeed().then((seed) => {
      write(QUEUE_KEY, seed);
      return seed;
    });
  }
  return seededPromise;
}

function persist(queue: ProviderVerification[]): void {
  write(QUEUE_KEY, queue);
}

function appendOutbox(note: CommsNote): void {
  const outbox = read<CommsNote[]>(OUTBOX_KEY, []);
  outbox.push(note);
  write(OUTBOX_KEY, outbox);
}

// ── Comms templates (NL first, per plan 07 §2) ─────────────────────────────────

function rejectionBody(v: ProviderVerification, note: string): string {
  const firstName = v.providerName.split(' ')[0];
  if (v.regulatedType) {
    const visum = v.credentials.find((c) => c.kind === 'visum')?.value ?? 'onbekend';
    return (
      `Dag ${firstName}, we konden je registratie als erkend hulpverlener nog niet ` +
      `bevestigen. Het opgegeven visumnummer (${visum}) vonden we niet terug in het ` +
      `federale register. Kijk je het even na? Je profiel blijft intussen zichtbaar ` +
      `als coach, zonder het label 'erkend hulpverlener'. — Het Bondable-team\n\n` +
      `Reden: ${note}`
    );
  }
  return (
    `Dag ${firstName}, we konden je certificaat nog niet verifiëren. Kijk je de ` +
    `documenten even na en dien je ze opnieuw in? — Het Bondable-team\n\n` +
    `Reden: ${note}`
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

export const verificationService = {
  /** All verifications, pending first then most-recently-decided. */
  async list(): Promise<ProviderVerification[]> {
    const queue = await loadQueue();
    return [...queue].sort((a, b) => {
      const pa = a.status === 'pending' || a.status === 'needs_info';
      const pb = b.status === 'pending' || b.status === 'needs_info';
      if (pa !== pb) return pa ? -1 : 1;
      return b.submittedAt.localeCompare(a.submittedAt);
    });
  },

  /** Only the pending / needs-info cases. */
  async listPending(): Promise<ProviderVerification[]> {
    const queue = await loadQueue();
    return queue
      .filter((v) => v.status === 'pending' || v.status === 'needs_info')
      .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  },

  /** A single verification by id. */
  async get(id: string): Promise<ProviderVerification | null> {
    const queue = await loadQueue();
    return queue.find((v) => v.id === id) ?? null;
  },

  /**
   * APPROVE. Sets status→approved. This is the single gate on `is_regulated`:
   * approving flips the underlying verification_status to 'verified', and the
   * badge is then GOVERNED by `recomputeRegulated(type, 'verified')` — a regulated
   * type earns "Erkend hulpverlener", a coach earns "Geverifieerde coach" (R8/R9).
   * We never write an `is_regulated` boolean by hand; the derivation is the law.
   * Returns the case with its resulting badge attached.
   */
  async approve(
    id: string,
    actor: string = OWNER,
  ): Promise<{ verification: ProviderVerification; badge: ReturnType<typeof resultingBadge> } | null> {
    const queue = await loadQueue();
    const v = queue.find((x) => x.id === id);
    if (!v) return null;
    v.status = 'approved';
    v.decidedAt = nowIso();
    // Derived, never self-declared: is_regulated follows from recomputeRegulated.
    const badge = resultingBadge(v);
    v.events.push({
      id: `${v.id}-ev-${v.events.length + 1}`,
      action: 'approved',
      actor,
      note: badge.label
        ? `Goedgekeurd — badge '${badge.label}' toegekend.`
        : 'Goedgekeurd.',
      at: v.decidedAt,
    });
    persist(queue);
    return { verification: v, badge };
  },

  /**
   * REJECT. Sets status→rejected, records the note, and "sends" a templated
   * rejection to the mock outbox. verification_status becomes 'rejected', so
   * `recomputeRegulated` yields false — no badge.
   */
  async reject(
    id: string,
    note: string,
    actor: string = OWNER,
  ): Promise<ProviderVerification | null> {
    const queue = await loadQueue();
    const v = queue.find((x) => x.id === id);
    if (!v) return null;
    v.status = 'rejected';
    v.decisionNote = note;
    v.decidedAt = nowIso();
    v.events.push({
      id: `${v.id}-ev-${v.events.length + 1}`,
      action: 'rejected',
      actor,
      note,
      at: v.decidedAt,
    });
    appendOutbox({
      id: `outbox-${v.id}-${v.events.length}`,
      to: v.providerName,
      subject: 'Je verificatie bij Bondable',
      body: rejectionBody(v, note),
      at: v.decidedAt,
    });
    persist(queue);
    return v;
  },

  /** The mock comms outbox (rejections/needs-info notes that were "sent"). */
  async outbox(): Promise<CommsNote[]> {
    return read<CommsNote[]>(OUTBOX_KEY, []);
  },

  /** Reset the queue + outbox to seed (dev/testing). */
  async reset(): Promise<void> {
    if (hasWindow) {
      try {
        window.localStorage.removeItem(QUEUE_KEY);
        window.localStorage.removeItem(OUTBOX_KEY);
      } catch {
        /* silent-fail */
      }
    }
    seededPromise = null;
  },
};

export default verificationService;
