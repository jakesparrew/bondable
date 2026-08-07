import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, LogOut, Phone, ShieldCheck, Trash2 } from "lucide-react";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import BondMessageBubble from "@/components/bond/BondMessageBubble";
import BondTypingIndicator from "@/components/bond/BondTypingIndicator";
import BondSuggestionChips from "@/components/bond/BondSuggestionChips";
import BondComposer from "@/components/bond/BondComposer";
import CoachAuthPanel from "@/components/coach/CoachAuthPanel";
import {
  bondRespond,
  buildOpening,
  type BondMessage,
} from "@/components/bond/bondEngine";
import { clearApiToken, getApiToken, signOut, useSession } from "@/lib/authClient";
import {
  deleteServerThread,
  loadServerThread,
  saveServerThread,
} from "@/services/api/coachThreadClient";

/**
 * Coach — /coach, the PUBLIC entry point. No dashboard shell; no account
 * required to start talking.
 *
 * Two visitor states, two storage rules:
 *
 *   ANONYMOUS — the conversation lives in this component's memory and nowhere
 *   else. Storing an anonymous mental-health conversation on a shared device
 *   is a privacy problem, not a feature — and its disappearance on reload is
 *   exactly what makes "save this" worth an account at the cap.
 *
 *   SIGNED IN — the conversation is saved server-side after every completed
 *   reply (the promise Bond makes at the cap), restored on mount, erasable
 *   with one button. The anonymous protections that meter strangers (bot
 *   check, device budget) no longer apply; the account's daily cap does.
 *
 * The bridge between the two is the ADOPTION flow: at the cap the visitor
 * signs up inline (no navigation — navigating would discard the very
 * conversation Bond just promised to keep), and the in-memory thread is
 * PUT to the server. The Google path must navigate away for OAuth, so the
 * thread is stashed in sessionStorage first and adopted when the redirect
 * lands back here.
 *
 * Deliberately NOT reusing `BondChat`: that component is wired to the
 * dashboard's data hooks, which would fire authenticated fetches for data an
 * anonymous visitor does not have. Same presentational pieces, same engine.
 */

let idCounter = 0;
const nextId = () => `coach-${Date.now()}-${idCounter++}`;

/**
 * Where the thread waits out the Google redirect. sessionStorage, not
 * localStorage: it must not survive the tab, only the round-trip to the
 * OAuth screen and back.
 */
const STASH_KEY = "bnd_coach_pending_thread";

const stashThread = (messages: BondMessage[]): void => {
  try {
    sessionStorage.setItem(STASH_KEY, JSON.stringify(messages));
  } catch {
    /* quota/private mode: the Google path then starts fresh — survivable */
  }
};

const readStash = (): BondMessage[] | null => {
  try {
    const raw = sessionStorage.getItem(STASH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as BondMessage[]) : null;
  } catch {
    return null;
  }
};

const clearStash = (): void => {
  try {
    sessionStorage.removeItem(STASH_KEY);
  } catch {
    /* ignore */
  }
};

/** Merge stored + adopted messages without duplicating a re-adopted stash. */
const mergeThreads = (server: BondMessage[], local: BondMessage[]): BondMessage[] => {
  const seen = new Set(server.map((m) => m.id));
  return [...server, ...local.filter((m) => !seen.has(m.id))].slice(-200);
};

const Coach = () => {
  const { t } = useTranslation();
  const session = useSession();
  const signedIn = Boolean(session.data?.user);
  const firstName =
    session.data?.user?.name?.trim().split(/\s+/)[0] ??
    session.data?.user?.email?.split("@")[0] ??
    "";

  const [messages, setMessages] = useState<BondMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  /** Set once the free allowance runs out; drives the inline sign-up panel. */
  const [capped, setCapped] = useState(false);
  const [turnsLeft, setTurnsLeft] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const seededRef = useRef(false);
  /** Mirrors `messages` for save calls made outside React's render cycle. */
  const messagesRef = useRef<BondMessage[]>([]);
  messagesRef.current = messages;

  /**
   * Seed the thread once the session state has settled. Order of preference:
   * stash (an adoption in progress — the freshest conversation), then the
   * server thread (a returning user), then the opening turn. The opening
   * states up front that Bond is an AI (EU AI Act Art. 50) — before the
   * first question, not buried in a footer.
   */
  useEffect(() => {
    if (session.isPending || seededRef.current) return;
    seededRef.current = true;

    const seed = async () => {
      const stash = readStash();

      if (signedIn) {
        const token = await getApiToken();

        // Make sure the login is attached to a Bondable person. Idempotent,
        // and required for the Google path, which never passes through the
        // email form's profile step.
        if (token) {
          void fetch("/api/profile", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ role: "client" }),
          }).catch(() => {});
        }

        const server = token ? await loadServerThread(token) : null;

        if (stash) {
          // Adoption: the moment Bond's "dan bewaar ik dit gesprek" comes true.
          const merged = mergeThreads(server ?? [], stash);
          const confirmed: BondMessage[] = [
            ...merged,
            {
              id: nextId(),
              role: "bond",
              text: t(
                "coach_thread_adopted",
                "Gelukt — je gesprek is bewaard. We kunnen gewoon verder waar we waren.",
              ),
              createdAt: new Date().toISOString(),
            },
          ];
          setMessages(confirmed);
          clearStash();
          if (token) void saveServerThread(token, confirmed);
          return;
        }

        if (server && server.length > 0) {
          setMessages(server);
          return;
        }

        // Signed in, nothing stored yet: greet by name, honestly — no
        // "zonder account" line (they have one), no invented care plan.
        setMessages([
          {
            id: nextId(),
            role: "bond",
            text: [
              firstName
                ? t("coach_open_signed_hi", "Dag {{name}}.", { name: firstName })
                : t("coach_open_signed_hi_anon", "Dag."),
              t(
                "coach_open_signed_body",
                "Fijn dat je er bent. Ik ben Bond, de AI-gezel van Bondable — geen therapeut en geen crisisdienst. Wat je hier vertelt wordt bewaard, zodat we altijd kunnen verdergaan waar we waren. Waar wil je het over hebben?",
              ),
            ].join(" "),
            createdAt: new Date().toISOString(),
          },
        ]);
        return;
      }

      // Anonymous. A leftover stash means an aborted sign-in attempt: restore
      // the conversation (losing it would punish the abort) and show the cap
      // panel again — the allowance that triggered it is still spent.
      if (stash) {
        setMessages(stash);
        setCapped(true);
        return;
      }

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
    };

    void seed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.isPending, signedIn]);

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

    void (async () => {
      // Token first: it decides both the request identity and whether the
      // engine spends a Turnstile round-trip.
      const authToken = signedIn ? await getApiToken() : undefined;
      const reply = await bondRespond(history, {}, { onDelta: appendDelta, authToken });

      const replyMessage: BondMessage = {
        id: replyId,
        role: "bond",
        text: reply.text,
        createdAt: new Date().toISOString(),
        crisis: reply.crisis,
      };

      setMessages((prev) =>
        streaming
          ? prev.map((m) => (m.id === replyId ? { ...m, text: reply.text } : m))
          : [...prev, replyMessage],
      );
      setSuggestions(reply.suggestions ?? []);
      setIsTyping(false);

      // The engine reports the quota explicitly. Matching on reply copy would
      // break the moment anyone edits a translation string.
      if (reply.capped) setCapped(true);
      if (reply.turnsLeft !== undefined) setTurnsLeft(reply.turnsLeft);

      // Keep the promise: a signed-in thread survives reload and device.
      // `history` already ends on the user turn, so this is the exact thread.
      if (authToken) {
        void saveServerThread(authToken, [...history, replyMessage]);
      }
    })();
  };

  /** Inline auth completed (email path) — adopt the conversation and resume. */
  const adoptAfterAuth = async () => {
    const token = await getApiToken();
    const local = messagesRef.current;

    const confirmed: BondMessage[] = [
      ...local,
      {
        id: nextId(),
        role: "bond",
        text: t(
          "coach_thread_adopted",
          "Gelukt — je gesprek is bewaard. We kunnen gewoon verder waar we waren.",
        ),
        createdAt: new Date().toISOString(),
      },
    ];

    if (token) {
      const server = await loadServerThread(token);
      const merged = server && server.length > 0 ? mergeThreads(server, confirmed) : confirmed;
      setMessages(merged);
      void saveServerThread(token, merged);
    } else {
      setMessages(confirmed);
    }

    clearStash();
    setCapped(false);
    setTurnsLeft(null);
  };

  /** The erase button. Server first, then local — the order the promise implies. */
  const eraseConversation = async () => {
    if (!window.confirm(t("coach_erase_confirm", "Dit gesprek definitief wissen?"))) return;
    const token = await getApiToken();
    if (token) await deleteServerThread(token);
    seededRef.current = false;
    setMessages([]);
    setSuggestions([]);
    setCapped(false);
    // Re-seed as a fresh signed-in thread.
    seededRef.current = true;
    setMessages([
      {
        id: nextId(),
        role: "bond",
        text: t(
          "coach_erased",
          "Gewist. We beginnen met een schone lei — waar wil je het over hebben?",
        ),
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const handleSignOut = async () => {
    await signOut();
    clearApiToken();
    // Full reload: every piece of signed-in state on this page derives from
    // the session, and a hard boundary beats chasing each one down.
    window.location.assign("/coach");
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
          <div className="flex items-center gap-1">
            {signedIn && (
              <>
                <span className="mr-1 hidden text-sm text-muted-foreground sm:inline">
                  {firstName
                    ? t("coach_signed_in_as", "Ingelogd als {{name}}", { name: firstName })
                    : t("coach_signed_in", "Ingelogd")}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={eraseConversation}
                  title={t("coach_erase", "Gesprek wissen")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  title={t("coach_sign_out", "Uitloggen")}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link to="/find">
                {t("coach_find_provider", "Vind een hulpverlener")}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
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

        {/* Cap reached: the conversion moment the anonymous funnel exists for.
            The form is INLINE — navigating away would discard the very
            conversation Bond just promised to save. */}
        {capped ? (
          <CoachAuthPanel
            onAuthenticated={adoptAfterAuth}
            onBeforeRedirect={() => stashThread(messagesRef.current)}
          />
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
            {!signedIn && turnsLeft !== null && turnsLeft <= 3 && (
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
