import { useTranslation } from "react-i18next";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Minus,
  Monitor,
  MapPin,
  ClipboardCheck,
  FileText,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Session } from "@/services/api/SessionService";

/**
 * ClientPrepCard — a compact "walk-in-prepared" card for a single upcoming
 * session on the provider Today view (plan 04 §1). It surfaces the four prep
 * signals a provider wants in the ten seconds before a client arrives:
 *
 *   1. who + when (name, time, duration, format, session count)
 *   2. the last signed note's one-liner
 *   3. homework status (x / y afgerond)
 *   4. alliance trend (a small up / down / flat arrow off session_feedback)
 *   5. any risk flags raised by the (future) risk engine
 *
 * GRACEFUL ABSENCE is the core contract: a prep source that has no data renders
 * *nothing* — never a placeholder, never "n/a", never an empty row. In Phase 1
 * most sessions will only show name + time; the strip thickens on its own as
 * notes (T-PX-3) and the risk engine (T-PX-6) land, without touching this file.
 *
 * Purely props-driven and presentational: the caller passes a `session` plus an
 * optional `prep` bag. No data fetching, no service imports beyond the Session
 * type. Border-first, no mint (this is clinical prep, not an AI surface).
 *
 * i18n via t('key', 'NL default') inline; no locale JSON edits.
 */

/* -------------------------------------------------------------------------- */
/* Prep data shape                                                            */
/* -------------------------------------------------------------------------- */

export type AllianceTrend = "up" | "down" | "flat";

export interface RiskFlag {
  /** Short label rendered in the chip, e.g. "Alliantie zakt". */
  label: string;
  /** Drives the token: warning (attend/watch) vs. destructive-ish (urgent). */
  severity?: "watch" | "attend" | "urgent";
}

export interface ClientPrepData {
  /** One-line summary of the last SIGNED clinical note. */
  lastNote?: string | null;
  /** Homework completion for the linked tasks, if any exist. */
  homework?: { done: number; total: number } | null;
  /** Most recent alliance rating (1–5) and its direction of travel. */
  alliance?: { rating: number; trend: AllianceTrend } | null;
  /** Risk flags from the caseload engine (empty / undefined = none). */
  flags?: RiskFlag[] | null;
  /** True when the client has an unacknowledged distress check-in. */
  checkInPending?: boolean;
  /** 1-based ordinal of this session in the relationship ("12e sessie"). */
  sessionNumber?: number | null;
  /**
   * State of THIS session's clinical note — drives the post-session affordance:
   * no note → "Notitie starten", a draft → "Klad afwerken", signed → a quiet
   * confirmation instead of a button.
   */
  noteStatus?: "draft" | "signed" | null;
}

export interface ClientPrepCardProps {
  session: Session;
  prep?: ClientPrepData;
  /** Opens the ClientProfile prep drawer / navigates to the client. */
  onPrepare?: (session: Session) => void;
  /** Post-session: start the 90-second quick-capture note. */
  onStartNote?: (session: Session) => void;
  /** Confirm a pending session request. */
  onConfirm?: (session: Session) => void;
  /** Deny a pending session request. */
  onDeny?: (session: Session) => void;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/* Small helpers                                                              */
/* -------------------------------------------------------------------------- */

const formatTime = (time?: string): string => {
  if (!time) return "";
  // session_time is stored "HH:MM[:SS]" — trim to HH:MM.
  const [h, m] = time.split(":");
  if (h == null) return time;
  return `${h}:${m ?? "00"}`;
};

/**
 * Has this session's slot passed? A session is "post-session" the moment its
 * end time is behind us — providers rarely flip the status to Completed before
 * they write the note, so waiting for that status would hide the one action
 * they came for.
 */
const sessionEnded = (session: Session): boolean => {
  if (!session.session_date) return false;
  const day = session.session_date.slice(0, 10);
  const raw = session.session_time || "00:00";
  const time = raw.length === 5 ? `${raw}:00` : raw.slice(0, 8);
  const start = new Date(`${day}T${time}`);
  if (Number.isNaN(start.getTime())) return false;
  const end = start.getTime() + (session.duration_minutes || 60) * 60_000;
  return end <= Date.now();
};

const clientName = (session: Session): string =>
  session.client?.full_name?.trim() || session.client?.email || "";

const initialsOf = (name: string): string =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

/* -------------------------------------------------------------------------- */
/* Alliance trend indicator                                                   */
/* -------------------------------------------------------------------------- */

const AllianceTrendPill = ({
  rating,
  trend,
}: {
  rating: number;
  trend: AllianceTrend;
}) => {
  const { t } = useTranslation();

  // Semantic tokens: a rising / stable alliance reads success; a falling one
  // reads warning. Never mint (this is a clinical signal, not AI), never the
  // strong destructive red (reserved for true emergencies elsewhere).
  const config =
    trend === "up"
      ? { Icon: ArrowUpRight, tone: "text-success", label: t("prep_alliance_up", "stijgt") }
      : trend === "down"
        ? { Icon: ArrowDownRight, tone: "text-warning", label: t("prep_alliance_down", "zakt") }
        : { Icon: Minus, tone: "text-muted-foreground", label: t("prep_alliance_flat", "stabiel") };

  const { Icon, tone, label } = config;

  return (
    <span
      className="inline-flex items-center gap-1 text-body-sm text-muted-foreground"
      title={t("prep_alliance_title", "Alliantie (laatste sessie)")}
    >
      <span className="text-foreground/80">
        {t("prep_alliance_label", "Alliantie")}
      </span>
      <span className={cn("inline-flex items-center gap-0.5 font-medium", tone)}>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {rating}/5
      </span>
      <span className="text-muted-foreground">· {label}</span>
    </span>
  );
};

/* -------------------------------------------------------------------------- */
/* Card                                                                        */
/* -------------------------------------------------------------------------- */

const ClientPrepCard = ({
  session,
  prep,
  onPrepare,
  onStartNote,
  onConfirm,
  onDeny,
  className,
}: ClientPrepCardProps) => {
  const { t } = useTranslation();

  const name = clientName(session);
  const time = formatTime(session.session_time);
  const isOnline =
    (session.session_format || "").toLowerCase().includes("online") ||
    (session.session_type || "").toLowerCase().includes("online");
  const isPending = session.status === "Pending";

  // A post-session card offers the note affordance; otherwise the primary
  // action is "Voorbereiden". Completed sessions always count as post-session,
  // and so does a confirmed session whose slot has passed.
  const isPostSession =
    session.status === "Completed" ||
    (session.status === "Confirmed" && sessionEnded(session));
  const noteSigned = prep?.noteStatus === "signed";
  const showStartNote = Boolean(onStartNote) && isPostSession && !noteSigned;
  const showNoteSigned = isPostSession && noteSigned;

  const flags = prep?.flags?.filter(Boolean) ?? [];
  const hasHomework =
    prep?.homework && typeof prep.homework.total === "number" && prep.homework.total > 0;
  const hasAlliance = prep?.alliance && typeof prep.alliance.rating === "number";
  const hasNote = Boolean(prep?.lastNote && prep.lastNote.trim());

  // The prep strip only renders if at least one source has data — graceful
  // absence means an empty strip disappears entirely rather than leaving a gap.
  const hasPrep =
    hasNote || hasHomework || hasAlliance || flags.length > 0 || prep?.checkInPending;

  return (
    <div
      className={cn(
        "rounded-card border border-border bg-card p-4 transition-shadow hover:shadow-raise",
        className,
      )}
    >
      {/* Header: time + identity + format + session count */}
      <div className="flex items-start gap-3">
        <div className="flex w-12 shrink-0 flex-col items-center">
          <span className="text-body font-semibold tabular-nums text-foreground">
            {time || "—"}
          </span>
          {session.duration_minutes ? (
            <span className="text-label text-muted-foreground">
              {session.duration_minutes}
              {t("prep_minutes_abbr", "min")}
            </span>
          ) : null}
        </div>

        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-label font-semibold text-primary"
          aria-hidden="true"
        >
          {initialsOf(name)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate text-body font-semibold text-foreground">
              {name || t("prep_client_unknown", "Cliënt")}
            </p>
            {prep?.sessionNumber ? (
              <span className="text-body-sm text-muted-foreground">
                {t("prep_session_ordinal", "{{n}}e sessie", {
                  n: prep.sessionNumber,
                })}
              </span>
            ) : null}
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              {isOnline ? (
                <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {isOnline
                ? t("prep_format_online", "Online")
                : t("prep_format_in_person", "Op praktijk")}
            </span>
            {isPending ? (
              <Badge variant="warning">
                {t("prep_status_pending", "Wacht op bevestiging")}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      {/* Prep strip — graceful absence: whole block vanishes when empty. */}
      {hasPrep ? (
        <div className="mt-3 space-y-2 border-t border-border/70 pt-3">
          {hasNote ? (
            <p className="flex items-start gap-1.5 text-body-sm text-muted-foreground">
              <FileText
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/50"
                aria-hidden="true"
              />
              <span className="line-clamp-2">{prep!.lastNote}</span>
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {hasHomework ? (
              <span className="inline-flex items-center gap-1 text-body-sm text-muted-foreground">
                <ClipboardCheck
                  className="h-3.5 w-3.5 text-foreground/50"
                  aria-hidden="true"
                />
                {t("prep_homework", "{{done}}/{{total}} taken afgerond", {
                  done: prep!.homework!.done,
                  total: prep!.homework!.total,
                })}
              </span>
            ) : null}

            {hasAlliance ? (
              <AllianceTrendPill
                rating={prep!.alliance!.rating}
                trend={prep!.alliance!.trend}
              />
            ) : null}
          </div>

          {/* Flags + unacknowledged check-in */}
          {flags.length > 0 || prep?.checkInPending ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {prep?.checkInPending ? (
                <Badge variant="warning" className="gap-1">
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  {t("prep_checkin_pending", "Check-in wacht")}
                </Badge>
              ) : null}
              {flags.map((flag, i) => (
                <Badge
                  key={`${flag.label}-${i}`}
                  variant={flag.severity === "urgent" ? "warning" : "outline"}
                  className="gap-1"
                >
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  {flag.label}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2">
        {isPending ? (
          <>
            {onConfirm ? (
              <Button type="button" size="sm" onClick={() => onConfirm(session)}>
                {t("prep_confirm", "Bevestigen")}
              </Button>
            ) : null}
            {onDeny ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onDeny(session)}
              >
                {t("prep_deny", "Weigeren")}
              </Button>
            ) : null}
          </>
        ) : showNoteSigned ? (
          <>
            <span className="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground">
              <Check className="h-4 w-4 text-success" aria-hidden="true" />
              {t("prep_note_signed", "Notitie ondertekend")}
            </span>
            {onStartNote ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onStartNote(session)}
                className="h-auto rounded-ctl px-2 py-1 text-body-sm"
              >
                {t("prep_finish_admin", "Administratie afronden")}
              </Button>
            ) : null}
          </>
        ) : showStartNote ? (
          <Button
            type="button"
            size="sm"
            variant={prep?.noteStatus === "draft" ? "outline" : "default"}
            onClick={() => onStartNote?.(session)}
            className="gap-1"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            {prep?.noteStatus === "draft"
              ? t("prep_finish_note", "Klad afwerken")
              : t("prep_start_note", "Notitie starten")}
          </Button>
        ) : onPrepare ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onPrepare(session)}
            className="gap-1"
          >
            {t("prep_prepare", "Voorbereiden")}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default ClientPrepCard;
