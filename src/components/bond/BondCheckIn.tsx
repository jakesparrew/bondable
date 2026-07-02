import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronLeft, X } from "lucide-react";

import { analyticsService } from "@/services/api/analyticsService";
import { ANALYTICS_EVENTS } from "@/config/analyticsEvents";

/**
 * BondCheckIn — the structured daily check-in (ticket T-CX-8).
 *
 * A three-step, entirely tappable micro-flow that completes in under ~25 seconds
 * and lives INSIDE Bond (so mint is allowed). Deliberately NOT a mood tracker with
 * guilt or streak mechanics — this is a mental-health surface: no red/green
 * judgment colours, no confetti, no "don't break the chain".
 *
 *   1. Mood — a 1–5 scale as simple labelled dots (an ink-tint scale, not emoji).
 *   2. Tags — one-tap themes (max 3), slaap / energie / stress / contact / piekeren…
 *   3. Note — one optional sentence.
 *
 * On submit the check-in is persisted to localStorage (mock, key
 * `bondable_bond_checkins`), an analytics event is emitted (no check-in event
 * exists in the registry yet, so we fall back to `bond_message_sent` with only
 * structural, non-clinical properties — never the mood value or note text), and a
 * calm acknowledgement is shown.
 */

export const CHECKINS_STORAGE_KEY = "bondable_bond_checkins";

export interface BondCheckInRecord {
  /** 1–5 mood. Kept local only; never sent to analytics. */
  mood: number;
  /** Tag ids chosen (max 3). */
  tags: string[];
  /** Optional free-text sentence. */
  note: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
}

/** Read the persisted check-ins (oldest-first). Safe on SSR / private mode. */
export function readCheckIns(): BondCheckInRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CHECKINS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BondCheckInRecord[]) : [];
  } catch {
    return [];
  }
}

function writeCheckIns(records: BondCheckInRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    // Cap to a sensible window so localStorage never grows unbounded.
    const capped = records.length > 120 ? records.slice(records.length - 120) : records;
    window.localStorage.setItem(CHECKINS_STORAGE_KEY, JSON.stringify(capped));
  } catch {
    /* silent-fail (quota / private mode) */
  }
}

interface BondCheckInProps {
  /** Called after a successful submit (parent refreshes ribbon, closes flow). */
  onComplete?: (record: BondCheckInRecord) => void;
  /** Called when the client dismisses the flow without submitting. */
  onCancel?: () => void;
}

type Step = 0 | 1 | 2 | 3;

const BondCheckIn = ({ onComplete, onCancel }: BondCheckInProps) => {
  const { t } = useTranslation();

  const [step, setStep] = useState<Step>(0);
  const [mood, setMood] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState<BondCheckInRecord | null>(null);

  // Mood scale: five neutral, labelled dots. Ink-tint only — no red/green.
  const moodScale = useMemo(
    () => [
      { value: 1, label: t("checkin_mood_1", "Zwaar") },
      { value: 2, label: t("checkin_mood_2", "Matig") },
      { value: 3, label: t("checkin_mood_3", "Oké") },
      { value: 4, label: t("checkin_mood_4", "Goed") },
      { value: 5, label: t("checkin_mood_5", "Sterk") },
    ],
    [t],
  );

  const tagOptions = useMemo(
    () => [
      { id: "slaap", label: t("checkin_tag_slaap", "Slaap") },
      { id: "energie", label: t("checkin_tag_energie", "Energie") },
      { id: "stress", label: t("checkin_tag_stress", "Stress") },
      { id: "contact", label: t("checkin_tag_contact", "Contact") },
      { id: "piekeren", label: t("checkin_tag_piekeren", "Piekeren") },
      { id: "lichaam", label: t("checkin_tag_lichaam", "Lichaam") },
      { id: "werk-school", label: t("checkin_tag_werk", "Werk of school") },
      { id: "rust", label: t("checkin_tag_rust", "Rust") },
    ],
    [t],
  );

  const MAX_TAGS = 3;

  const toggleTag = (id: string) => {
    setTags((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_TAGS) return prev;
      return [...prev, id];
    });
  };

  const handleSubmit = () => {
    if (mood == null) return;
    const record: BondCheckInRecord = {
      mood,
      tags,
      note: note.trim(),
      createdAt: new Date().toISOString(),
    };
    writeCheckIns([...readCheckIns(), record]);

    // Analytics: NO health data. There is no check-in event in the registry, so we
    // fall back to `bond_message_sent` and carry only structural facts (tag count,
    // whether a note was added) — never the mood value nor any free text.
    try {
      analyticsService.track(ANALYTICS_EVENTS.bond_message_sent, {
        surface: "checkin",
        tag_count: record.tags.length,
        has_note: record.note.length > 0,
      });
    } catch {
      /* analytics never breaks product code */
    }

    setSaved(record);
    setStep(3);
    onComplete?.(record);
  };

  const stepLabel = t("checkin_step_of", "Stap {{n}} van 3", {
    n: Math.min(step + 1, 3),
  });

  return (
    <section
      className="animate-enter rounded-card border border-mint/40 bg-mint-soft p-4 sm:p-5"
      aria-label={t("checkin_region_label", "Dagelijkse check-in")}
    >
      {/* Header row: title + progress + close. Not shown on the done screen. */}
      {step < 3 && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">
              {t("checkin_title", "Even inchecken")}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{stepLabel}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label={t("checkin_close", "Sluiten")}
            className="-mr-1 -mt-1 rounded-ctl p-1.5 text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Step 1 — mood as five labelled ink-tint dots. */}
      {step === 0 && (
        <div>
          <p className="mb-4 text-sm text-foreground">
            {t("checkin_mood_prompt", "Hoe voelt vandaag?")}
          </p>
          <div
            className="flex items-end justify-between gap-1.5"
            role="radiogroup"
            aria-label={t("checkin_mood_label", "Stemming van 1 tot 5")}
          >
            {moodScale.map((m) => {
              const selected = mood === m.value;
              // Ink-tint scale: darker dot = further along the scale. Never a
              // red-to-green judgment ramp; it reads as depth, not good/bad.
              const tint = 0.12 + (m.value - 1) * 0.16;
              return (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`${m.value} — ${m.label}`}
                  onClick={() => setMood(m.value)}
                  className="group flex flex-1 flex-col items-center gap-1.5 rounded-ctl py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <span
                    aria-hidden="true"
                    className={`h-8 w-8 rounded-full border transition-transform group-hover:scale-105 ${
                      selected
                        ? "border-foreground ring-2 ring-foreground ring-offset-2 ring-offset-mint-soft"
                        : "border-foreground/20"
                    }`}
                    style={{ backgroundColor: `hsl(var(--foreground) / ${tint})` }}
                  />
                  <span
                    className={`text-center text-[11px] leading-tight ${
                      selected ? "font-semibold text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              disabled={mood == null}
              onClick={() => setStep(1)}
              className="rounded-ctl bg-mint px-4 py-2 text-sm font-medium text-mint-foreground transition-colors hover:bg-mint/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("checkin_next", "Verder")}
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — optional tags, max 3. */}
      {step === 1 && (
        <div>
          <p className="mb-1 text-sm text-foreground">
            {t("checkin_tags_prompt", "Waar zat het vandaag?")}
          </p>
          <p className="mb-3 text-xs text-muted-foreground">
            {t("checkin_tags_hint", "Optioneel, kies er tot drie")}
          </p>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label={t("checkin_tags_label", "Thema's")}
          >
            {tagOptions.map((tag) => {
              const selected = tags.includes(tag.id);
              const atMax = tags.length >= MAX_TAGS && !selected;
              return (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={selected}
                  disabled={atMax}
                  onClick={() => toggleTag(tag.id)}
                  className={`rounded-ctl border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    selected
                      ? "border-mint bg-mint text-mint-foreground"
                      : "border-mint/40 bg-card text-foreground hover:bg-mint/10"
                  } ${atMax ? "cursor-not-allowed opacity-40" : ""}`}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="flex items-center gap-1 rounded-ctl px-2 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              {t("checkin_back", "Terug")}
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-ctl bg-mint px-4 py-2 text-sm font-medium text-mint-foreground transition-colors hover:bg-mint/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {t("checkin_next", "Verder")}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — one optional sentence. */}
      {step === 2 && (
        <div>
          <label htmlFor="checkin-note" className="mb-1 block text-sm text-foreground">
            {t("checkin_note_prompt", "Wil je er iets bij zeggen?")}
          </label>
          <p className="mb-3 text-xs text-muted-foreground">
            {t("checkin_note_hint", "Eén zin is genoeg, of laat het leeg")}
          </p>
          <textarea
            id="checkin-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={280}
            placeholder={t("checkin_note_placeholder", "Vandaag was…")}
            className="w-full resize-none rounded-ctl border border-mint/40 bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />

          <div className="mt-5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1 rounded-ctl px-2 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              {t("checkin_back", "Terug")}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-ctl bg-mint px-4 py-2 text-sm font-medium text-mint-foreground transition-colors hover:bg-mint/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {t("checkin_submit", "Check-in bewaren")}
            </button>
          </div>
        </div>
      )}

      {/* Done — a calm acknowledgement. No confetti, no streak, no score echo. */}
      {step === 3 && saved && (
        <div className="animate-enter text-center">
          <span
            aria-hidden="true"
            className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-mint text-mint-foreground"
          >
            <Check className="h-6 w-6" />
          </span>
          <h2 className="text-sm font-semibold text-foreground">
            {t("checkin_done_title", "Genoteerd. Dank je wel")}
          </h2>
          <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
            {t(
              "checkin_done_body",
              "Fijn dat je even stilstond. Je vindt dit terug in je overzicht.",
            )}
          </p>
          <button
            type="button"
            onClick={onCancel}
            className="mt-4 rounded-ctl border border-mint/40 bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-mint/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t("checkin_done_close", "Sluiten")}
          </button>
        </div>
      )}
    </section>
  );
};

export default BondCheckIn;
