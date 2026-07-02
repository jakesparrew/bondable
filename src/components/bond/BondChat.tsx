import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarCheck, ChevronRight } from "lucide-react";

import { useAuthManager } from "@/hooks/api/useAuthManager";
import { useConnectedTherapists } from "@/hooks/api/useOptimizedTherapists";
import { useOptimizedTasks } from "@/hooks/api/useOptimizedTasks";

import BondHeader from "./BondHeader";
import BondMessageBubble from "./BondMessageBubble";
import BondTypingIndicator from "./BondTypingIndicator";
import BondSuggestionChips from "./BondSuggestionChips";
import BondComposer from "./BondComposer";
import BondCheckIn from "./BondCheckIn";
import MoodRibbon from "./MoodRibbon";
import {
  bondRespond,
  buildOpeningMessage,
  DEFAULT_SUGGESTIONS,
  type BondContext,
  type BondMessage,
} from "./bondEngine";

let idCounter = 0;
const nextId = () => `bond-${Date.now()}-${idCounter++}`;

/**
 * BondChat — the full client-facing companion chat surface (MOCKUP).
 *
 * Wires the scripted `bondEngine` into a real chat UX: opening transparency
 * message, message thread with auto-scroll, typing indicator, suggestion chips,
 * and the composer. Personalization (first name, supervising therapist, open
 * task count) is light and entirely optional.
 *
 * To go live, only `bondEngine.bondRespond` needs to change (see its SWAP POINT).
 */
const BondChat = () => {
  const { t } = useTranslation();

  const { user } = useAuthManager();
  const { data: therapists = [] } = useConnectedTherapists();
  // Tasks power the optional plan-aware "homework" nudge. Read-only; harmless
  // if empty. Matches the status strings used by the sidebar task counters.
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
        (taskItem) =>
          taskItem.status === "assigned" || taskItem.status === "in-progress",
      ).length,
    [tasks],
  );

  const context: BondContext = useMemo(
    () => ({ firstName, therapistName, openTaskCount }),
    [firstName, therapistName, openTaskCount],
  );
  // Keep a ref so the async responder always reads the latest context without
  // needing to be re-created on every context change.
  const contextRef = useRef(context);
  contextRef.current = context;

  const [messages, setMessages] = useState<BondMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  // Structured daily check-in: a compact affordance that expands inline above the
  // thread (mint is allowed — this is a Bond surface). `checkinNonce` forces the
  // ribbon to re-read localStorage after a check-in is saved.
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkinNonce, setCheckinNonce] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const openedRef = useRef(false);

  // Seed the opening (transparency) message once context is ready.
  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    setMessages([
      {
        id: nextId(),
        role: "bond",
        text: buildOpeningMessage(contextRef.current),
        createdAt: new Date().toISOString(),
      },
    ]);
    // Intentionally run once on mount; opening copy reads current context ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // Scripted/mockup: bondRespond fakes latency + the scripted reply.
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
    if (text === t("bond_show_crisis", "Show me the crisis lines")) {
      // Re-surface help as a fresh Bond crisis turn (no model call needed).
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "bond",
          text: t(
            "bond_crisis_reshow",
            "Here are people you can reach right now. Please don't go through this alone.",
          ),
          createdAt: new Date().toISOString(),
          crisis: true,
        },
      ]);
      setSuggestions(["I'd like to keep talking"]);
      return;
    }
    handleSend(text);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[28rem] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <BondHeader therapistName={therapistName} />

      {/* Daily check-in affordance: compact prompt that expands inline. Mint is
          allowed here (Bond surface). MoodRibbon sits subtly beneath it. */}
      <div className="border-b border-border bg-card px-4 py-3 sm:px-6">
        {checkinOpen ? (
          <BondCheckIn
            onComplete={() => setCheckinNonce((n) => n + 1)}
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
                    {t("checkin_cta_subtitle", "Onder de minuut, helemaal aan jou")}
                  </span>
                </span>
              </span>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </button>

            <MoodRibbon key={checkinNonce} />
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto bg-background px-4 py-5 sm:px-6"
        aria-live="polite"
        aria-label={t("bond_thread_label", "Conversation with Bond")}
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
