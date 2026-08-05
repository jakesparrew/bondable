/**
 * invoiceService.ts — mock (localStorage) client-invoicing engine for Belgian
 * care providers (ticket T-PX-16, ruling R11).
 *
 * SCOPE — this is invoicing *clients*, the paper a provider hands (or mails) to
 * the person they see. It is NOT the Bondable subscription: the provider's own
 * subscription lives at /dashboard/provider/billing (R11 splits the two routes).
 * This module powers /dashboard/therapist/invoicing only.
 *
 * BELGIUM CONTEXT (the differentiator — plan 04 §6):
 *   - VAT / BTW: many care acts are exempt under art. 44 §1 W.BTW. Regulated
 *     psychologen/therapeuten default to `vat_exempt_art44`, which prints the
 *     legally required exemption clause; coaches default to `vat_21`;
 *     kleine-onderneming providers use `small_business_exempt`. Always overridable.
 *   - Mutualiteit / terugbetaling: a free-text `mutualiteitNote` per invoice for
 *     the attest a client submits to CM / Helan / Solidaris. Bondable never
 *     guarantees reimbursement — that is the ziekenfonds' call.
 *   - Gapless numbering: Belgian invoices must be sequentially numbered with no
 *     gaps per provider. We allocate the number only when a draft is *issued*
 *     (sent/paid), never on draft creation, and numbers are immutable afterward.
 *   - Privacy: line descriptions default to a neutral "Consultatie — 60 min",
 *     never a diagnosis or session topic.
 *
 * Mock: everything persists to localStorage so demo mode works with no backend.
 * When the real DB lands (plan 08) it swaps behind the same function signatures.
 * The shapes here mirror the schema in plan 04 §6 (provider_billing_settings /
 * invoices / invoice_lines) so the Neon cutover is byte-compatible.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type VatStatus = 'vat_exempt_art44' | 'vat_21' | 'small_business_exempt';

export type InvoiceStatus = 'draft' | 'sent' | 'paid';

/** Provider-level billing configuration (one row per provider). */
export interface ProviderBillingSettings {
  providerId: string;
  /** Legal name printed on the invoice (person or praktijk). */
  legalName: string;
  /** KBO/BCE enterprise number, e.g. "BE 0123.456.789". */
  enterpriseNumber: string;
  /** Practice address, printed as the sender block. */
  practiceAddress: string;
  vatStatus: VatStatus;
  iban: string;
  /** Erkennings-/visumnummer — appears on the terugbetaling attest. */
  recognitionNumber: string;
  /** Default consultation rate in cents (EUR). */
  defaultRateCents: number;
  /** Numbering prefix; combined with a padded counter → "2026-0001". */
  numberingPrefix: string;
  /** Next sequence number to allocate (gapless per provider). */
  nextNumber: number;
  /** Footer line printed under the totals (payment terms etc.). */
  invoiceFooter: string;
}

/** A single invoice line, usually one per billed session. */
export interface InvoiceLine {
  id: string;
  /** Source session (nullable for manual lines). */
  sessionId: string | null;
  /** Neutral, non-clinical description. */
  description: string;
  qty: number;
  unitCents: number;
  /** 0 for exempt lines; 21 for standard-rated coaching. */
  vatRate: number;
}

export interface Invoice {
  id: string;
  providerId: string;
  clientId: string;
  /** Concrete client name for the PDF (initials only in exports). */
  clientName: string;
  /** Allocated only when issued; empty while draft. Immutable once set. */
  number: string;
  issueDate: string; // ISO date (yyyy-mm-dd)
  dueDate: string; // ISO date
  status: InvoiceStatus;
  lines: InvoiceLine[];
  /** VAT status captured at issue so a later settings change can't rewrite it. */
  vatStatus: VatStatus;
  /** Free-text note for the ziekenfonds/mutualiteit attest. */
  mutualiteitNote: string;
  createdAt: string; // ISO datetime
  sentAt: string | null;
  paidAt: string | null;
}

/** A completed session not yet on any invoice — the "Onfacturé" source list. */
export interface UnbilledSession {
  sessionId: string;
  clientId: string;
  clientName: string;
  /** ISO date of the session. */
  date: string;
  /** Duration minutes (drives the default description). */
  durationMin: number;
  /** Suggested line amount in cents. */
  amountCents: number;
}

/** Computed money totals for an invoice (all cents, EUR). */
export interface InvoiceTotals {
  netCents: number;
  vatCents: number;
  grossCents: number;
}

/** One prestation line on a terugbetalingsattest. */
export interface AttestLine {
  /** ISO date (yyyy-mm-dd) of the session. */
  date: string;
  /** Neutral description — never a diagnosis or session topic. */
  description: string;
  amountCents: number;
}

/**
 * A terugbetalingsattest — the paper a client hands to CM / Helan / Solidaris.
 * Deliberately a plain data bag: the dialog renders it, the clipboard fallback
 * serialises it, and neither needs to know where the numbers came from.
 */
export interface AttestPayload {
  provider: {
    name: string;
    address: string;
    enterpriseNumber: string;
    /** Erkennings-/visumnummer — the field the ziekenfonds actually checks. */
    recognitionNumber: string;
    iban: string;
  };
  client: {
    name: string;
    /** Left blank unless the provider fills it in — never stored by default. */
    nationalNumber: string;
  };
  lines: AttestLine[];
  totalCents: number;
  vatStatus: VatStatus;
  /** The printed exemption clause matching vatStatus. */
  vatClause: string;
  /** Empty while the underlying invoice is still a draft (gapless numbering). */
  invoiceNumber: string;
  invoiceStatus: InvoiceStatus | null;
  /** ISO date the attest is drawn up. */
  issuedOn: string;
  /** Place of signature, derived from the practice address ("Gent"). */
  place: string;
  /** Free-text line for the ziekenfonds (defaults to a neutral sentence). */
  note: string;
}

/** Everything needed to bill — or attest — a single session. */
export interface SessionBillingInput {
  sessionId: string;
  clientId: string;
  clientName: string;
  /** ISO date of the session; defaults to today. */
  date?: string;
  /** Defaults to 60. */
  durationMin?: number;
  /** Defaults to the provider's standard rate. */
  amountCents?: number;
}

// ── Storage plumbing ─────────────────────────────────────────────────────────

const SETTINGS_KEY = 'bondable_billing_settings';
const INVOICES_KEY = 'bondable_invoices';
const UNBILLED_KEY = 'bondable_unbilled_sessions';

const hasWindow = typeof window !== 'undefined';

function uid(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function read<T>(key: string, fallback: T): T {
  if (!hasWindow) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
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

// ── Seed data — concrete Flemish names, real dates, EUR ───────────────────────

const DEMO_PROVIDER_ID = 'demo-provider';

/**
 * yyyy-mm-dd in LOCAL time. Deliberately not toISOString(): a session booked at
 * 21:00 in Gent must not land on the next day's invoice because UTC rolled over.
 */
function isoDate(d: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

function defaultSettings(): ProviderBillingSettings {
  return {
    providerId: DEMO_PROVIDER_ID,
    legalName: 'Lotte Vermeulen',
    enterpriseNumber: 'BE 0781.234.567',
    practiceAddress: 'Praktijk De Brug\nHoogstraat 24\n9000 Gent',
    vatStatus: 'vat_exempt_art44',
    iban: 'BE68 5390 0754 7034',
    recognitionNumber: '892345678',
    defaultRateCents: 7500,
    numberingPrefix: '2026',
    nextNumber: 3,
    invoiceFooter:
      'Te betalen binnen 14 dagen via overschrijving. Vermeld het factuurnummer als mededeling.',
  };
}

function line(
  sessionId: string | null,
  description: string,
  unitCents: number,
  vatRate: number,
  qty = 1,
): InvoiceLine {
  return { id: uid('line'), sessionId, description, unitCents, vatRate, qty };
}

function seedInvoices(): Invoice[] {
  return [
    // Paid — issued three weeks ago, one consult.
    {
      id: 'inv_seed_1',
      providerId: DEMO_PROVIDER_ID,
      clientId: 'client_an',
      clientName: 'An Verhaeghe',
      number: '2026-0001',
      issueDate: isoDate(daysAgo(21)),
      dueDate: isoDate(daysAgo(7)),
      status: 'paid',
      lines: [line('sess_a1', 'Consultatie — 60 min', 7500, 0)],
      vatStatus: 'vat_exempt_art44',
      mutualiteitNote:
        'Individuele psychologische begeleiding. Erkenningsnummer vermeld voor terugbetaling.',
      createdAt: daysAgo(21).toISOString(),
      sentAt: daysAgo(21).toISOString(),
      paidAt: daysAgo(9).toISOString(),
    },
    // Sent — issued eight days ago, two consults, awaiting payment.
    {
      id: 'inv_seed_2',
      providerId: DEMO_PROVIDER_ID,
      clientId: 'client_dries',
      clientName: 'Dries Peeters',
      number: '2026-0002',
      issueDate: isoDate(daysAgo(8)),
      dueDate: isoDate(daysFromNow(6)),
      status: 'sent',
      lines: [
        line('sess_d1', 'Consultatie — 60 min', 7500, 0),
        line('sess_d2', 'Consultatie — 60 min', 7500, 0),
      ],
      vatStatus: 'vat_exempt_art44',
      mutualiteitNote: '',
      createdAt: daysAgo(8).toISOString(),
      sentAt: daysAgo(8).toISOString(),
      paidAt: null,
    },
  ];
}

function seedUnbilled(): UnbilledSession[] {
  return [
    {
      sessionId: 'sess_u1',
      clientId: 'client_an',
      clientName: 'An Verhaeghe',
      date: isoDate(daysAgo(5)),
      durationMin: 60,
      amountCents: 7500,
    },
    {
      sessionId: 'sess_u2',
      clientId: 'client_lotte',
      clientName: 'Lotte De Smet',
      date: isoDate(daysAgo(4)),
      durationMin: 60,
      amountCents: 7500,
    },
    {
      sessionId: 'sess_u3',
      clientId: 'client_lotte',
      clientName: 'Lotte De Smet',
      date: isoDate(daysAgo(11)),
      durationMin: 90,
      amountCents: 11000,
    },
    {
      sessionId: 'sess_u4',
      clientId: 'client_maarten',
      clientName: 'Maarten Claes',
      date: isoDate(daysAgo(2)),
      durationMin: 60,
      amountCents: 7500,
    },
  ];
}

// ── Settings ─────────────────────────────────────────────────────────────────

function getSettings(): ProviderBillingSettings {
  const stored = read<ProviderBillingSettings | null>(SETTINGS_KEY, null);
  if (stored) return stored;
  const seeded = defaultSettings();
  write(SETTINGS_KEY, seeded);
  return seeded;
}

function saveSettings(
  patch: Partial<ProviderBillingSettings>,
): ProviderBillingSettings {
  const next = { ...getSettings(), ...patch };
  write(SETTINGS_KEY, next);
  return next;
}

// ── Invoices ─────────────────────────────────────────────────────────────────

function ensureInvoices(): Invoice[] {
  const stored = read<Invoice[] | null>(INVOICES_KEY, null);
  if (stored) return stored;
  const seeded = seedInvoices();
  write(INVOICES_KEY, seeded);
  return seeded;
}

/** All invoices, newest-first (by createdAt). */
function listInvoices(): Invoice[] {
  return [...ensureInvoices()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

function getInvoice(id: string): Invoice | null {
  return ensureInvoices().find((i) => i.id === id) ?? null;
}

// ── Unbilled sessions ────────────────────────────────────────────────────────

function ensureUnbilled(): UnbilledSession[] {
  const stored = read<UnbilledSession[] | null>(UNBILLED_KEY, null);
  if (stored) return stored;
  const seeded = seedUnbilled();
  write(UNBILLED_KEY, seeded);
  return seeded;
}

/** Completed sessions not yet invoiced, oldest-first. */
function listUnbilled(): UnbilledSession[] {
  return [...ensureUnbilled()].sort((a, b) => a.date.localeCompare(b.date));
}

// ── Money / VAT helpers ──────────────────────────────────────────────────────

/**
 * The VAT rate a new line should carry for a given billing status. Exempt modes
 * yield 0; standard coaching yields 21. This keeps the line's `vatRate` honest
 * even if the provider later changes their status.
 */
function defaultVatRateFor(status: VatStatus): number {
  return status === 'vat_21' ? 21 : 0;
}

/** Sum an invoice's lines into net / VAT / gross (all cents). */
function computeTotals(invoice: Pick<Invoice, 'lines'>): InvoiceTotals {
  let netCents = 0;
  let vatCents = 0;
  for (const l of invoice.lines) {
    const lineNet = l.qty * l.unitCents;
    netCents += lineNet;
    vatCents += Math.round((lineNet * l.vatRate) / 100);
  }
  return { netCents, vatCents, grossCents: netCents + vatCents };
}

/**
 * The legal VAT clause printed on the invoice for each status. NL is the
 * reference language; the UI wraps these via t() with these as defaults.
 */
function vatClause(status: VatStatus): string {
  switch (status) {
    case 'vat_exempt_art44':
      return 'Vrijgesteld van btw — art. 44 §1 W.BTW';
    case 'small_business_exempt':
      return 'Vrijgesteld van btw — bijzondere vrijstellingsregeling kleine ondernemingen';
    case 'vat_21':
    default:
      return 'Btw 21% inbegrepen';
  }
}

// ── Create a draft from unbilled sessions ─────────────────────────────────────

/**
 * Build a draft invoice from selected unbilled sessions. The draft carries NO
 * number yet (gapless numbering allocates only at issue). Selected sessions are
 * removed from the unbilled pool so they can't be double-billed.
 */
function createInvoiceFromSessions(sessionIds: string[]): Invoice {
  const settings = getSettings();
  const unbilled = ensureUnbilled();
  const picked = unbilled.filter((u) => sessionIds.includes(u.sessionId));
  if (picked.length === 0) {
    throw new Error('Geen sessies geselecteerd om te factureren.');
  }
  const vatRate = defaultVatRateFor(settings.vatStatus);
  const lines: InvoiceLine[] = picked.map((u) =>
    line(
      u.sessionId,
      `Consultatie — ${u.durationMin} min`,
      u.amountCents,
      vatRate,
    ),
  );

  const invoice: Invoice = {
    id: uid('inv'),
    providerId: settings.providerId,
    clientId: picked[0].clientId,
    clientName: picked[0].clientName,
    number: '',
    issueDate: isoDate(new Date()),
    dueDate: isoDate(daysFromNow(14)),
    status: 'draft',
    lines,
    vatStatus: settings.vatStatus,
    mutualiteitNote: '',
    createdAt: new Date().toISOString(),
    sentAt: null,
    paidAt: null,
  };

  write(INVOICES_KEY, [invoice, ...ensureInvoices()]);
  // Remove the billed sessions from the unbilled pool.
  write(
    UNBILLED_KEY,
    unbilled.filter((u) => !sessionIds.includes(u.sessionId)),
  );
  return invoice;
}

/** Patch a still-draft invoice (e.g. the mutualiteitNote). No-op if issued. */
function updateInvoice(id: string, patch: Partial<Invoice>): Invoice | null {
  const all = ensureInvoices();
  const idx = all.findIndex((i) => i.id === id);
  if (idx < 0) return null;
  const current = all[idx];
  if (current.status !== 'draft') {
    // Issued invoices are immutable except for the mutualiteitNote and paid mark.
    const safe: Partial<Invoice> = {};
    if (patch.mutualiteitNote !== undefined)
      safe.mutualiteitNote = patch.mutualiteitNote;
    const next = { ...current, ...safe };
    all[idx] = next;
    write(INVOICES_KEY, all);
    return next;
  }
  const next = { ...current, ...patch };
  all[idx] = next;
  write(INVOICES_KEY, all);
  return next;
}

/**
 * Issue a draft: allocate the next gapless number, stamp sentAt, move to `sent`.
 * The number is `${prefix}-${padded}` (e.g. "2026-0003") and is immutable after.
 */
function issueInvoice(id: string): Invoice | null {
  const all = ensureInvoices();
  const idx = all.findIndex((i) => i.id === id);
  if (idx < 0) return null;
  const current = all[idx];
  if (current.status !== 'draft') return current; // already issued — no re-number

  const settings = getSettings();
  const seq = settings.nextNumber;
  const number = `${settings.numberingPrefix}-${String(seq).padStart(4, '0')}`;
  saveSettings({ nextNumber: seq + 1 });

  const next: Invoice = {
    ...current,
    number,
    status: 'sent',
    issueDate: isoDate(new Date()),
    sentAt: new Date().toISOString(),
  };
  all[idx] = next;
  write(INVOICES_KEY, all);
  return next;
}

/** Mark a sent invoice paid (bank-transfer reality — manual). */
function markPaid(id: string): Invoice | null {
  const all = ensureInvoices();
  const idx = all.findIndex((i) => i.id === id);
  if (idx < 0) return null;
  const current = all[idx];
  if (current.status !== 'sent') return current;
  const next: Invoice = {
    ...current,
    status: 'paid',
    paidAt: new Date().toISOString(),
  };
  all[idx] = next;
  write(INVOICES_KEY, all);
  return next;
}

// ── Session → factuur (the 90-second chain) ──────────────────────────────────

/** The invoice a session already sits on, if any — guards double-billing. */
function findInvoiceForSession(sessionId: string): Invoice | null {
  return (
    ensureInvoices().find((inv) =>
      inv.lines.some((l) => l.sessionId === sessionId),
    ) ?? null
  );
}

/** Add a completed session to the unbilled pool. Idempotent on sessionId. */
function addUnbilledSession(entry: UnbilledSession): UnbilledSession {
  const all = ensureUnbilled();
  const existing = all.find((u) => u.sessionId === entry.sessionId);
  if (existing) return existing;
  write(UNBILLED_KEY, [...all, entry]);
  return entry;
}

/**
 * The note→factuur step: one session in, one DRAFT invoice out. Safe to call
 * twice — a session already on an invoice returns that invoice untouched with
 * `alreadyBilled: true`, so the chain can never double-bill a client.
 *
 * The draft carries no number: Belgian gapless numbering allocates only at
 * issue. Use `previewNextNumber()` to tell the provider which number it will
 * get without burning a sequence slot.
 */
function createInvoiceForSession(input: SessionBillingInput): {
  invoice: Invoice;
  alreadyBilled: boolean;
} {
  const existing = findInvoiceForSession(input.sessionId);
  if (existing) return { invoice: existing, alreadyBilled: true };

  const settings = getSettings();
  const durationMin =
    input.durationMin && input.durationMin > 0 ? input.durationMin : 60;
  const amountCents =
    typeof input.amountCents === 'number' && input.amountCents > 0
      ? input.amountCents
      : settings.defaultRateCents;

  addUnbilledSession({
    sessionId: input.sessionId,
    clientId: input.clientId,
    clientName: input.clientName,
    date: input.date || isoDate(new Date()),
    durationMin,
    amountCents,
  });

  return {
    invoice: createInvoiceFromSessions([input.sessionId]),
    alreadyBilled: false,
  };
}

/**
 * The number the NEXT issued invoice will carry. Read-only — it does not
 * allocate, so showing it on a draft keeps the sequence gapless.
 */
function previewNextNumber(): string {
  const settings = getSettings();
  return `${settings.numberingPrefix}-${String(settings.nextNumber).padStart(4, '0')}`;
}

// ── Terugbetalingsattest ─────────────────────────────────────────────────────

const DEFAULT_ATTEST_NOTE =
  'Betaalde prestatie in het kader van individuele begeleiding.';

/** Last address line minus the postcode → the place of signature ("Gent"). */
function practicePlace(address: string): string {
  const last =
    address
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .pop() ?? '';
  return last.replace(/^\d{4}\s*/, '').trim() || last;
}

function buildAttest(input: {
  clientName: string;
  nationalNumber?: string;
  lines: AttestLine[];
  invoiceNumber?: string;
  invoiceStatus?: InvoiceStatus | null;
  vatStatus?: VatStatus;
  note?: string;
}): AttestPayload {
  const settings = getSettings();
  const vatStatus = input.vatStatus ?? settings.vatStatus;
  return {
    provider: {
      name: settings.legalName,
      address: settings.practiceAddress,
      enterpriseNumber: settings.enterpriseNumber,
      recognitionNumber: settings.recognitionNumber,
      iban: settings.iban,
    },
    client: {
      name: input.clientName,
      nationalNumber: input.nationalNumber?.trim() ?? '',
    },
    lines: input.lines,
    totalCents: input.lines.reduce((sum, l) => sum + l.amountCents, 0),
    vatStatus,
    vatClause: vatClause(vatStatus),
    invoiceNumber: input.invoiceNumber ?? '',
    invoiceStatus: input.invoiceStatus ?? null,
    issuedOn: isoDate(new Date()),
    place: practicePlace(settings.practiceAddress),
    note: input.note?.trim() ? input.note.trim() : DEFAULT_ATTEST_NOTE,
  };
}

/**
 * Attest for a single session. Picks up the invoice the session sits on (so a
 * already-issued number prints), and falls back to the session's own figures
 * when it is not billed yet — the attest never waits on the invoice.
 */
function buildAttestForSession(
  input: SessionBillingInput & { nationalNumber?: string },
): AttestPayload {
  const settings = getSettings();
  const invoice = findInvoiceForSession(input.sessionId);
  const durationMin =
    input.durationMin && input.durationMin > 0 ? input.durationMin : 60;
  const invoiceLine = invoice?.lines.find(
    (l) => l.sessionId === input.sessionId,
  );
  const amountCents =
    invoiceLine != null
      ? invoiceLine.qty * invoiceLine.unitCents
      : typeof input.amountCents === 'number' && input.amountCents > 0
        ? input.amountCents
        : settings.defaultRateCents;

  return buildAttest({
    clientName: input.clientName,
    nationalNumber: input.nationalNumber,
    lines: [
      {
        date: input.date || isoDate(new Date()),
        description: invoiceLine?.description ?? `Consultatie — ${durationMin} min`,
        amountCents,
      },
    ],
    invoiceNumber: invoice?.number ?? '',
    invoiceStatus: invoice?.status ?? null,
    vatStatus: invoice?.vatStatus,
    note: invoice?.mutualiteitNote,
  });
}

/** Attest covering every line of one invoice (a month of sessions at once). */
function buildAttestForInvoice(
  invoiceId: string,
  opts?: { nationalNumber?: string },
): AttestPayload | null {
  const invoice = getInvoice(invoiceId);
  if (!invoice) return null;
  return buildAttest({
    clientName: invoice.clientName,
    nationalNumber: opts?.nationalNumber,
    lines: invoice.lines.map((l) => ({
      date: invoice.issueDate,
      description: l.description,
      amountCents: l.qty * l.unitCents,
    })),
    invoiceNumber: invoice.number,
    invoiceStatus: invoice.status,
    vatStatus: invoice.vatStatus,
    note: invoice.mutualiteitNote,
  });
}

/**
 * Plain-text rendering of an attest — the "Kopieer gegevens" fallback for
 * providers who paste into their own template or an e-mail to the ziekenfonds.
 */
function formatAttestText(attest: AttestPayload): string {
  const date = (iso: string): string => {
    const d = new Date(`${iso}T00:00:00`);
    return Number.isNaN(d.getTime())
      ? iso
      : new Intl.DateTimeFormat('nl-BE', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(d);
  };

  const rows = attest.lines
    .map((l) => `${date(l.date)} — ${l.description} — ${formatEur(l.amountCents)}`)
    .join('\n');

  // `null` drops a line that has no content; '' is an intentional blank line.
  return [
    'ATTEST VOOR TERUGBETALING',
    '',
    'Zorgverstrekker',
    attest.provider.name,
    attest.provider.address,
    `Ondernemingsnummer: ${attest.provider.enterpriseNumber}`,
    `Erkennings-/visumnummer: ${attest.provider.recognitionNumber}`,
    `IBAN: ${attest.provider.iban}`,
    '',
    'Cliënt',
    attest.client.name,
    `Rijksregisternummer: ${attest.client.nationalNumber || '…'}`,
    '',
    'Prestaties',
    rows,
    `Totaal betaald: ${formatEur(attest.totalCents)}`,
    '',
    attest.vatClause,
    attest.invoiceNumber ? `Factuurnummer: ${attest.invoiceNumber}` : null,
    attest.note,
    'Dit attest bevestigt de betaalde prestatie. Of en hoeveel er wordt terugbetaald, beslist het ziekenfonds.',
    '',
    `${attest.place}, ${date(attest.issuedOn)}`,
  ]
    .filter((l): l is string => l !== null)
    .join('\n');
}

// ── Formatting helpers (shared with the UI) ──────────────────────────────────

/** EUR from cents, Belgian formatting (comma decimal, non-breaking space). */
function formatEur(cents: number): string {
  return new Intl.NumberFormat('nl-BE', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

/** Dev/testing reset — restores seeds. */
function reset(): void {
  if (!hasWindow) return;
  try {
    window.localStorage.removeItem(SETTINGS_KEY);
    window.localStorage.removeItem(INVOICES_KEY);
    window.localStorage.removeItem(UNBILLED_KEY);
  } catch {
    /* silent-fail */
  }
}

export const invoiceService = {
  getSettings,
  saveSettings,
  listInvoices,
  getInvoice,
  listUnbilled,
  createInvoiceFromSessions,
  findInvoiceForSession,
  addUnbilledSession,
  createInvoiceForSession,
  previewNextNumber,
  buildAttestForSession,
  buildAttestForInvoice,
  formatAttestText,
  updateInvoice,
  issueInvoice,
  markPaid,
  computeTotals,
  vatClause,
  defaultVatRateFor,
  formatEur,
  reset,
};

export default invoiceService;
