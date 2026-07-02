/**
 * outcomesService.ts — mock (localStorage) outcomes engine for the client
 * Progress surface (tickets T-CX-12/13/14).
 *
 * This is the validated-instrument spine that powers ClientProgress.tsx and the
 * Questionnaire runner. It defines three instruments:
 *
 *   - PHQ-9  — 9 items, 0–3 each (0–27 total), validated NL wordings. Item 9 is
 *              the self-harm safety item (CRISIS_ITEM_INDEX). Clinical instrument.
 *   - GAD-7  — 7 items, 0–3 each (0–21 total), validated NL wordings. Clinical.
 *   - GAS    — a simple goal-attainment scale (single 0–10 rating) for coaches;
 *              no clinical severity bands, framed as movement toward a goal.
 *
 * SCOPE (per plan risk 2 — EU MDR): we compute totals and display the officially
 * validated severity BAND LABELS only. We never interpret, advise, or drive a
 * treatment decision. The only automated action anywhere is the item-9 safety
 * interrupt, which the Questionnaire component owns.
 *
 * NO HEALTH DATA leaves this module toward analytics — results live in
 * localStorage only. Analytics that fire elsewhere carry structural facts only.
 *
 * This is a mock: everything persists to localStorage so demo mode works with no
 * backend. When the real DB lands it is swapped behind the same function
 * signatures (list / save / getInstrument / scoreResult).
 */

export type InstrumentId = "phq9" | "gad7" | "gas";

/** Severity direction — how a band should be read against the token palette. */
export type BandTone = "success" | "info" | "warning" | "neutral";

export interface InstrumentItem {
  /** Stable id within the instrument (e.g. "phq9_1"). */
  id: string;
  /** Item prompt in NL (validated wording). */
  prompt: string;
}

export interface InstrumentOption {
  value: number;
  /** NL label for the choice. */
  label: string;
}

export interface SeverityBand {
  /** Inclusive lower bound of the total score. */
  min: number;
  /** Inclusive upper bound of the total score. */
  max: number;
  /** Calm clinical label — never "you are X". NL. */
  label: string;
  /** How to tint the band (never alarmist red for moderate). */
  tone: BandTone;
}

export interface Instrument {
  id: InstrumentId;
  /** Short instrument name shown in UI. */
  name: string;
  /** One-line, plain-language description. NL. */
  blurb: string;
  /** Shared 24h recall lead-in shown once above the items. NL. */
  recallLine?: string;
  /** True for clinical instruments assignable only by regulated providers. */
  isClinical: boolean;
  items: InstrumentItem[];
  /** The response options; shared across all items of the instrument. */
  options: InstrumentOption[];
  /** Score bands, ordered ascending. Empty for GAS (no clinical bands). */
  bands: SeverityBand[];
  /** Max attainable total. */
  maxScore: number;
  /**
   * Zero-based index of the crisis/self-harm item, if any. PHQ-9 → 8 (item 9).
   * A response > 0 on this item must interrupt with crisis resources.
   */
  crisisItemIndex?: number;
}

export interface AssessmentResult {
  id: string;
  instrument: InstrumentId;
  /** ISO date-time the assessment was completed. */
  takenAt: string;
  /** Per-item numeric answers, aligned to instrument.items order. */
  answers: number[];
  /** Computed total. */
  score: number;
  /** Resolved band label at save time (denormalised for stable history). */
  bandLabel: string;
  bandTone: BandTone;
  /** True if the crisis item was > 0 at completion (never carries the value). */
  crisisFlagged: boolean;
  /** Per-chart consent mirror — is this shared with the provider. */
  sharedWithProvider: boolean;
}

/* ─────────────────────────────────────────────────────────────────────────
 * Instrument definitions — validated NL wordings.
 * PHQ-9 / GAD-7 are public domain.
 * ───────────────────────────────────────────────────────────────────────── */

const PHQ9_OPTIONS: InstrumentOption[] = [
  { value: 0, label: "Helemaal niet" },
  { value: 1, label: "Meerdere dagen" },
  { value: 2, label: "Meer dan de helft van de dagen" },
  { value: 3, label: "Bijna elke dag" },
];

const PHQ9: Instrument = {
  id: "phq9",
  name: "PHQ-9",
  blurb: "Een korte vragenlijst over je stemming van de afgelopen twee weken.",
  recallLine:
    "Hoe vaak had je de afgelopen twee weken last van een van de volgende dingen?",
  isClinical: true,
  options: PHQ9_OPTIONS,
  items: [
    { id: "phq9_1", prompt: "Weinig interesse of plezier in dingen" },
    { id: "phq9_2", prompt: "Je somber, neerslachtig of hopeloos voelen" },
    {
      id: "phq9_3",
      prompt: "Moeilijk inslapen, doorslapen, of net te veel slapen",
    },
    { id: "phq9_4", prompt: "Je moe voelen of weinig energie hebben" },
    { id: "phq9_5", prompt: "Weinig eetlust of net te veel eten" },
    {
      id: "phq9_6",
      prompt:
        "Een slecht gevoel over jezelf — of het gevoel dat je hebt gefaald of jezelf of je familie hebt teleurgesteld",
    },
    {
      id: "phq9_7",
      prompt:
        "Moeite om je te concentreren, bijvoorbeeld bij het lezen of tv-kijken",
    },
    {
      id: "phq9_8",
      prompt:
        "Zo traag bewegen of praten dat anderen het opmerkten — of net zo rusteloos dat je meer bewoog dan gewoonlijk",
    },
    {
      // Item 9 — the safety item. > 0 triggers the crisis interrupt.
      id: "phq9_9",
      prompt:
        "Gedachten dat je beter dood zou zijn, of gedachten om jezelf op een of andere manier pijn te doen",
    },
  ],
  bands: [
    { min: 0, max: 4, label: "scorezone: minimaal", tone: "success" },
    { min: 5, max: 9, label: "scorezone: licht", tone: "info" },
    { min: 10, max: 14, label: "scorezone: matig", tone: "info" },
    { min: 15, max: 19, label: "scorezone: matig verhoogd", tone: "warning" },
    { min: 20, max: 27, label: "scorezone: ernstig verhoogd", tone: "warning" },
  ],
  maxScore: 27,
  crisisItemIndex: 8,
};

const GAD7_OPTIONS: InstrumentOption[] = [
  { value: 0, label: "Helemaal niet" },
  { value: 1, label: "Meerdere dagen" },
  { value: 2, label: "Meer dan de helft van de dagen" },
  { value: 3, label: "Bijna elke dag" },
];

const GAD7: Instrument = {
  id: "gad7",
  name: "GAD-7",
  blurb: "Een korte vragenlijst over spanning en piekeren van de afgelopen twee weken.",
  recallLine:
    "Hoe vaak had je de afgelopen twee weken last van een van de volgende dingen?",
  isClinical: true,
  options: GAD7_OPTIONS,
  items: [
    { id: "gad7_1", prompt: "Je zenuwachtig, angstig of gespannen voelen" },
    { id: "gad7_2", prompt: "Niet kunnen stoppen met piekeren of het niet onder controle krijgen" },
    { id: "gad7_3", prompt: "Je te veel zorgen maken over verschillende dingen" },
    { id: "gad7_4", prompt: "Moeite hebben om je te ontspannen" },
    { id: "gad7_5", prompt: "Zo rusteloos dat het moeilijk is om stil te zitten" },
    { id: "gad7_6", prompt: "Snel geïrriteerd of prikkelbaar zijn" },
    { id: "gad7_7", prompt: "Bang zijn dat er iets ergs zou kunnen gebeuren" },
  ],
  bands: [
    { min: 0, max: 4, label: "scorezone: minimaal", tone: "success" },
    { min: 5, max: 9, label: "scorezone: licht", tone: "info" },
    { min: 10, max: 14, label: "scorezone: matig", tone: "warning" },
    { min: 15, max: 21, label: "scorezone: matig verhoogd", tone: "warning" },
  ],
  maxScore: 21,
  // No crisis item on GAD-7.
};

/**
 * GAS — a single 0–10 goal-attainment rating. For coaches (non-clinical).
 * Rendered as one item; 0 = "nog niet begonnen", 10 = "helemaal bereikt".
 * No clinical severity bands — movement, not diagnosis.
 */
const GAS: Instrument = {
  id: "gas",
  name: "Doelmeting",
  blurb: "Een simpele meting van hoe ver je staat met een persoonlijk doel.",
  isClinical: false,
  options: Array.from({ length: 11 }, (_, v) => ({
    value: v,
    label: String(v),
  })),
  items: [
    {
      id: "gas_1",
      prompt:
        "Waar sta je vandaag met je doel? 0 betekent nog niet begonnen, 10 betekent helemaal bereikt.",
    },
  ],
  bands: [],
  maxScore: 10,
};

const INSTRUMENTS: Record<InstrumentId, Instrument> = {
  phq9: PHQ9,
  gad7: GAD7,
  gas: GAS,
};

/** All instruments, in display order. */
export function listInstruments(): Instrument[] {
  return [PHQ9, GAD7, GAS];
}

/** Look up a single instrument definition. */
export function getInstrument(id: InstrumentId): Instrument {
  return INSTRUMENTS[id];
}

/* ─────────────────────────────────────────────────────────────────────────
 * Scoring.
 * ───────────────────────────────────────────────────────────────────────── */

export interface ScoredResult {
  score: number;
  band: SeverityBand | null;
  crisisFlagged: boolean;
}

/** Total the answers and resolve the severity band (null for GAS). */
export function scoreResult(id: InstrumentId, answers: number[]): ScoredResult {
  const instrument = getInstrument(id);
  const score = answers.reduce((sum, a) => sum + (Number.isFinite(a) ? a : 0), 0);
  const band =
    instrument.bands.find((b) => score >= b.min && score <= b.max) ?? null;
  const crisisFlagged =
    instrument.crisisItemIndex != null &&
    (answers[instrument.crisisItemIndex] ?? 0) > 0;
  return { score, band, crisisFlagged };
}

/* ─────────────────────────────────────────────────────────────────────────
 * Persistence (localStorage mock).
 * ───────────────────────────────────────────────────────────────────────── */

const STORAGE_KEY = "bondable_outcome_results";

function readAll(): AssessmentResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedResults();
      writeAll(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AssessmentResult[]) : [];
  } catch {
    return [];
  }
}

function writeAll(records: AssessmentResult[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    /* silent-fail (quota / private mode) */
  }
}

/** All results for one instrument, oldest-first (chart order). */
export function listResults(id: InstrumentId): AssessmentResult[] {
  return readAll()
    .filter((r) => r.instrument === id)
    .sort((a, b) => a.takenAt.localeCompare(b.takenAt));
}

/** The most recent result for an instrument, or null. */
export function latestResult(id: InstrumentId): AssessmentResult | null {
  const list = listResults(id);
  return list.length ? list[list.length - 1] : null;
}

export interface SaveInput {
  instrument: InstrumentId;
  answers: number[];
  /** Defaults to now. Present so seeds can backdate. */
  takenAt?: string;
  /** Defaults to false — private until the client shares. */
  sharedWithProvider?: boolean;
}

/** Score, denormalise the band, and persist a new result. Returns the row. */
export function saveResult(input: SaveInput): AssessmentResult {
  const { score, band, crisisFlagged } = scoreResult(
    input.instrument,
    input.answers,
  );
  const record: AssessmentResult = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `res_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    instrument: input.instrument,
    takenAt: input.takenAt ?? new Date().toISOString(),
    answers: input.answers,
    score,
    bandLabel: band?.label ?? "",
    bandTone: band?.tone ?? "neutral",
    crisisFlagged,
    sharedWithProvider: input.sharedWithProvider ?? false,
  };
  const all = readAll();
  writeAll([...all, record]);
  return record;
}

/**
 * Per-instrument consent toggle mirror (used by the "Deel met begeleider"
 * switch on each chart). Applies to every stored result of that instrument so
 * the chart-level toggle stays a single source of truth in the mock.
 */
export function setInstrumentShared(id: InstrumentId, shared: boolean): void {
  const all = readAll();
  const next = all.map((r) =>
    r.instrument === id ? { ...r, sharedWithProvider: shared } : r,
  );
  writeAll(next);
}

/** Whether an instrument's results are currently shared with the provider. */
export function isInstrumentShared(id: InstrumentId): boolean {
  const list = listResults(id);
  return list.length > 0 && list.every((r) => r.sharedWithProvider);
}

/* ─────────────────────────────────────────────────────────────────────────
 * Seed data — a few backdated results so charts are non-empty in demo mode.
 * Concrete, humane trajectories (gentle downward PHQ-9/GAD-7, upward GAS).
 * ───────────────────────────────────────────────────────────────────────── */

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function makeSeed(
  instrument: InstrumentId,
  answers: number[],
  daysAgo: number,
  shared: boolean,
): AssessmentResult {
  const { score, band, crisisFlagged } = scoreResult(instrument, answers);
  return {
    id: `seed_${instrument}_${daysAgo}`,
    instrument,
    takenAt: daysAgoISO(daysAgo),
    answers,
    score,
    bandLabel: band?.label ?? "",
    bandTone: band?.tone ?? "neutral",
    crisisFlagged,
    sharedWithProvider: shared,
  };
}

function seedResults(): AssessmentResult[] {
  return [
    // PHQ-9 — trending down 16 → 12 → 9 over six weeks. Item 9 stays 0.
    makeSeed("phq9", [2, 3, 2, 2, 1, 2, 1, 1, 0], 42, true),
    makeSeed("phq9", [2, 2, 1, 2, 1, 1, 1, 1, 0], 28, true),
    makeSeed("phq9", [1, 2, 1, 1, 1, 1, 1, 1, 0], 14, true),
    // GAD-7 — trending down 13 → 10 → 8.
    makeSeed("gad7", [2, 2, 2, 2, 2, 2, 1], 40, false),
    makeSeed("gad7", [2, 2, 1, 2, 1, 1, 1], 26, false),
    makeSeed("gad7", [1, 2, 1, 1, 1, 1, 1], 12, false),
    // GAS — climbing 3 → 5 → 6.
    makeSeed("gas", [3], 35, true),
    makeSeed("gas", [5], 21, true),
    makeSeed("gas", [6], 7, true),
  ];
}

export const outcomesService = {
  listInstruments,
  getInstrument,
  scoreResult,
  listResults,
  latestResult,
  saveResult,
  setInstrumentShared,
  isInstrumentShared,
};

export default outcomesService;
