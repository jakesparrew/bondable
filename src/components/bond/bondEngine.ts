/**
 * Bond — scripted response engine (MOCKUP).
 * ---------------------------------------------------------------------------
 * This file fakes the AI. There is NO real LLM here: `bondRespond` matches the
 * user's message against simple intent keywords and returns a warm, brief,
 * CBT-flavoured, NON-clinical reply plus a few follow-up suggestion chips.
 *
 * It is intentionally wrapped in an async function with a realistic latency so
 * the UI (typing indicator, disabled composer, etc.) behaves exactly as it will
 * against a real model.
 *
 * ░░░ SWAP POINT ░░░
 * To wire a real model later, keep this signature and replace the body of
 * `generateScriptedReply` with a network/SDK call, e.g.:
 *
 *   const res = await fetch("/api/bond", {
 *     method: "POST",
 *     body: JSON.stringify({ history, context }),
 *   });
 *   const { text, suggestions } = await res.json();
 *   return { text, suggestions };
 *
 * Everything else (crisis guardrail, typing delay) can stay as a client-side
 * safety + UX layer. The crisis check below MUST remain client-side regardless,
 * so distress is caught even if the network/model is unavailable.
 * ---------------------------------------------------------------------------
 */

export type BondRole = "bond" | "user";

export interface BondMessage {
  id: string;
  role: BondRole;
  text: string;
  /** ISO timestamp. */
  createdAt: string;
  /** When true, the message bubble should render inline crisis resources. */
  crisis?: boolean;
}

export interface BondContext {
  /** Client first name, for light personalization. Optional. */
  firstName?: string;
  /** Connected therapist's display name, for the "supervised by" framing. */
  therapistName?: string;
  /** Count of open/pending tasks (homework), for plan-aware nudges. Optional. */
  openTaskCount?: number;
}

export interface BondReply {
  text: string;
  /** Optional follow-up suggestion chips to surface under the reply. */
  suggestions?: string[];
  /** True when the reply is a crisis-guardrail response (surface resources). */
  crisis?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Crisis guardrail (CRITICAL — keep client-side)                              */
/* -------------------------------------------------------------------------- */

/**
 * Distress / self-harm signal patterns. Deliberately broad and matched
 * case-insensitively. Word-boundary-ish patterns avoid the worst false
 * positives (e.g. "skill" should not trip "kill"), but this errs toward
 * surfacing help — that is the safe direction for a mockup AND for production.
 */
const CRISIS_PATTERNS: RegExp[] = [
  /\bsuicid/i,
  /\bkill(ing)?\s+my\s?self\b/i,
  /\bend\s+(it|my\s+life|things)\b/i,
  /\b(want|going)\s+to\s+die\b/i,
  /\bwanna\s+die\b/i,
  /\bi\s+(want|wish)\s+(to|i\s+could)\s+(die|disappear)\b/i,
  /\bhurt(ing)?\s+my\s?self\b/i,
  /\bharm(ing)?\s+my\s?self\b/i,
  /\bself[-\s]?harm/i,
  /\bcut(ting)?\s+my\s?self\b/i,
  /\bno\s+reason\s+to\s+live\b/i,
  /\bbetter\s+off\s+(dead|without\s+me)\b/i,
  /\bhopeless\b/i,
  /\bcan'?t\s+go\s+on\b/i,
  // Dutch / Flemish signals (Belgium-first)
  /\bzelfmoord/i,
  /\bniet\s+meer\s+(leven|verder)\b/i,
  /\been\s+eind(e)?\s+maken\b/i,
];

export const isCrisisMessage = (text: string): boolean =>
  CRISIS_PATTERNS.some((re) => re.test(text));

/* -------------------------------------------------------------------------- */
/* Intent matching (scripted)                                                  */
/* -------------------------------------------------------------------------- */

type Intent =
  | "crisis"
  | "anxiety"
  | "lowMood"
  | "homework"
  | "sleep"
  | "anger"
  | "gratitude"
  | "thanks"
  | "default";

const INTENT_KEYWORDS: Record<Exclude<Intent, "crisis" | "default">, RegExp[]> = {
  anxiety: [
    /\banxi/i,
    /\bpanic/i,
    /\bnervous\b/i,
    /\bworr/i,
    /\bstress/i,
    /\boverwhelm/i,
    /\bon\s+edge\b/i,
    /\bracing\s+thoughts?\b/i,
    /\bangst/i, // NL
    /\bgestrest\b/i, // NL
  ],
  lowMood: [
    /\bsad\b/i,
    /\bdown\b/i,
    /\bdepress/i,
    /\blow\b/i,
    /\bempty\b/i,
    /\bunmotivated\b/i,
    /\bno\s+energy\b/i,
    /\bhard\s+day\b/i,
    /\bbad\s+day\b/i,
    /\blonely\b/i,
    /\bcrying\b/i,
    /\bverdrietig\b/i, // NL
    /\bsomber\b/i, // NL
  ],
  homework: [
    /\bhomework\b/i,
    /\btask/i,
    /\bexercise/i,
    /\bplan\b/i,
    /\bassignment/i,
    /\bpractice\b/i,
    /\bworksheet\b/i,
    /\bhuiswerk\b/i, // NL
    /\boefening\b/i, // NL
  ],
  sleep: [
    /\bsleep/i,
    /\binsomnia\b/i,
    /\bcan'?t\s+sleep\b/i,
    /\btired\b/i,
    /\bawake\b/i,
    /\brest(less)?\b/i,
    /\bslapen\b/i, // NL
    /\bmoe\b/i, // NL
  ],
  anger: [
    /\bangry\b/i,
    /\bfrustrat/i,
    /\birritat/i,
    /\bfurious\b/i,
    /\bmad\b/i,
    /\bboos\b/i, // NL
    /\bkwaad\b/i, // NL
  ],
  gratitude: [
    /\bgood\s+day\b/i,
    /\bhappy\b/i,
    /\bgrateful\b/i,
    /\bproud\b/i,
    /\bwent\s+well\b/i,
    /\bblij\b/i, // NL
  ],
  thanks: [/\bthank(s| you)\b/i, /\bappreciate\b/i, /\bbedankt\b/i, /\bdank\b/i],
};

const detectIntent = (text: string): Intent => {
  if (isCrisisMessage(text)) return "crisis";
  for (const intent of Object.keys(INTENT_KEYWORDS) as Array<
    Exclude<Intent, "crisis" | "default">
  >) {
    if (INTENT_KEYWORDS[intent].some((re) => re.test(text))) return intent;
  }
  return "default";
};

/* -------------------------------------------------------------------------- */
/* Scripted reply bank                                                         */
/* -------------------------------------------------------------------------- */

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const namePrefix = (ctx: BondContext): string =>
  ctx.firstName ? `${ctx.firstName}, ` : "";

/**
 * The scripted brain. Warm, brief, CBT-flavoured, non-clinical. No diagnosis,
 * no treatment claims — supportive coaching that points back to the client's
 * therapist and their plan.
 */
const generateScriptedReply = (
  lastUserText: string,
  context: BondContext,
): BondReply => {
  const intent = detectIntent(lastUserText);
  const name = namePrefix(context);

  switch (intent) {
    case "crisis":
      // Guardrail: do NOT counsel. Surface care + human help immediately.
      return {
        crisis: true,
        text:
          `I'm really glad you told me, and I'm concerned about what you just shared. ` +
          `I'm an AI companion, so I'm not the right support for this on my own — but you deserve to talk to a person right now. ` +
          `Please reach out to one of the lines below, or call 112 if you're in immediate danger. ` +
          `If you can, contacting ${context.therapistName || "your therapist"} today is a good next step too. You are not alone.`,
        suggestions: ["Show me the crisis lines", "I'd like to keep talking"],
      };

    case "anxiety":
      return {
        text: pick([
          `${name}that sounds like a lot to carry. Let's slow it down together. Try this: breathe in for 4, hold for 4, out for 6 — three or four rounds. Notice your feet on the floor as you do it.`,
          `${name}anxiety can make everything feel urgent at once. One grounding step: name 5 things you can see, 4 you can hear, 3 you can touch. It pulls your mind back to right now.`,
          `${name}when worry spikes, your body reacts before your thoughts catch up. A slow exhale tells it you're safe. Want to do a short breathing exercise together?`,
        ]),
        suggestions: [
          "Teach me a breathing exercise",
          "My thoughts are racing",
          "That helped a little",
        ],
      };

    case "lowMood":
      return {
        text: pick([
          `${name}I'm sorry it's been heavy. Hard days are real, and it's okay to feel them. One small, kind thing for yourself in the next hour — a glass of water, stepping outside, a message to someone — can be enough. What feels doable?`,
          `${name}thank you for telling me. Low moods often shrink our world to the couch. A tiny bit of movement, even standing up and stretching, can shift things a notch. No pressure to feel great — just one small step.`,
          `${name}that's a lot, and you're still here talking it through — that counts. What's one thing that usually gives you even a small lift?`,
        ]),
        suggestions: [
          "Suggest a small step",
          "I don't have energy",
          "I want to talk about it",
        ],
      };

    case "homework": {
      const taskNote =
        context.openTaskCount && context.openTaskCount > 0
          ? `You've got ${context.openTaskCount} item${
              context.openTaskCount > 1 ? "s" : ""
            } on your plan right now. `
          : "";
      return {
        text: pick([
          `${name}nice — staying with the plan between sessions is where a lot of the progress happens. ${taskNote}Want to break the next step into something small enough that it feels easy to start?`,
          `${name}${taskNote}the trick with homework from your therapist is to make the first action tiny. What's the very first 2-minute step you could take?`,
          `${name}let's keep it simple. ${taskNote}Pick one task, set a 10-minute timer, and just begin — you can always stop after. Starting is usually the hard part. Which one will it be?`,
        ]),
        suggestions: [
          "Help me get started",
          "Show me my tasks",
          "I keep avoiding it",
        ],
      };
    }

    case "sleep":
      return {
        text: pick([
          `${name}sleep is so much harder when the mind won't quiet. A gentle one: dim screens an hour before bed and try a slow 4-7-8 breath lying down (in 4, hold 7, out 8). If you're awake 20+ minutes, get up and do something calm, then return.`,
          `${name}rough nights are draining. Keeping a steady wake-up time — even after a bad night — helps your body re-find its rhythm. And if worries show up, jot them on paper so your mind knows they're "parked" till morning.`,
          `${name}for restless nights, a wind-down routine signals safety: low light, no scrolling, slow breathing. Want me to walk you through a short body-relaxation to try tonight?`,
        ]),
        suggestions: [
          "Teach me a breathing exercise",
          "My mind won't switch off",
          "Thanks, I'll try that",
        ],
      };

    case "anger":
      return {
        text: pick([
          `${name}anger usually means something mattered to you. It's okay to feel it. Before reacting, try a slow exhale and name what's underneath — hurt, fear, feeling unheard? Naming it takes some of the heat out.`,
          `${name}that frustration sounds valid. A quick reset: step away for two minutes, unclench your jaw and shoulders, breathe out slowly. Then we can look at what you'd like to do next.`,
        ]),
        suggestions: [
          "Help me calm down",
          "What's underneath this?",
          "I feel calmer now",
        ],
      };

    case "gratitude":
      return {
        text: pick([
          `${name}I love hearing that. Savour it for a second — what made today feel good? Noticing the why helps you create more of it.`,
          `${name}that's wonderful. Holding on to the good moments, even briefly, is its own kind of practice. What part stood out most?`,
        ]),
        suggestions: ["Help me hold on to this", "Tell me more"],
      };

    case "thanks":
      return {
        text: pick([
          `${name}anytime — I'm here between your sessions whenever you need a moment. Is there anything else on your mind?`,
          `You're welcome${context.firstName ? `, ${context.firstName}` : ""}. I'm glad it helped. I'm here whenever you want to check in.`,
        ]),
        suggestions: ["I'm feeling anxious", "Help me with my homework", "I had a hard day"],
      };

    default:
      return {
        text: pick([
          `${name}thank you for sharing that with me. I'm listening. Can you tell me a little more about what that's been like for you?`,
          `${name}I hear you. It sounds like there's something on your mind. What feels most important to talk about right now?`,
          `${name}I'm here with you. When you think about that, what comes up most strongly — a feeling, a thought, or a situation?`,
        ]),
        suggestions: [
          "I'm feeling anxious",
          "I had a hard day",
          "Help me with my homework",
          "I can't sleep",
        ],
      };
  }
};

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

/** Simulated "thinking" latency so the typing indicator feels real. */
const simulatedDelay = (): number => 600 + Math.floor(Math.random() * 600); // 600–1200ms

/**
 * Generate Bond's next reply.
 *
 * @param history Full conversation so far (oldest → newest). The scripted
 *                engine only reads the latest user turn, but the full history is
 *                passed so a real model can use it without changing callers.
 * @param context Light personalization (name, therapist, task count).
 *
 * NOTE: scripted/mockup. See "SWAP POINT" at the top of this file.
 */
export const bondRespond = async (
  history: BondMessage[],
  context: BondContext = {},
): Promise<BondReply> => {
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const lastUserText = lastUser?.text ?? "";

  // Artificial latency to mimic a real model round-trip + typing indicator.
  await new Promise((resolve) => setTimeout(resolve, simulatedDelay()));

  return generateScriptedReply(lastUserText, context);
};

/**
 * The opening message Bond shows first. Warm + TRANSPARENT (EU AI Act Art. 50):
 * states it's an AI companion working alongside the therapist's plan, available
 * between sessions, and explicitly NOT a crisis service.
 */
export const buildOpeningMessage = (context: BondContext): string => {
  const hi = context.firstName ? `Hi ${context.firstName}!` : "Hi there!";
  const supervised = context.therapistName
    ? `I work alongside ${context.therapistName} and the plan you build together in sessions.`
    : `I work alongside your therapist and the plan you build together in sessions.`;
  return (
    `${hi} I'm Bond, your AI companion. ${supervised} ` +
    `I'm here between sessions to listen, help you practice what you're working on, and offer small, supportive steps — but I'm an AI, not a therapist, and not a crisis service. ` +
    `If you're ever in danger or thinking about harming yourself, please use the "In crisis? Get help" button above or call 112. ` +
    `So — how are you feeling today?`
  );
};

/** Default suggestion chips shown on an empty conversation. */
export const DEFAULT_SUGGESTIONS: string[] = [
  "I'm feeling anxious",
  "Help me with my homework",
  "I had a hard day",
  "Teach me a breathing exercise",
  "I can't sleep",
];
