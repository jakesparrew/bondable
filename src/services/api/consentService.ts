/**
 * consentService.ts — the Consent & Data Center's mock backend (ticket T-CX-4).
 *
 * This is the seed of platform layer 4 (the client-owned, portable profile).
 * Everything a provider can ever see about a client is modelled here as an
 * explicit, revocable *grant*: a plain-language artifact type, a status the
 * client controls, and a "who can see this" line. Revoking is retroactive by
 * design — flipping a grant off means the provider loses access going forward
 * AND the past artifact is hidden (Decision 7 in 03-client-experience.md).
 *
 * Per ruling R17 (transparency), every provider read is logged and surfaced back
 * to the client as an access-log line ("Bekeken door je begeleider op {date}").
 * Nothing here interprets or scores clinical data — it only records who saw what.
 *
 * Mock-backed: state lives in localStorage so the explorable demo works offline
 * and survives reloads. The exported API shape is deliberately the one 04-platform
 * will implement server-side against the `consent_grants` / `data_export_requests`
 * tables — callers do not change when persistence moves. No analytics side effects
 * live here; a crisis/safety artifact is never a consent target and never appears
 * in this list.
 */

// ── Types ───────────────────────────────────────────────────────────────────

/** The provider-visible artifact categories a client can grant or revoke. */
export type ConsentArtifactType =
  | "bond_supervision"
  | "journal_share"
  | "weekly_summary"
  | "health_processing"
  | "session_notes";

export type ConsentStatus = "granted" | "revoked";

export interface ConsentGrant {
  id: string;
  artifactType: ConsentArtifactType;
  /** Plain-language name shown in the ledger (NL). */
  label: string;
  /** One calm line explaining what this grant means, in plain language (NL). */
  description: string;
  /** "Wie kan dit zien" — the human this is shared with, or a system role. */
  audience: string;
  status: ConsentStatus;
  /** ISO timestamp of the last status change (grant or revoke). */
  lastChangedAt: string;
  /**
   * When true this grant is required for the care relationship to function
   * (e.g. processing health data at all). It stays revocable, but revoking it
   * carries a heavier explanation — never a dark pattern, just honest weight.
   */
  foundational?: boolean;
}

/** One line in the R17 access log: a provider viewed a specific artifact. */
export interface AccessLogEntry {
  id: string;
  /** Who performed the read (the provider, by name). */
  viewer: string;
  /** Which artifact category was read. */
  artifactType: ConsentArtifactType;
  /** Human-readable label of what was viewed. */
  artifactLabel: string;
  /** ISO timestamp of the read. */
  viewedAt: string;
}

export type ExportFormat = "json" | "pdf";
export type ExportStatus = "requested" | "fulfilled";

export interface DataExportRequest {
  id: string;
  format: ExportFormat;
  status: ExportStatus;
  requestedAt: string;
  fulfilledAt: string | null;
}

// ── Storage ─────────────────────────────────────────────────────────────────

const GRANTS_KEY = "bondable_consent_grants";
const LOG_KEY = "bondable_consent_access_log";
const EXPORTS_KEY = "bondable_consent_exports";
const hasWindow = typeof window !== "undefined";

function read<T>(key: string, fallback: T): T {
  if (!hasWindow) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (!hasWindow) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* silent-fail (quota, private mode) */
  }
}

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

// ── Seeds ───────────────────────────────────────────────────────────────────

/** The provider this demo client (Lotte Vermeulen) is connected to. */
const PROVIDER_NAME = "Sofie Maes";

/**
 * Sensible privacy-first defaults: health processing is on (the relationship
 * cannot exist without it), Bond supervision is on (its own safety contract),
 * and everything a client authors — journal, weekly summary, session notes —
 * defaults to private. This mirrors Decision 7: default private, opt-in to share.
 */
function seedGrants(): ConsentGrant[] {
  const now = new Date();
  const daysAgo = (d: number) =>
    new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();
  return [
    {
      id: uid("grant"),
      artifactType: "health_processing",
      label: "Gezondheidsgegevens verwerken",
      description:
        "Bondable mag je gegevens over je welzijn verwerken zodat je begeleiding werkt. Zonder deze toestemming kan de begeleiding niet doorgaan.",
      audience: "Bondable en je begeleider",
      status: "granted",
      lastChangedAt: daysAgo(42),
      foundational: true,
    },
    {
      id: uid("grant"),
      artifactType: "bond_supervision",
      label: "Bond-activatie en supervisie",
      description:
        "Bond, je gespreksmaatje, staat aan. Je begeleider kan meekijken wanneer dat nodig is voor je veiligheid. Die momenten worden altijd getoond en bijgehouden.",
      audience: `${PROVIDER_NAME}, bij een veiligheidssignaal`,
      status: "granted",
      lastChangedAt: daysAgo(42),
      foundational: true,
    },
    {
      id: uid("grant"),
      artifactType: "journal_share",
      label: "Dagboek delen",
      description:
        "Je dagboekfragmenten blijven privé, tenzij je een fragment zelf deelt. Zet je dit uit, dan ziet je begeleider niets uit je dagboek.",
      audience: PROVIDER_NAME,
      status: "revoked",
      lastChangedAt: daysAgo(7),
    },
    {
      id: uid("grant"),
      artifactType: "weekly_summary",
      label: "Wekelijkse samenvatting",
      description:
        "Bond maakt elke week een kort overzicht. Jij beslist per keer of je begeleider het mag lezen. Deze schakelaar bepaalt of delen überhaupt mogelijk is.",
      audience: PROVIDER_NAME,
      status: "revoked",
      lastChangedAt: daysAgo(14),
    },
    {
      id: uid("grant"),
      artifactType: "session_notes",
      label: "Sessienotities inzien",
      description:
        "Je mag de notities lezen die je begeleider na een gesprek maakt. Deze toestemming regelt of die notities voor jou zichtbaar zijn.",
      audience: `Jij en ${PROVIDER_NAME}`,
      status: "granted",
      lastChangedAt: daysAgo(21),
    },
  ];
}

/**
 * A short, realistic R17 access log — the provider viewed things the client
 * actually shared. Only reads of *granted* artifacts appear (you cannot view
 * what was never shared), which keeps the log honest against the grant state.
 */
function seedAccessLog(): AccessLogEntry[] {
  const now = new Date();
  const daysAgo = (d: number, h = 10) => {
    const dt = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    dt.setHours(h, 0, 0, 0);
    return dt.toISOString();
  };
  return [
    {
      id: uid("view"),
      viewer: PROVIDER_NAME,
      artifactType: "session_notes",
      artifactLabel: "Sessienotitie — gesprek 24 juni",
      viewedAt: daysAgo(2, 9),
    },
    {
      id: uid("view"),
      viewer: PROVIDER_NAME,
      artifactType: "health_processing",
      artifactLabel: "Stemmingsoverzicht (laatste 30 dagen)",
      viewedAt: daysAgo(4, 14),
    },
    {
      id: uid("view"),
      viewer: PROVIDER_NAME,
      artifactType: "session_notes",
      artifactLabel: "Sessienotitie — gesprek 17 juni",
      viewedAt: daysAgo(9, 11),
    },
    {
      id: uid("view"),
      viewer: PROVIDER_NAME,
      artifactType: "health_processing",
      artifactLabel: "Vragenlijst PHQ-9 — resultaat",
      viewedAt: daysAgo(16, 15),
    },
  ];
}

// ── Grants API ──────────────────────────────────────────────────────────────

/** List every consent grant, seeding privacy-first defaults on first run. */
export function listGrants(): ConsentGrant[] {
  const existing = read<ConsentGrant[] | null>(GRANTS_KEY, null);
  if (existing && Array.isArray(existing) && existing.length > 0) return existing;
  const seeded = seedGrants();
  write(GRANTS_KEY, seeded);
  return seeded;
}

/**
 * Flip a grant on or off. Revoking is retroactive (Decision 7): the provider
 * loses access going forward and the past artifact is hidden. Returns the full
 * updated list so callers can re-render from a single source of truth.
 */
export function setGrantStatus(
  id: string,
  status: ConsentStatus,
): ConsentGrant[] {
  const grants = listGrants().map((g) =>
    g.id === id ? { ...g, status, lastChangedAt: new Date().toISOString() } : g,
  );
  write(GRANTS_KEY, grants);
  return grants;
}

/** Convenience toggle used by the ledger row switches. */
export function toggleGrant(id: string): ConsentGrant[] {
  const grant = listGrants().find((g) => g.id === id);
  if (!grant) return listGrants();
  return setGrantStatus(grant.id, grant.status === "granted" ? "revoked" : "granted");
}

// ── Access log API (R17) ────────────────────────────────────────────────────

/**
 * The R17 transparency log, newest first. Only reads of currently-granted
 * artifact categories are shown — revoking a category hides its past reads too,
 * so the log can never contradict the current sharing state.
 */
export function listAccessLog(): AccessLogEntry[] {
  const existing = read<AccessLogEntry[] | null>(LOG_KEY, null);
  const log = existing && Array.isArray(existing) ? existing : seedAccessLog();
  if (!existing) write(LOG_KEY, log);
  const granted = new Set(
    listGrants().filter((g) => g.status === "granted").map((g) => g.artifactType),
  );
  return [...log]
    .filter((e) => granted.has(e.artifactType))
    .sort((a, b) => b.viewedAt.localeCompare(a.viewedAt));
}

// ── Data inventory ──────────────────────────────────────────────────────────

export interface DataInventory {
  journalEntries: number;
  checkins: number;
  questionnaires: number;
  bondMessages: number;
  sessions: number;
}

/**
 * A plain-language count of what the client's profile holds. Numbers are stable
 * demo figures — the real inventory comes from 04-platform's serializer, which
 * shares one shape with the admin GDPR bundle (compliance-gate §4).
 */
export function getDataInventory(): DataInventory {
  return {
    journalEntries: 12,
    checkins: 34,
    questionnaires: 3,
    bondMessages: 58,
    sessions: 6,
  };
}

// ── Export API ──────────────────────────────────────────────────────────────

/**
 * Assemble the demo profile as a portable object. This is the honest instant
 * win called for in the plan: a client-side JSON snapshot of their own data,
 * built from the mock state, so "neem alles mee" is real even before the server
 * serializer lands. Crisis/safety data is intentionally excluded.
 */
export function buildExportPayload(): Record<string, unknown> {
  return {
    _meta: {
      product: "Bondable",
      subject: "Lotte Vermeulen",
      generatedAt: new Date().toISOString(),
      note: "Voorbeeldexport in demomodus. De volledige export komt van de server.",
    },
    inventory: getDataInventory(),
    consentGrants: listGrants().map((g) => ({
      artifact: g.artifactType,
      label: g.label,
      status: g.status,
      audience: g.audience,
      lastChangedAt: g.lastChangedAt,
    })),
    accessLog: listAccessLog().map((e) => ({
      viewer: e.viewer,
      artifact: e.artifactLabel,
      viewedAt: e.viewedAt,
    })),
  };
}

/** List prior export requests (for showing status in the UI). */
export function listExportRequests(): DataExportRequest[] {
  return read<DataExportRequest[]>(EXPORTS_KEY, []);
}

/**
 * Record an export request. In the mock it fulfils instantly (the JSON is built
 * client-side); the returned record is stored so the UI can show a small history.
 */
export function recordExportRequest(format: ExportFormat): DataExportRequest {
  const now = new Date().toISOString();
  const request: DataExportRequest = {
    id: uid("export"),
    format,
    status: "fulfilled",
    requestedAt: now,
    fulfilledAt: now,
  };
  const all = [request, ...listExportRequests()].slice(0, 10);
  write(EXPORTS_KEY, all);
  return request;
}

/**
 * Record a data-erasure request. This is a stub for the mock: it logs the
 * intent so the confirm flow has something honest to return. Real erasure runs
 * through 04-platform's gdpr_requests queue with the retention matrix applied
 * (compliance-gate §2) — this never silently deletes in demo mode.
 */
export function recordErasureRequest(): { acknowledgedAt: string } {
  return { acknowledgedAt: new Date().toISOString() };
}

/** Reset all consent state (dev/testing). */
export function clearConsentState(): void {
  if (!hasWindow) return;
  try {
    window.localStorage.removeItem(GRANTS_KEY);
    window.localStorage.removeItem(LOG_KEY);
    window.localStorage.removeItem(EXPORTS_KEY);
  } catch {
    /* silent-fail */
  }
}

/** Grouped export for callers that prefer a namespace. */
export const consentService = {
  listGrants,
  setGrantStatus,
  toggleGrant,
  listAccessLog,
  getDataInventory,
  buildExportPayload,
  listExportRequests,
  recordExportRequest,
  recordErasureRequest,
  clearConsentState,
};
