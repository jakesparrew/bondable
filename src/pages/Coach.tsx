import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Phone, ShieldCheck } from "lucide-react";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import BondMessageBubble from "@/components/bond/BondMessageBubble";
import BondTypingIndicator from "@/components/bond/BondTypingIndicator";
import BondSuggestionChips from "@/components/bond/BondSuggestionChips";
import BondComposer from "@/components/bond/BondComposer";
import {
  bondRespond,
  buildOpening,
  type BondMessage,
} from "@/components/bond/bondEngine";

/**
 * Coach — /coach, the PUBLIC entry point. No account, no dashboard shell.
 *
 * This is the page the four protection layers were built for (see
 * `src/server/coach/*`): anyone can talk, the server meters it, and the free
 * allowance running out is a conversion moment rather than an error.
 *
 * Deliberately NOT reusing `BondChat`: that component is wired to
 * `useAuthManager`, `useOptimizedTasks`, `useCheckins` and friends, which would
 * fire authenticated data fetches for a visitor who has no account and no data.
 * It reuses the presentational pieces and the engine instead — same Bond, no
 * phantom requests.
 *
 * Context is deliberately EMPTY. An anonymous visitor has no check-ins, no care
 * plan and no provider, so Bond gets nothing about them and says nothing it
 * cannot know.
 *
 * Nothing is persisted here. `BondChat` stores its thread for logged-in
 * continuity; this page holds the conversation in memory only, because storing
 * an anonymous mental-health conversation on a shared device is a privacy
 * problem, not a feature. That is also exactly what makes "save this" worth
 * offering at the cap.
 */

let idCounter = 0;
const nextId = () => `coach-${Date.now()}-${idCounter++}`;

const Coach = () => {
  const { t } = useTranslation();

  const [messages, setMessages] = useState<BondMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  /** Set once the free allowance runs out; drives the sign-up panel. */
  const [capped, setCapped] = useState(false);
  const [turnsLeft, setTurnsLeft] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const openedRef = useRef(false);

  // Opening turn. States up front that Bond is an AI (EU AI Act Art. 50) —
  // before the first question, not buried in a footer.
  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    const opening = buildOpening({}, true);
    setMessages([
      {
        id: nextId(),
        role: "bond",
        text: opening.text,
        createdAt: new Date().toISOString(),
      },
    ]);
    setSuggestions(opening.suggestions);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isTyping]);

  const handleSend = (text: string) => {
    if (isTyping || capped) return;

    const history = [
      ...messages,
      {
        id: nextId(),
        role: "user" as const,
        text,
        createdAt: new Date().toISOString(),
      },
    ];
    setMessages(history);
    setSuggestions([]);
    setIsTyping(true);

    // The bubble is created on the first streamed character, so a non-streaming
    // reply (crisis, cap, fallback) never flashes an empty bubble first.
    const replyId = nextId();
    let streaming = false;

    const appendDelta = (delta: string) => {
      if (!streaming) {
        streaming = true;
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: replyId,
            role: "bond",
            text: delta,
            createdAt: new Date().toISOString(),
          },
        ]);
        return;
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === replyId ? { ...m, text: m.text + delta } : m)),
      );
    };

    void bondRespond(history, {}, { onDelta: appendDelta }).then((reply) => {
      setMessages((prev) =>
        streaming
          ? prev.map((m) => (m.id === replyId ? { ...m, text: reply.text } : m))
          : [
              ...prev,
              {
                id: replyId,
                role: "bond",
                text: reply.text,
                createdAt: new Date().toISOString(),
                crisis: reply.crisis,
              },
            ],
      );
      setSuggestions(reply.suggestions ?? []);
      setIsTyping(false);

      // The engine reports the quota explicitly. Matching on reply copy would
      // break the moment anyone edits a translation string.
      if (reply.capped) setCapped(true);
      if (reply.turnsLeft !== undefined) setTurnsLeft(reply.turnsLeft);
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Seo
        title="Praat met The Coach"
        description="Praat vandaag nog met The Coach, je AI-begeleider. Gratis, zonder account, in het Nederlands. Bondable verbindt je daarna met een hulpverlener die bij je past."
        path="/coach"
      />

      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="font-display text-lg font-semibold">
            Bondable
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/find">
              {t("coach_find_provider", "Vind een hulpverlener")}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-4">
        {/* Transparency strip. Not a disclaimer nobody reads — it is the first
            thing on the page, in plain language. */}
        <div className="mb-3 flex items-start gap-2 rounded-ctl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {t(
              "coach_transparency",
              "The Coach is een AI, geen hulpverlener. Hij denkt met je mee tussen gesprekken door en vervangt geen behandeling. Bij acuut gevaar: bel 112, of de Zelfmoordlijn op 1813.",
            )}
          </p>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto rounded-card border border-border bg-card p-4"
        >
          {messages.map((message) => (
            <BondMessageBubble key={message.id} message={message} />
          ))}
          {isTyping && <BondTypingIndicator />}
        </div>

        {/* Cap reached: the whole point of the anonymous funnel. Offer the two
            things that actually help — keep the conversation, or find a real
            person — instead of a wall. */}
        {capped ? (
          <div className="mt-4 space-y-3 rounded-card border border-border bg-card p-4">
            <h2 className="font-display text-lg font-semibold">
              {t("coach_cap_title", "Hier stopt het gratis stuk")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t(
                "coach_cap_body",
                "Maak een account aan, dan bewaren we dit gesprek en pikt The Coach het op waar jullie gebleven zijn. Liever meteen een mens? Zoek dan een hulpverlener die bij je past.",
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/login">{t("coach_cap_signup", "Account aanmaken")}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/find">
                  {t("coach_cap_find", "Vind een hulpverlener")}
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {suggestions.length > 0 && (
              <BondSuggestionChips
                suggestions={suggestions}
                onSelect={handleSend}
                disabled={isTyping}
              />
            )}
            <BondComposer onSend={handleSend} disabled={isTyping} />
            {turnsLeft !== null && turnsLeft <= 3 && (
              <p className="text-center text-sm text-muted-foreground">
                {t("coach_turns_left", "Nog {{count}} berichten zonder account.", {
                  count: turnsLeft,
                })}
              </p>
            )}
          </div>
        )}

        {/* Crisis line stays reachable at all times, including after the cap —
            a quota must never sit between someone and help. */}
        <p className="mt-4 flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <Phone className="h-3.5 w-3.5" />
          {t(
            "coach_crisis_footer",
            "Nood? Zelfmoordlijn 1813 · Awel 102 · Noodnummer 112",
          )}
        </p>
      </main>
    </div>
  );
};

export default Coach;
