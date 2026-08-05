/**
 * leadThreadService — the REPLY PATH for a Finder lead.
 *
 * THE GAP THIS CLOSES: a visitor could contact a hulpverlener without an
 * account, `finderService.createRequest` wrote a row, and that was the end of
 * it. Nothing reached the provider, nothing reached the visitor. This service
 * gives every lead a two-sided thread so the conversation can actually happen.
 *
 * WHY THE CONVERSATION LIVES HERE AND NOT IN PLAIN E-MAIL:
 *  - what a client writes about their mental health is special-category data
 *    (GDPR art. 9); plain e-mail is the wrong container for it;
 *  - the 48h lead-SLA and the record of what was promised stay in one place;
 *  - the client keeps a link, not an account — no signup wall on their worst
 *    day. A password is offered AFTER sending, never before.
 *
 * MOCK BACKEND: state lives in localStorage, exactly like practiceService. No
 * Math.random / Date.now at module scope, so importing this module is
 * deterministic and side-effect free; ids and timestamps are only minted inside
 * the mutating calls.
 *
 * E-MAIL IS A STUB. `queueEmail` appends to a local outbox and returns. Nothing
 * leaves the browser. Every surface that calls it must say so honestly — see
 * `listOutbox()` to inspect what WOULD have been sent.
 */

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export type LeadMessageFrom = 'client' | 'provider';

export interface LeadMessage {
  id: string;
  from: LeadMessageFrom;
  body: string;
  /** ISO timestamp. */
  at: string;
}

/**
 * open      — waiting for the hulpverlener (the 48h clock runs here)
 * answered  — the hulpverlener has replied at least once
 * closed    — archived; kept for the record, no new messages expected
 */
export type LeadThreadStatus = 'open' | 'answered' | 'closed';

export interface LeadThread {
  id: string;
  /** Opaque, unguessable. Drives the public /lead/:token page. */
  token: string;
  /** The finderService `provider_requests` row this thread belongs to. */
  requestId: string;
  providerId: string;
  providerName: string;
  clientName: string;
  clientEmail: string;
  topic: string | null;
  status: LeadThreadStatus;
  messages: LeadMessage[];
  createdAt: string;
  updatedAt: string;
  /** Last time the provider opened the thread (null = never). */
  providerReadAt: string | null;
  /** Last time the client opened the thread (null = never). */
  clientReadAt: string | null;
}

export interface CreateThreadInput {
  requestId: string;
  providerId: string;
  providerName: string;
  clientName: string;
  clientEmail: string;
  topic?: string | null;
  /** The client's first message — becomes message #1 of the thread. */
  message: string;
}

/** The stub templates this flow queues. Names only; no renderer is wired yet. */
export const LEAD_EMAIL_TEMPLATE = {
  /** To the hulpverlener: a new lead is waiting, answer within 48h. */
  providerNewLead: 'lead_provider_new',
  /** To the client: confirmation + the magic link to their thread. */
  clientConfirmation: 'lead_client_confirmation',
  /** To the client: the hulpverlener replied. */
  clientReply: 'lead_client_reply',
} as const;

export type LeadEmailTemplate =
  (typeof LEAD_EMAIL_TEMPLATE)[keyof typeof LEAD_EMAIL_TEMPLATE];

export interface QueueEmailInput {
  to: string;
  template: LeadEmailTemplate | string;
  vars?: Record<string, string>;
}

export interface OutboxEntry extends QueueEmailInput {
  id: string;
  vars: Record<string, string>;
  /** ISO timestamp of when it was QUEUED — never of when it was sent. */
  queuedAt: string;
  /**
   * Always 'queued'. There is no 'sent' state because nothing sends. When
   * Resend is wired this becomes a real delivery status.
   */
  status: 'queued';
}

/* -------------------------------------------------------------------------- */
/* Storage                                                                     */
/* -------------------------------------------------------------------------- */

const THREADS_KEY = 'bondable_lead_threads_v1';
const OUTBOX_KEY = 'bondable_outbox';

/** 48h lead SLA, in milliseconds. Shared by the provider inbox ageing badge. */
export const LEAD_SLA_MS = 48 * 60 * 60 * 1000;

const hasStorage = (): boolean =>
  typeof window !== 'undefined' && !!window.localStorage;

function readThreads(): LeadThread[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(THREADS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LeadThread[]) : [];
  } catch {
    return [];
  }
}

function writeThreads(threads: LeadThread[]): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
  } catch {
    /* quota / private mode — the demo degrades, it does not crash */
  }
}

function readOutbox(): OutboxEntry[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OutboxEntry[]) : [];
  } catch {
    return [];
  }
}

function writeOutbox(entries: OutboxEntry[]): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(entries));
  } catch {
    /* ignore */
  }
}

/* -------------------------------------------------------------------------- */
/* Ids                                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Opaque id. Prefers crypto.randomUUID (unguessable, which matters for a token
 * that grants access to health content); falls back to a non-crypto string only
 * where the API is unavailable (old Safari, insecure origin).
 */
function randomId(): string {
  try {
    const c = globalThis.crypto;
    if (c && typeof c.randomUUID === 'function') return c.randomUUID();
    if (c && typeof c.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      c.getRandomValues(bytes);
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    /* fall through to the non-crypto fallback */
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

const nowIso = (): string => new Date().toISOString();

/* -------------------------------------------------------------------------- */
/* Link helpers                                                                */
/* -------------------------------------------------------------------------- */

/** Route path for a thread. The parent wires /lead/:token. */
export const leadThreadPath = (token: string): string => `/lead/${token}`;

/** Absolute, shareable link — what the (stubbed) e-mail would contain. */
export function leadThreadUrl(token: string): string {
  const origin =
    typeof window !== 'undefined' && window.location
      ? window.location.origin
      : 'https://bondable.be';
  return `${origin}${leadThreadPath(token)}`;
}

/* -------------------------------------------------------------------------- */
/* Derived helpers                                                             */
/* -------------------------------------------------------------------------- */

/** Milliseconds since the client's last unanswered message (null if answered). */
export function waitingSince(thread: LeadThread): number | null {
  const lastProvider = [...thread.messages]
    .reverse()
    .find((m) => m.from === 'provider');
  if (lastProvider) return null;
  const first = thread.messages[0];
  const startedAt = first?.at ?? thread.createdAt;
  const ms = Date.now() - new Date(startedAt).getTime();
  return Number.isFinite(ms) ? Math.max(0, ms) : null;
}

/** True when an unanswered thread has passed the 48h lead SLA. */
export function isOverdue(thread: LeadThread): boolean {
  const waiting = waitingSince(thread);
  return waiting !== null && waiting > LEAD_SLA_MS;
}

const byNewest = (a: LeadThread, b: LeadThread): number =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

export const leadThreadService = {
  /**
   * Open a thread for a freshly created Finder lead. The client's own message
   * becomes the first entry, so the provider sees the question, not a stub.
   */
  async createThread(input: CreateThreadInput): Promise<LeadThread> {
    const at = nowIso();
    const thread: LeadThread = {
      id: randomId(),
      token: randomId(),
      requestId: input.requestId,
      providerId: input.providerId,
      providerName: input.providerName,
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      topic: input.topic?.trim() ? input.topic.trim() : null,
      status: 'open',
      messages: input.message.trim()
        ? [{ id: randomId(), from: 'client', body: input.message.trim(), at }]
        : [],
      createdAt: at,
      updatedAt: at,
      providerReadAt: null,
      clientReadAt: at,
    };
    const threads = readThreads();
    threads.push(thread);
    writeThreads(threads);
    return thread;
  },

  /** Resolve the public /lead/:token page. Returns null for unknown tokens. */
  async getByToken(token: string): Promise<LeadThread | null> {
    if (!token) return null;
    return readThreads().find((t) => t.token === token) ?? null;
  },

  /** Resolve by internal id (used by the provider inbox). */
  async getById(id: string): Promise<LeadThread | null> {
    if (!id) return null;
    return readThreads().find((t) => t.id === id) ?? null;
  },

  /** All threads addressed to one hulpverlener, newest first. */
  async listForProvider(providerId: string): Promise<LeadThread[]> {
    if (!providerId) return [];
    return readThreads()
      .filter((t) => t.providerId === providerId)
      .sort(byNewest);
  },

  /** The thread belonging to a finderService request row, if any. */
  async getByRequestId(requestId: string): Promise<LeadThread | null> {
    if (!requestId) return null;
    return readThreads().find((t) => t.requestId === requestId) ?? null;
  },

  /**
   * Append a message. Accepts either the public token or the internal id, so
   * the client page and the provider inbox can both call it.
   */
  async addMessage(
    tokenOrId: string,
    from: LeadMessageFrom,
    body: string,
  ): Promise<LeadThread | null> {
    const text = body.trim();
    if (!tokenOrId || !text) return null;
    const threads = readThreads();
    const idx = threads.findIndex(
      (t) => t.token === tokenOrId || t.id === tokenOrId,
    );
    if (idx === -1) return null;
    const at = nowIso();
    const current = threads[idx];
    const next: LeadThread = {
      ...current,
      messages: [...current.messages, { id: randomId(), from, body: text, at }],
      status: from === 'provider' ? 'answered' : current.status,
      updatedAt: at,
      // The author has by definition read everything up to now.
      providerReadAt: from === 'provider' ? at : current.providerReadAt,
      clientReadAt: from === 'client' ? at : current.clientReadAt,
    };
    threads[idx] = next;
    writeThreads(threads);
    return next;
  },

  /** Stamp the thread as read by one side. No-op for unknown tokens/ids. */
  async markRead(
    tokenOrId: string,
    who: LeadMessageFrom,
  ): Promise<LeadThread | null> {
    if (!tokenOrId) return null;
    const threads = readThreads();
    const idx = threads.findIndex(
      (t) => t.token === tokenOrId || t.id === tokenOrId,
    );
    if (idx === -1) return null;
    const at = nowIso();
    threads[idx] = {
      ...threads[idx],
      providerReadAt: who === 'provider' ? at : threads[idx].providerReadAt,
      clientReadAt: who === 'client' ? at : threads[idx].clientReadAt,
    };
    writeThreads(threads);
    return threads[idx];
  },

  /**
   * STUB — appends to a local `bondable_outbox` and returns. IT DOES NOT SEND.
   *
   * There is no mail transport in this build; Resend lands in a later phase.
   * Until then no surface may tell a person "we sent you an e-mail" — say what
   * is true instead ("bewaar deze link") and use `listOutbox()` to show what
   * would have gone out.
   */
  async queueEmail(input: QueueEmailInput): Promise<OutboxEntry> {
    const entry: OutboxEntry = {
      id: randomId(),
      to: input.to,
      template: input.template,
      vars: input.vars ?? {},
      queuedAt: nowIso(),
      status: 'queued',
    };
    const outbox = readOutbox();
    outbox.push(entry);
    // Keep the demo outbox bounded — it is an inspection aid, not a mailbox.
    writeOutbox(outbox.slice(-100));
    return entry;
  },

  /** Everything that WOULD have been e-mailed, newest last. Demo-inspectable. */
  async listOutbox(): Promise<OutboxEntry[]> {
    return readOutbox();
  },

  /** Empty the stub outbox (demo housekeeping). */
  async clearOutbox(): Promise<void> {
    writeOutbox([]);
  },
};

export default leadThreadService;
