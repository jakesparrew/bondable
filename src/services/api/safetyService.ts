/**
 * safetyService.ts — mock (localStorage) Trust & Safety work-queue for the
 * Bondable owner cockpit (tickets T-OC-6 + T-OC-5, plan 07 §3).
 *
 * A safety_case is the triage primitive: it has a status, an assignee, a
 * severity and — critically — an append-only audit trail (case_events). Every
 * assign / resolve / escalate mutates the case AND appends a case_event, so the
 * owner can always answer "who looked at what, and when". For Art. 9 health
 * data this audit trail is not optional.
 *
 * SOURCES of a case (plan 07 §3 flow):
 *   - `bond_crisis`   — Bond's client-side crisis guardrail fired (severity
 *                       critical). This is the T-OC-5 hook: a crisis phrase in
 *                       the bond engine creates a case here.
 *   - `checkin`       — a client check-in went unacknowledged >48h; the owner
 *                       backstops an inattentive provider.
 *   - `assessment`    — an intake/assessment score crossed a risk threshold.
 *
 * The open crisis cases are DERIVED from adminService's flagged conversations
 * (so the demo's seeded flagged Bond chat becomes a live case, transcript and
 * all), then merged with a few seeded crisis/checkin/assessment events. Mutations
 * persist to localStorage so the demo survives a reload; the seed is the source
 * of truth on first run.
 *
 * Mock: no backend. When the real DB lands (plan 08) the same function
 * signatures swap to `safety_cases` / `case_events` rows (schema plan 07 §3).
 */

import { adminService, type AdminConversation } from '@/services/api/adminService';

// ── Types ────────────────────────────────────────────────────────────────────

export type SafetySource = 'bond_crisis' | 'checkin' | 'assessment';

export type SafetySeverity = 'info' | 'elevated' | 'critical';

export type SafetyStatus = 'open' | 'assigned' | 'resolved' | 'escalated';

/** The `resolution` enum — a resolve must pick one, no silent closes (plan 07 §3). */
export type SafetyResolution =
  | 'no_action'
  | 'user_contacted'
  | 'provider_notified'
  | 'authority_referred'
  | 'content_removed';

/** One row in the append-only audit trail shared with verification & GDPR queues. */
export interface CaseEvent {
  id: string;
  action:
    | 'opened'
    | 'assigned'
    | 'resolved'
    | 'escalated'
    | 'transcript_viewed'
    | 'note';
  /** Who performed the action. Mock: the owner. */
  actor: string;
  /** Free-text note (required on escalate, optional elsewhere). */
  note?: string;
  /** ISO 8601. */
  at: string;
}

export interface SafetyCase {
  id: string;
  clientName: string;
  providerName: string | null;
  source: SafetySource;
  severity: SafetySeverity;
  status: SafetyStatus;
  /** The admin/owner this case is assigned to, once assigned. */
  assignee: string | null;
  /** The chosen resolution once resolved; null until then. */
  resolution: SafetyResolution | null;
  /** Links to the underlying conversation (crisis cases) for the transcript view. */
  conversationId: string | null;
  /** Short human summary of why the case exists. */
  summary: string;
  /** ISO 8601 when the case was opened. */
  openedAt: string;
  /** Append-only audit trail. */
  events: CaseEvent[];
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CASES_KEY = 'bondable_safety_cases';
const OWNER = 'Gaëtan (eigenaar)';

/** SLA windows in hours by severity — the queue header shows breach counts. */
export const SLA_HOURS: Record<SafetySeverity, number> = {
  critical: 24,
  elevated: 48,
  info: 120,
};

// ── localStorage helpers (silent-fail, SSR-safe) ───────────────────────────────

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
    /* silent-fail (quota / private mode) */
  }
}

function nowIso(): string {
  // Anchor to the demo's fixed "today" so relative timings read sensibly, but
  // still move forward within a session so audit trails order correctly.
  return new Date().toISOString();
}

function eventId(caseId: string, n: number): string {
  return `${caseId}-ev-${n}`;
}

// ── Seed ────────────────────────────────────────────────────────────────────

/**
 * Cases that don't derive from a flagged conversation: an unacknowledged
 * check-in and an assessment that crossed a risk threshold. Concrete Flemish
 * names, real dates, no exclamation marks.
 */
const SEED_STANDALONE: SafetyCase[] = [
  {
    id: 'sc-checkin-1',
    clientName: 'Yasmine Haddad',
    providerName: 'Naïma Bakkali',
    source: 'checkin',
    severity: 'elevated',
    status: 'open',
    assignee: null,
    resolution: null,
    conversationId: null,
    summary:
      'Check-in van 30 juni staat al meer dan 48 uur onbeantwoord bij de begeleider.',
    openedAt: '2026-06-30T09:00:00Z',
    events: [
      {
        id: 'sc-checkin-1-ev-1',
        action: 'opened',
        actor: 'systeem',
        note: 'Automatisch aangemaakt: check-in ouder dan 48 uur zonder opvolging.',
        at: '2026-06-30T09:00:00Z',
      },
    ],
  },
  {
    id: 'sc-assess-1',
    clientName: 'Wout Verhoeven',
    providerName: 'Maarten Claes',
    source: 'assessment',
    severity: 'elevated',
    status: 'open',
    assignee: null,
    resolution: null,
    conversationId: null,
    summary:
      'PHQ-9 intake scoorde 18 (matig-ernstig) met een positieve item-9-signaal.',
    openedAt: '2026-06-29T14:20:00Z',
    events: [
      {
        id: 'sc-assess-1-ev-1',
        action: 'opened',
        actor: 'systeem',
        note: 'Automatisch aangemaakt: risicodrempel overschreden bij intake-assessment.',
        at: '2026-06-29T14:20:00Z',
      },
    ],
  },
  {
    id: 'sc-checkin-2',
    clientName: 'Bram Wouters',
    providerName: 'Dr. Anke Willems',
    source: 'checkin',
    severity: 'info',
    status: 'resolved',
    assignee: OWNER,
    resolution: 'provider_notified',
    conversationId: null,
    summary:
      'Inactieve cliënt zonder check-in sinds begin mei — begeleider gevraagd op te volgen.',
    openedAt: '2026-06-20T10:00:00Z',
    events: [
      {
        id: 'sc-checkin-2-ev-1',
        action: 'opened',
        actor: 'systeem',
        at: '2026-06-20T10:00:00Z',
      },
      {
        id: 'sc-checkin-2-ev-2',
        action: 'assigned',
        actor: OWNER,
        note: 'Zelf opgepakt.',
        at: '2026-06-20T11:12:00Z',
      },
      {
        id: 'sc-checkin-2-ev-3',
        action: 'resolved',
        actor: OWNER,
        note: 'Anke gecontacteerd, zij neemt deze week contact op met Bram.',
        at: '2026-06-20T11:30:00Z',
      },
    ],
  },
];

/**
 * Derive a crisis case from a flagged Bond conversation. The severity is
 * critical (a crisis guardrail fired); the case links to the conversation so the
 * Browse tab can show the read-only transcript.
 */
function crisisFromConversation(conv: AdminConversation): SafetyCase {
  const openedAt = conv.lastMessageAt;
  return {
    id: `sc-crisis-${conv.id}`,
    clientName: conv.clientName,
    providerName: conv.supervisingTherapistName ?? null,
    source: 'bond_crisis',
    severity: 'critical',
    status: 'open',
    assignee: null,
    resolution: null,
    conversationId: conv.id,
    summary:
      'Bond-crisisdetectie ging af tijdens een AI-gesprek — mogelijke suïcidale ideatie.',
    openedAt,
    events: [
      {
        id: `sc-crisis-${conv.id}-ev-1`,
        action: 'opened',
        actor: 'systeem',
        note: 'Automatisch aangemaakt door de Bond-crisisguardrail (bond.crisis_triggered).',
        at: openedAt,
      },
    ],
  };
}

/** Build the full seed set: derived crisis cases + standalone seeds. */
async function buildSeed(): Promise<SafetyCase[]> {
  let derived: SafetyCase[] = [];
  try {
    const flagged = await adminService.listConversations({ status: 'flagged' });
    derived = flagged
      .filter((c) => c.type === 'bond')
      .map(crisisFromConversation);
  } catch {
    /* no flagged conversations available — standalone seeds still apply */
  }
  // Crisis cases first (most severe), then the standalone seeds.
  return [...derived, ...SEED_STANDALONE];
}

// ── Store (seed-once, then localStorage is source of truth) ────────────────────

let seededPromise: Promise<SafetyCase[]> | null = null;

async function loadCases(): Promise<SafetyCase[]> {
  const stored = read<SafetyCase[] | null>(CASES_KEY, null);
  if (stored && Array.isArray(stored) && stored.length > 0) return stored;
  if (!seededPromise) {
    seededPromise = buildSeed().then((seed) => {
      write(CASES_KEY, seed);
      return seed;
    });
  }
  return seededPromise;
}

function persist(cases: SafetyCase[]): void {
  write(CASES_KEY, cases);
}

// ── Sorting ────────────────────────────────────────────────────────────────────

const SEVERITY_RANK: Record<SafetySeverity, number> = {
  critical: 0,
  elevated: 1,
  info: 2,
};

/** Open cases first, then by severity, then oldest-opened first (age = urgency). */
function queueSort(a: SafetyCase, b: SafetyCase): number {
  const openA = a.status === 'open' || a.status === 'assigned' || a.status === 'escalated';
  const openB = b.status === 'open' || b.status === 'assigned' || b.status === 'escalated';
  if (openA !== openB) return openA ? -1 : 1;
  const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (sev !== 0) return sev;
  return a.openedAt.localeCompare(b.openedAt);
}

/** Whether a case has breached its SLA window (only meaningful while unresolved). */
export function isSlaBreached(c: SafetyCase, refIso?: string): boolean {
  if (c.status === 'resolved') return false;
  const opened = Date.parse(c.openedAt);
  if (Number.isNaN(opened)) return false;
  const ref = refIso ? Date.parse(refIso) : Date.now();
  const hours = (ref - opened) / 36e5;
  return hours > SLA_HOURS[c.severity];
}

// ── Public API ────────────────────────────────────────────────────────────────

export const safetyService = {
  /** All cases, queue-sorted (open + severe first). Returns a copy. */
  async list(): Promise<SafetyCase[]> {
    const cases = await loadCases();
    return [...cases].sort(queueSort);
  },

  /** Only the actionable (non-resolved) cases, queue-sorted. */
  async listOpen(): Promise<SafetyCase[]> {
    const cases = await loadCases();
    return cases.filter((c) => c.status !== 'resolved').sort(queueSort);
  },

  /** A single case by id. */
  async get(id: string): Promise<SafetyCase | null> {
    const cases = await loadCases();
    return cases.find((c) => c.id === id) ?? null;
  },

  /** Count of unresolved cases that have breached their SLA (for the header). */
  async breachCount(): Promise<number> {
    const cases = await loadCases();
    return cases.filter((c) => isSlaBreached(c)).length;
  },

  /**
   * Assign the case to the current owner. Sets status→assigned and appends an
   * `assigned` case_event.
   */
  async assign(id: string, actor: string = OWNER): Promise<SafetyCase | null> {
    const cases = await loadCases();
    const c = cases.find((x) => x.id === id);
    if (!c) return null;
    c.assignee = actor;
    if (c.status === 'open') c.status = 'assigned';
    c.events.push({
      id: eventId(c.id, c.events.length + 1),
      action: 'assigned',
      actor,
      note: 'Zelf opgepakt.',
      at: nowIso(),
    });
    persist(cases);
    return c;
  },

  /**
   * Resolve the case. A `resolution` value is REQUIRED — there are no silent
   * closes (plan 07 §3). Sets status→resolved and appends a `resolved` event.
   */
  async resolve(
    id: string,
    resolution: SafetyResolution,
    note?: string,
    actor: string = OWNER,
  ): Promise<SafetyCase | null> {
    const cases = await loadCases();
    const c = cases.find((x) => x.id === id);
    if (!c) return null;
    c.status = 'resolved';
    c.resolution = resolution;
    if (!c.assignee) c.assignee = actor;
    c.events.push({
      id: eventId(c.id, c.events.length + 1),
      action: 'resolved',
      actor,
      note,
      at: nowIso(),
    });
    persist(cases);
    return c;
  },

  /**
   * Escalate the case: pins it, (mock) notifies the owner, and REQUIRES a note.
   * Sets status→escalated and appends an `escalated` event.
   */
  async escalate(
    id: string,
    note: string,
    actor: string = OWNER,
  ): Promise<SafetyCase | null> {
    const cases = await loadCases();
    const c = cases.find((x) => x.id === id);
    if (!c) return null;
    c.status = 'escalated';
    if (!c.assignee) c.assignee = actor;
    c.events.push({
      id: eventId(c.id, c.events.length + 1),
      action: 'escalated',
      actor,
      note,
      at: nowIso(),
    });
    persist(cases);
    return c;
  },

  /**
   * Record that an admin opened a case's transcript. Per plan 07 §3 every read
   * of a client conversation must itself be audited (Art. 9). Appends a
   * `transcript_viewed` event; de-duplicated within the same session so we don't
   * spam the trail on re-renders.
   */
  async logTranscriptView(id: string, actor: string = OWNER): Promise<void> {
    const cases = await loadCases();
    const c = cases.find((x) => x.id === id);
    if (!c) return;
    const last = c.events[c.events.length - 1];
    if (last && last.action === 'transcript_viewed' && last.actor === actor) return;
    c.events.push({
      id: eventId(c.id, c.events.length + 1),
      action: 'transcript_viewed',
      actor,
      note: 'Transcript bekeken (alleen-lezen).',
      at: nowIso(),
    });
    persist(cases);
  },

  /** Reset the store to seed (dev/testing). */
  async reset(): Promise<void> {
    if (hasWindow) {
      try {
        window.localStorage.removeItem(CASES_KEY);
      } catch {
        /* silent-fail */
      }
    }
    seededPromise = null;
  },
};

export default safetyService;
