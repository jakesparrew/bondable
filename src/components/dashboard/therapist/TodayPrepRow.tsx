import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { isToday, parseISO } from "date-fns";
import { FileText } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import LineMeet from "@/components/illustration/LineMeet";
import { Button } from "@/components/ui/button";
import {
  useOptimizedSessions,
  useConfirmSession,
  useDenySession,
} from "@/hooks/api/useOptimizedSessions";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import type { Session } from "@/services/api/SessionService";
import { TaskService } from "@/services/api/TaskService";
import { SessionFeedbackService } from "@/services/api/sessionFeedbackService";
import { noteService, type SessionNote } from "@/services/api/noteService";
import ClientPrepCard, {
  type ClientPrepData,
} from "@/components/dashboard/therapist/ClientPrepCard";
import QuickCaptureSheet from "@/components/notes/QuickCaptureSheet";

/**
 * TodayPrepRow — the "Vandaag" strip on the provider dashboard (plan 04 §1).
 *
 * Keeps this provider's sessions for today, ordered by start time, and hands
 * each ClientPrepCard a real prep bag:
 *
 *   - the last SIGNED note's one-liner for that client (noteService)
 *   - homework done / total (TaskService)
 *   - the alliance rating + its direction of travel (session_feedback)
 *   - this session's note status, so a finished session offers the 90-second
 *     capture right here instead of three clicks away
 *
 * GRACEFUL ABSENCE: every source is optional and independent. A source with no
 * data contributes nothing — no skeleton that never resolves, no "n/a" row. The
 * prep query never throws into the UI; a failing source simply stays quiet.
 *
 * The Risico field never leaves noteService — it is not part of the prep bag.
 * No analytics fire here: this row reads clinical material.
 */

const MAX_CARDS = 3;
const ONE_LINER_MAX = 140;

/* -------------------------------------------------------------------------- */
/* Prep building                                                              */
/* -------------------------------------------------------------------------- */

const truncate = (text: string): string => {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > ONE_LINER_MAX
    ? `${clean.slice(0, ONE_LINER_MAX - 1).trimEnd()}…`
    : clean;
};

/**
 * First non-empty body field of a signed note, in template order. Huiswerk,
 * Risico and the internal mood chip are never surfaced.
 */
const noteOneLiner = (note: SessionNote): string => {
  const skip = new Set(["huiswerk", "risico", "__mood"]);
  const template = noteService.getTemplate(note.templateId);
  const keys = template
    ? template.fields.map((f) => f.key)
    : Object.keys(note.contentJson);
  for (const key of keys) {
    if (skip.has(key)) continue;
    const value = note.contentJson[key];
    if (value && value.trim()) return truncate(value);
  }
  return "";
};

const sessionCounts = (session: Session): boolean =>
  session.status !== "Cancelled" && session.status !== "Denied";

/** 1-based ordinal of this session within the client relationship. */
const ordinalFor = (session: Session, all: Session[]): number | null => {
  const clientId = session.client?.id ?? session.client_id;
  if (!clientId) return null;
  const earlier = all.filter((s) => {
    if ((s.client?.id ?? s.client_id) !== clientId) return false;
    if (!sessionCounts(s)) return false;
    const key = `${s.session_date} ${s.session_time || ""}`;
    const self = `${session.session_date} ${session.session_time || ""}`;
    return key < self;
  });
  return earlier.length + 1;
};

/** Alliance rating + trend from the client's two most recent past sessions. */
const allianceFor = async (
  session: Session,
  all: Session[],
): Promise<ClientPrepData["alliance"]> => {
  const clientId = session.client?.id ?? session.client_id;
  if (!clientId) return null;

  const past = all
    .filter(
      (s) =>
        (s.client?.id ?? s.client_id) === clientId &&
        s.id !== session.id &&
        sessionCounts(s) &&
        `${s.session_date}` <= `${session.session_date}`,
    )
    .sort((a, b) =>
      `${b.session_date} ${b.session_time || ""}`.localeCompare(
        `${a.session_date} ${a.session_time || ""}`,
      ),
    )
    .slice(0, 2);

  const ratings: number[] = [];
  for (const s of past) {
    try {
      const feedback = await SessionFeedbackService.getFeedbackForSession(s.id);
      const values = feedback
        .map((f) => f.alliance_rating)
        .filter((r): r is number => typeof r === "number");
      if (values.length > 0) {
        ratings.push(values.reduce((a, b) => a + b, 0) / values.length);
      }
    } catch {
      /* silent — a missing feedback table just means no alliance signal */
    }
  }

  if (ratings.length === 0) return null;
  const latest = Math.round(ratings[0] * 10) / 10;
  const trend =
    ratings.length < 2
      ? "flat"
      : ratings[0] > ratings[1]
        ? "up"
        : ratings[0] < ratings[1]
          ? "down"
          : "flat";
  return { rating: latest, trend };
};

const homeworkFor = async (
  session: Session,
  providerId: string,
): Promise<ClientPrepData["homework"]> => {
  const clientId = session.client?.id ?? session.client_id;
  if (!clientId) return null;
  try {
    const tasks = await TaskService.getClientTasks(clientId);
    const mine = tasks.filter(
      (task) => !task.therapist_id || task.therapist_id === providerId,
    );
    if (mine.length === 0) return null;
    return {
      done: mine.filter((task) => task.status === "completed").length,
      total: mine.length,
    };
  } catch {
    return null;
  }
};

/* -------------------------------------------------------------------------- */
/* Row                                                                        */
/* -------------------------------------------------------------------------- */

const TodayPrepRow = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthManager();
  const providerId = user?.id ?? "";

  const { data: sessions = [], isLoading } = useOptimizedSessions("therapist");
  const confirmSession = useConfirmSession();
  const denySession = useDenySession();

  const [captureSession, setCaptureSession] = useState<Session | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const todaySessions = useMemo(() => {
    const parseDate = (d: string): Date | null => {
      try {
        return parseISO(d);
      } catch {
        return null;
      }
    };

    return sessions
      .filter((s) => {
        const d = parseDate(s.session_date);
        return d != null && isToday(d) && sessionCounts(s);
      })
      .sort((a, b) => (a.session_time || "").localeCompare(b.session_time || ""))
      .slice(0, MAX_CARDS);
  }, [sessions]);

  const todayIds = todaySessions.map((s) => s.id).join(",");

  const { data: prepMap } = useQuery({
    queryKey: ["today-prep", providerId, todayIds, refreshKey],
    enabled: todaySessions.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<Record<string, ClientPrepData>> => {
      const entries = await Promise.all(
        todaySessions.map(async (session) => {
          const clientId = session.client?.id ?? session.client_id;
          const ownNote = noteService.getNoteForSession(session.id);

          const lastSigned = clientId
            ? noteService
                .listNotesForClient(clientId)
                .find((n) => n.status === "signed" && n.sessionId !== session.id)
            : undefined;

          const [homework, alliance] = await Promise.all([
            homeworkFor(session, providerId),
            allianceFor(session, sessions),
          ]);

          const prep: ClientPrepData = {
            lastNote: lastSigned ? noteOneLiner(lastSigned) : null,
            homework,
            alliance,
            sessionNumber: ordinalFor(session, sessions),
            noteStatus: ownNote ? ownNote.status : null,
          };
          return [session.id, prep] as const;
        }),
      );
      return Object.fromEntries(entries);
    },
  });

  /** Gentle count of unfinished notes — a reminder, never an alarm. */
  const drafts = useMemo(() => {
    if (!providerId) return [];
    // refreshKey re-reads the localStorage-backed note store after a capture.
    void refreshKey;
    return noteService.listDraftsForProvider(providerId);
  }, [providerId, refreshKey]);

  const goToClient = (session: Session) => {
    const clientId = session.client?.id ?? session.client_id;
    if (clientId) {
      navigate(`/dashboard/therapist/clients/${clientId}/client-profile`);
    } else {
      navigate("/dashboard/therapist/clients");
    }
  };

  /** Open the 90-second capture for the oldest unfinished draft. */
  const openOldestDraft = useCallback(() => {
    const oldest = [...drafts].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    )[0];
    if (!oldest) return;
    const match = sessions.find((s) => s.id === oldest.sessionId);
    setCaptureSession(
      match ??
        ({
          id: oldest.sessionId,
          client_id: oldest.clientId,
          therapist_id: oldest.providerId,
          session_date: "",
          session_time: "",
          session_type: "",
          duration_minutes: 60,
          status: "Completed",
          created_at: oldest.createdAt,
          updated_at: oldest.updatedAt,
        } as Session),
    );
  }, [drafts, sessions]);

  const draftsLine =
    drafts.length === 0 ? null : (
      <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground">
          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          {drafts.length === 1
            ? t("prep_drafts_one", "Eén notitie staat nog als klad.")
            : t("prep_drafts_many", "{{n}} notities staan nog als klad.", {
                n: drafts.length,
              })}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={openOldestDraft}
          className="h-auto rounded-ctl px-2 py-1 text-body-sm"
        >
          {t("prep_drafts_action", "Afwerken")}
        </Button>
      </div>
    );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-card border border-border/60 bg-muted/40"
          />
        ))}
      </div>
    );
  }

  const capture =
    captureSession && providerId ? (
      <QuickCaptureSheet
        open
        onOpenChange={(next) => {
          if (!next) setCaptureSession(null);
        }}
        sessionId={captureSession.id}
        providerId={providerId}
        clientId={captureSession.client?.id ?? captureSession.client_id}
        clientName={captureSession.client?.full_name}
        sessionDate={captureSession.session_date?.slice(0, 10) || undefined}
        durationMin={captureSession.duration_minutes}
        // A session whose note is already signed reopens on the paperwork step
        // rather than on a note the provider just wrote.
        startInChain={
          noteService.getNoteForSession(captureSession.id)?.status === "signed"
        }
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
    ) : null;

  if (todaySessions.length === 0) {
    return (
      <>
        {draftsLine}
        <EmptyState
          bordered
          motif={<LineMeet className="h-20 w-20" />}
          title={t("today_prep_empty_title", "Geen sessies vandaag")}
          description={t(
            "today_prep_empty_desc",
            "Een rustige dag. Zodra er een sessie gepland staat, verschijnt je voorbereiding hier.",
          )}
          className="py-8"
        />
        {capture}
      </>
    );
  }

  return (
    <>
      {draftsLine}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {todaySessions.map((session) => (
          <ClientPrepCard
            key={session.id}
            session={session}
            prep={prepMap?.[session.id]}
            onPrepare={goToClient}
            onStartNote={(s) => setCaptureSession(s)}
            onConfirm={(s) => confirmSession.mutate(s.id)}
            onDeny={(s) => denySession.mutate(s.id)}
          />
        ))}
      </div>
      {capture}
    </>
  );
};

export default TodayPrepRow;
