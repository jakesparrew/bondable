import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarCheck, ChevronRight } from "lucide-react";

import { useAuthManager } from "@/hooks/api/useAuthManager";
import { useConnectedTherapists } from "@/hooks/api/useOptimizedTherapists";
import { useOptimizedTasks } from "@/hooks/api/useOptimizedTasks";
import { useOptimizedSessions } from "@/hooks/api/useOptimizedSessions";
import { useCheckins } from "@/services/api/checkinService";
import { carePlanService } from "@/services/api/carePlanService";
import { getNextSession } from "@/components/dashboard/client/clientSessionUtils";
import { sessionStartMs } from "@/components/sessions/sessionLoopUtils";
import SessionPrepPrompt from "@/components/sessions/SessionPrepPrompt";

import BondHeader from "./BondHeader";
import BondMessageBubble from "./BondMessageBubble";
import BondTypingIndicator from "./BondTypingIndicator";
import BondSuggestionChips from "./BondSuggestionChips";
import BondComposer from "./BondComposer";
import BondCheckIn from "./BondCheckIn";
import MoodRibbon from "./MoodRibbon";
import {
  bondRespond,
  buildOpening,
  DEFAULT_SUGGESTIONS,
  type BondContext,
  type BondMessage,
} from "./bondEngine";

let idCounter = 0;
const nextId = () => `bond-${Date.now()}-${idCounter++}`;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const PREP_WINDOW_DAYS = 3;

/**
 * BondChat — the client-facing companion surface.
 *
 * The scripted engine has not become smarter; it has become CONTINUOUS. Every
 * turn is handed a BondContext assembled from real data — the last check-in and
 * its themes, the week's direction, one named zorgplan task, the days until the
 * next session, the provider's name — so Bond opens by picking up where the
 * client left off instead of greeting a stranger.
 *
 * The check-in lives here too, so saving one immediately updates the ribbon, the
 * dashboard and Bond's own memory (all read `checkinService`).
 *
 * To go live, only `bondEngine.bondRespond` needs to change (see its SWAP POINT).
 */
const BondChat = () => {
  const { t } = useTranslation();

  const { user } = useAuthManager();
  const { data: therapists = [] } = useConnectedTherapists();
  const { data: sessions = [] } = useOptimizedSessions("client");
  const { insight, today: todayCheckin } = useCheckins();

  // Tasks power the plan-aware nudge. Read-only; harmless if empty.
  const { tasks = [] } = useOptimizedTasks("client", user?.id ?? "") as {
    tasks?: Array<{ status?: string }>;
  };

  const firstName = useMemo(
    () =>
      (user?.user_metadata as { first_name?: string } | undefined)?.first_name?.trim() ||
      undefined,
    [user],
  );
  const therapistName = therapists[0]?.name;

  const openTaskCount = useMemo(
    () =>
      tasks.filter(
        (taskItem) => taskItem.status === "assigned" || taskItem.status === "in-progress",
      ).length,
    [tasks],
  );

  // One named zorgplan task beats a count — naming it is what memory buys.
  const openTaskTitle = useMemo(() => {
    try {
      const plan = carePlanService.getCarePlan();
      for (const group of plan.goals) {
        const open = group.tasks.find((task) => task.status === "open");
        if (open) return open.title;
      }
    } catch {
      /* the plan is optional context; never break the chat over it */
    }
    return undefined;
  }, []);

  const nextSession = useMemo(() => getNextSession(sessions), [sessions]);

  const daysUntilSession = useMemo(() => {
    if (!nextSession) return null;
    const start = sessionStartMs(nextSession);
    if (start <= 0) return null;
    const delta = start - Date.now();
    // `getNextSession` falls back to the soonest scheduled session even when it
    // is already behind us (the mock's seed clock drifts). A session that has
    // passed is not something to prepare for — treat it as no session at all.
    if (delta < -HOUR_MS) return null;
    return Math.max(0, Math.ceil(delta / DAY_MS));
  }, [nextSession]);

  const providerName = therapistName || nextSession?.therapist?.full_name;

  const context: BondContext = useMemo(() => {
    const latest = insight.latest;
    return {
      firstName,
      therapistName,
      openTaskCount,
      openTaskTitle,
      lastCheckin: latest
        ? {
            mood: latest.mood,
            tags: latest.tags,
            daysAgo: insight.continuity.daysSinceLast ?? 0,
          }
        : undefined,
      checkinDirection: insight.direction,
      returningAfterQuiet: insight.continuity.returningAfterQuiet,
      nextSession:
        daysUntilSession != null
          ? { daysUntil: daysUntilSession, providerName }
          : undefined,
      lastTopic: insight.topTags[0],
    };
  }, [
    firstName,
    therapistName,
    openTaskCount,
    openTaskTitle,
    insight,
    daysUntilSession,
    providerName,
  ]);

  // Keep a ref so the async responder always reads the latest context without
  // needing to be re-created on every context change.
  const contextRef = useRef(context);
  contextRef.current = context;

  const [messages, setMessages] = useState<BondMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  // Structured daily check-in: a compact affordance that expands inline above the
  // thread (mint is allowed — this is a Bond surface).
  const [checkinOpen, setCheckinOpen] = useState(false);
  // The prep ritual, offered inside Bond ("Wil je dit samen voorbereiden?").
  const [prepOpen, setPrepOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const openedRef = useRef(false);

  // Seed the opening (transparency + continuity) message once context is ready.
  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    const opening = buildOpening(contextRef.current);
    setMessages([
      {
        id: nextId(),
        role: "bond",
        text: opening.text,
        createdAt: new Date().toISOString(),
      },
    ]);
    setSuggestions(opening.suggestions);
    // Intentionally run once on mount; opening copy reads the current context ref.
  }, []);

  // Auto-scroll to newest message / typing indicator.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isTyping]);

  const handleSend = (text: string) => {
    if (isTyping) return;

    const userMessage: BondMessage = {
      id: nextId(),
      role: "user",
      text,
      createdAt: new Date().toISOString(),
    };

    const history = [...messages, userMessage];
    setMessages(history);
    setSuggestions([]);
    setIsTyping(true);

    // Scripted/mockup: bondRespond fakes latency + the scripted reply, and reads
    // the history for short-term memory so Bond does not repeat itself.
    void bondRespond(history, contextRef.current).then((reply) => {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "bond",
          text: reply.text,
          createdAt: new Date().toISOString(),
          crisis: reply.crisis,
        },
      ]);
      setSuggestions(reply.suggestions ?? []);
      setIsTyping(false);
    });
  };

  const handleSuggestion = (text: string) => {
    if (text === t("bond_show_crisis", "Toon me de hulplijnen")) {
      // Re-surface help as a fresh Bond crisis turn (no model call needed).
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "bond",
          text: t("bond_crisis_reshow", "Hier is wie je nu kunt bereiken. Blijf hier niet alleen mee."),
          createdAt: new Date().toISOString(),
          crisis: true,
        },
      ]);
      setSuggestions([t("bond_keep_talking", "Ik wil blijven praten")]);
      return;
    }
    if (text === t("bond_chip_prep", "Help me de sessie voorbereiden")) {
      // The prep ritual is a form, not a chat turn — open it in place.
      setPrepOpen(true);
      return;
    }
    handleSend(text);
  };

  const canPrep =
    Boolean(nextSession) && daysUntilSession != null && daysUntilSession <= PREP_WINDOW_DAYS;

  const handleCheckinComplete = () => {
    // The check-in is already persisted by checkinService; Bond acknowledges it
    // in-thread so the client sees the consequence land inside the conversation.
    setMessages((prev) => [
      ...prev,
      {
        id: nextId(),
        role: "bond",
        text: t(
          "bond_checkin_ack",
          "Genoteerd, dank je. Ik neem het mee zolang we praten, en je overzicht schikt zich erop.",
        ),
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[28rem] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <BondHeader therapistName={therapistName} />

      {/* Daily check-in affordance + the prep ritual. Mint is allowed here
          (Bond surface). MoodRibbon sits subtly beneath. */}
      <div className="border-b border-border bg-card px-4 py-3 sm:px-6">
        {checkinOpen ? (
          <BondCheckIn
            onComplete={handleCheckinComplete}
            onCancel={() => setCheckinOpen(false)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setCheckinOpen(true)}
              className="flex items-center justify-between gap-3 rounded-card border border-mint/40 bg-mint-soft px-3.5 py-3 text-left transition-colors hover:bg-mint/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mint text-mint-foreground"
                >
                  <CalendarCheck className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">
                    {t("checkin_cta_title", "Dagelijkse check-in")}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {todayCheckin
                      ? t("checkin_cta_done", "Je checkte vandaag al in. Nog eens mag altijd")
                      : t("checkin_cta_subtitle", "Onder de minuut, helemaal aan jou")}
                  </span>
                </span>
              </span>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </button>

            <MoodRibbon />

            {/* "Wil je dit samen voorbereiden?" — the ritual, offered inside Bond. */}
            {canPrep &&
              (prepOpen ? (
                <SessionPrepPrompt
                  session={nextSession}
                  providerName={providerName}
                  variant="bond"
                  windowHours={PREP_WINDOW_DAYS * 24}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setPrepOpen(true)}
                  className="rounded-card border border-mint/40 bg-card px-3.5 py-2.5 text-left text-xs text-muted-foreground transition-colors hover:bg-mint/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <span className="font-semibold text-foreground">
                    {t("bond_prep_offer_title", "Wil je dit samen voorbereiden?")}
                  </span>{" "}
                  {providerName
                    ? t("bond_prep_offer_body", "Noteer wat je zeker wil bespreken met {{provider}}.", {
                        provider: providerName,
                      })
                    : t("bond_prep_offer_body_plain", "Noteer wat je zeker wil bespreken.")}
                </button>
              ))}
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto bg-background px-4 py-5 sm:px-6"
        aria-live="polite"
        aria-label={t("bond_thread_label", "Gesprek met Bond")}
      >
        {messages.map((m) => (
          <BondMessageBubble key={m.id} message={m} />
        ))}

        {isTyping && <BondTypingIndicator />}

        {!isTyping && suggestions.length > 0 && (
          <div className="pt-1">
            <BondSuggestionChips
              suggestions={suggestions}
              onSelect={handleSuggestion}
              disabled={isTyping}
            />
          </div>
        )}
      </div>

      <BondComposer onSend={handleSend} disabled={isTyping} />
    </div>
  );
};

export default BondChat;
