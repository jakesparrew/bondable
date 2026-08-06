/**
 * Bond — response engine: real model, with a scripted companion behind it.
 * ---------------------------------------------------------------------------
 * `bondRespond` now calls a real LLM through `/api/coach` (server-side key, see
 * `src/server/coach/handler.ts`) and streams the answer back. The scripted
 * engine in this file is no longer the product — it is the FALLBACK, and it
 * still earns its place: when the key is missing, the provider is down, or the
 * network drops, Bond stays warm and slightly generic instead of showing an
 * error in the middle of someone's sentence.
 *
 * The BondContext this file builds is unchanged and now does double duty: it
 * feeds both the scripted replies and the model's system prompt. It is the
 * whitelist of everything the model may know — see `src/server/coach/types.ts`.
 *
 * ░░░ THE ONE RULE ░░░
 * The crisis check stays client-side and runs BEFORE any network call, so
 * distress is caught even when the model is unreachable, and it can never be
 * softened, delayed or missed by a model that read the room wrong. Memory,
 * context and the model must NEVER be allowed to skip it. See `bondRespond`.
 * ---------------------------------------------------------------------------
 */

import i18n from "@/i18n";
import { streamCoachReply } from "@/services/api/coachClient";

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

/* -------------------------------------------------------------------------- */
/* Context — what Bond remembers                                               */
/* -------------------------------------------------------------------------- */

/** The last check-in, as Bond remembers it. Built from `checkinService`. */
export interface BondCheckinMemory {
  /** 1–5. */
  mood: number;
  /** Theme ids: slaap, energie, stress, contact, piekeren… */
  tags: string[];
  /** Whole days ago (0 = today, 1 = gisteren). */
  daysAgo: number;
}

/** The next session, as Bond remembers it. */
export interface BondSessionMemory {
  /** Whole days until the session (0 = vandaag, 1 = morgen). */
  daysUntil: number;
  /** Provider display name, when known. */
  providerName?: string;
}

export interface BondContext {
  /** Client first name, for light personalization. Optional. */
  firstName?: string;
  /** Connected provider's display name, for the "onder begeleiding" framing. */
  therapistName?: string;
  /** Count of open/pending tasks (huiswerk), for plan-aware nudges. Optional. */
  openTaskCount?: number;
  /** Title of ONE open zorgplan task, so Bond can name it instead of counting. */
  openTaskTitle?: string;
  /** The most recent check-in. */
  lastCheckin?: BondCheckinMemory;
  /** Where the week is heading, from the 7-day trend. */
  checkinDirection?: "softening" | "steady" | "lifting" | "unknown";
  /** True after 3+ quiet days — greeted as a welcome, never as a lapse. */
  returningAfterQuiet?: boolean;
  /** The upcoming session, when there is one. */
  nextSession?: BondSessionMemory;
  /** Human label of the last thing discussed (e.g. "slaap"), when known. */
  lastTopic?: string;
}

export interface BondReply {
  text: string;
  /** Optional follow-up suggestion chips to surface under the reply. */
  suggestions?: string[];
  /** True when the reply is a crisis-guardrail response (surface resources). */
  crisis?: boolean;
}

export interface BondOpening {
  text: string;
  suggestions: string[];
}

/* -------------------------------------------------------------------------- */
/* Crisis guardrail (CRITICAL — keep client-side, keep exactly this strict)     */
/* -------------------------------------------------------------------------- */

/**
 * Distress / self-harm signal patterns. Deliberately broad and matched
 * case-insensitively. Word-boundary-ish patterns avoid the worst false
 * positives (e.g. "skill" should not trip "kill"), but this errs toward
 * surfacing help — that is the safe direction for a mockup AND for production.
 *
 * DO NOT narrow this list, and do not let any context/memory branch run before
 * it. Crisis is never gated, never A/B tested, never personalised away.
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
  | "sessionPrep"
  | "default";

const INTENT_KEYWORDS: Record<Exclude<Intent, "crisis" | "default">, RegExp[]> = {
  sessionPrep: [
    /\bvoorbereid/i,
    /\bvoorbereiding\b/i,
    /\bvolgende\s+(sessie|afspraak|gesprek)\b/i,
    /\bbespreken\b/i,
    /\bprep(are)?\b/i,
    /\bnext\s+session\b/i,
  ],
  anxiety: [
    /\banxi/i,
    /\bpanic/i,
    /\bnervous\b/i,
    /\bworr/i,
    /\bstress/i,
    /\boverwhelm/i,
    /\bon\s+edge\b/i,
    /\bracing\s+thoughts?\b/i,
    /\bangst/i,
    /\bgespannen\b/i,
    /\bgestrest\b/i,
    /\bpaniek/i,
    /\bzenuwachtig\b/i,
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
    /\bverdrietig\b/i,
    /\bsomber\b/i,
    /\bzware?\s+dag\b/i,
    /\bleeg\b/i,
    /\balleen\b/i,
    /\bgeen\s+zin\b/i,
  ],
  homework: [
    /\bhomework\b/i,
    /\btask/i,
    /\bexercise/i,
    /\bplan\b/i,
    /\bassignment/i,
    /\bpractice\b/i,
    /\bworksheet\b/i,
    /\bhuiswerk\b/i,
    /\boefening\b/i,
    /\bzorgplan\b/i,
    /\btaak\b/i,
    /\btaken\b/i,
  ],
  sleep: [
    /\bsleep/i,
    /\binsomnia\b/i,
    /\bcan'?t\s+sleep\b/i,
    /\btired\b/i,
    /\bawake\b/i,
    /\brest(less)?\b/i,
    /\bslapen\b/i,
    /\bslaap\b/i,
    /\bmoe\b/i,
    /\bwakker\b/i,
  ],
  anger: [
    /\bangry\b/i,
    /\bfrustrat/i,
    /\birritat/i,
    /\bfurious\b/i,
    /\bmad\b/i,
    /\bboos\b/i,
    /\bkwaad\b/i,
  ],
  gratitude: [
    /\bgood\s+day\b/i,
    /\bhappy\b/i,
    /\bgrateful\b/i,
    /\bproud\b/i,
    /\bwent\s+well\b/i,
    /\bblij\b/i,
    /\bgoede?\s+dag\b/i,
    /\bfijn\b/i,
    /\btrots\b/i,
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
/* Memory helpers                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Short-term conversation memory. Derived from the history itself rather than
 * held in module state, so it survives remounts and stays honest about what was
 * actually said in THIS thread.
 */
interface BondShortTermMemory {
  /** Texts Bond already used in the last few turns (avoid repeating). */
  spokenRecently: string[];
  /** Intent of the previous user turn, when there was one. */
  previousIntent: Intent | null;
  /** How many user turns have happened so far, including the current one. */
  userTurnCount: number;
}

const MEMORY_WINDOW = 6;

const buildShortTermMemory = (history: BondMessage[]): BondShortTermMemory => {
  const userTurns = history.filter((m) => m.role === "user");
  const priorUserTurn = userTurns[userTurns.length - 2];
  return {
    spokenRecently: history
      .filter((m) => m.role === "bond")
      .slice(-MEMORY_WINDOW)
      .map((m) => m.text),
    previousIntent: priorUserTurn ? detectIntent(priorUserTurn.text) : null,
    userTurnCount: userTurns.length,
  };
};

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/**
 * Pick a line Bond has not just used. Substring rather than equality, because a
 * reply is composed (revisit prefix + body) — an exact-match check would happily
 * repeat the same opener two turns running while the body varied.
 *
 * Falls back to the full set when every variant is spent: repeating after six
 * turns is better than going silent.
 */
const pickFresh = (options: string[], memory: BondShortTermMemory): string => {
  const fresh = options.filter(
    (option) => !memory.spokenRecently.some((spoken) => spoken.includes(option)),
  );
  return pick(fresh.length > 0 ? fresh : options);
};

const namePrefix = (ctx: BondContext): string =>
  ctx.firstName ? `${ctx.firstName}, ` : "";

/** "vandaag" / "gisteren" / "eergisteren" / "vier dagen geleden". */
const whenLabel = (daysAgo: number): string => {
  if (daysAgo <= 0) return i18n.t("bond_when_today", "vandaag");
  if (daysAgo === 1) return i18n.t("bond_when_yesterday", "gisteren");
  if (daysAgo === 2) return i18n.t("bond_when_day_before", "eergisteren");
  return i18n.t("bond_when_days_ago", "{{count}} dagen geleden", { count: daysAgo });
};

/** "vandaag" / "morgen" / "over 3 dagen". */
const untilLabel = (daysUntil: number): string => {
  if (daysUntil <= 0) return i18n.t("bond_until_today", "vandaag");
  if (daysUntil === 1) return i18n.t("bond_until_tomorrow", "morgen");
  return i18n.t("bond_until_days", "over {{count}} dagen", { count: daysUntil });
};

/** Sentence-case a fragment that starts a sentence ("gisteren" → "Gisteren"). */
const sentenceCase = (value: string): string =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

/** Plain-language theme labels, so Bond names a tag the way the client chose it. */
const TAG_LABELS: Record<string, [string, string]> = {
  slaap: ["bond_tag_slaap", "slaap"],
  energie: ["bond_tag_energie", "energie"],
  stress: ["bond_tag_stress", "stress"],
  contact: ["bond_tag_contact", "contact"],
  piekeren: ["bond_tag_piekeren", "piekeren"],
  lichaam: ["bond_tag_lichaam", "je lichaam"],
  "werk-school": ["bond_tag_werk", "werk of school"],
  rust: ["bond_tag_rust", "rust"],
};

const tagLabel = (tag: string): string => {
  const entry = TAG_LABELS[tag];
  return entry ? i18n.t(entry[0], entry[1]) : tag;
};

/**
 * The continuity line — the single most important sentence in this file. It is
 * what makes a scripted companion feel like it was there yesterday.
 * Returns an empty string when there is genuinely nothing to remember.
 */
const buildContinuityLine = (ctx: BondContext): string =>
  sentenceCase(buildContinuityBody(ctx));

const buildContinuityBody = (ctx: BondContext): string => {
  const check = ctx.lastCheckin;

  if (ctx.returningAfterQuiet) {
    return i18n.t(
      "bond_continuity_return",
      "Fijn dat je er weer bent. Er is niets in te halen, we pikken gewoon op waar je nu zit.",
    );
  }

  if (check) {
    const when = whenLabel(check.daysAgo);
    const theme = check.tags[0] ? tagLabel(check.tags[0]) : null;

    if (check.mood <= 2) {
      return theme
        ? i18n.t(
            "bond_continuity_low_tag",
            "{{when}} zat je op {{mood}} op 5, met {{theme}} erbij. Hoe voelt vandaag?",
            { when, mood: check.mood, theme },
          )
        : i18n.t("bond_continuity_low", "{{when}} zat je op {{mood}} op 5. Hoe voelt vandaag?", {
            when,
            mood: check.mood,
          });
    }

    if (check.mood >= 4) {
      return i18n.t(
        "bond_continuity_bright",
        "{{when}} stond je op {{mood}} op 5. Ik ben benieuwd hoe vandaag aanvoelt.",
        { when, mood: check.mood },
      );
    }

    return theme
      ? i18n.t(
          "bond_continuity_steady_tag",
          "{{when}} noteerde je {{mood}} op 5, met {{theme}} als thema. Hoe zit je er vandaag in?",
          { when, mood: check.mood, theme },
        )
      : i18n.t(
          "bond_continuity_steady",
          "{{when}} noteerde je {{mood}} op 5. Hoe zit je er vandaag in?",
          { when, mood: check.mood },
        );
  }

  if (ctx.lastTopic) {
    return i18n.t(
      "bond_continuity_topic",
      "Vorige keer ging het over {{topic}}. Wil je daar verder op, of zit er iets anders?",
      { topic: ctx.lastTopic },
    );
  }

  return i18n.t("bond_continuity_none", "Hoe voelt vandaag voor je.");
};

/** The session line, when one is close enough to matter. */
const buildSessionLine = (ctx: BondContext): string => {
  const session = ctx.nextSession;
  if (!session || session.daysUntil > 3) return "";
  const provider = session.providerName || i18n.t("bond_your_provider", "je begeleider");
  return i18n.t(
    "bond_session_line",
    "Je ziet {{provider}} {{when}}. Wil je dit samen voorbereiden?",
    { provider, when: untilLabel(session.daysUntil) },
  );
};

/* -------------------------------------------------------------------------- */
/* Scripted reply bank                                                         */
/* -------------------------------------------------------------------------- */

/** Suggestion chips, tuned to what Bond actually knows right now. */
export const buildSuggestions = (ctx: BondContext): string[] => {
  const chips: string[] = [];

  if (ctx.nextSession && ctx.nextSession.daysUntil <= 3) {
    chips.push(i18n.t("bond_chip_prep", "Help me de sessie voorbereiden"));
  }
  if (ctx.lastCheckin && ctx.lastCheckin.tags.includes("slaap")) {
    chips.push(i18n.t("bond_chip_sleep", "Ik slaap slecht"));
  }
  if (ctx.lastCheckin && ctx.lastCheckin.tags.includes("piekeren")) {
    chips.push(i18n.t("bond_chip_ruminate", "Ik blijf piekeren"));
  }
  if (ctx.openTaskTitle) {
    chips.push(i18n.t("bond_chip_task_named", "Hoe begin ik aan {{task}}", {
      task: ctx.openTaskTitle,
    }));
  } else if (ctx.openTaskCount && ctx.openTaskCount > 0) {
    chips.push(i18n.t("bond_chip_task", "Help me met mijn zorgplan"));
  }

  chips.push(i18n.t("bond_chip_heavy", "Ik had een zware dag"));
  chips.push(i18n.t("bond_chip_breathing", "Leer me een ademoefening"));

  // De-duplicate and keep the chip row calm (max four).
  return [...new Set(chips)].slice(0, 4);
};

/**
 * The scripted brain. Warm, brief, non-clinical, Flemish je/jij. No diagnosis,
 * no treatment claims — supportive coaching that points back to the client's
 * provider and their zorgplan.
 */
const generateScriptedReply = (
  lastUserText: string,
  context: BondContext,
  memory: BondShortTermMemory,
): BondReply => {
  const intent = detectIntent(lastUserText);
  const name = namePrefix(context);
  const suggestions = buildSuggestions(context);

  /* --- CRISIS: first, unconditional, never touched by memory or context. --- */
  if (intent === "crisis") {
    return {
      crisis: true,
      text: i18n.t(
        "bond_crisis_reply",
        "Bel nu 1813. Ben je in direct gevaar, bel 112. Ik ben een AI en niet de juiste hulp hiervoor. Blijf niet alleen.",
      ),
      suggestions: [
        i18n.t("bond_show_crisis", "Toon me de hulplijnen"),
        i18n.t("bond_keep_talking", "Ik wil blijven praten"),
      ],
    };
  }

  /**
   * Continuity acknowledgement: when the client stays on the same theme two
   * turns in a row, say so instead of restarting the same advice. This is the
   * whole trick — Bond sounds present because it noticed.
   */
  const revisiting = memory.previousIntent === intent && memory.userTurnCount > 1;
  const revisitPrefix = revisiting
    ? pickFresh(
        [
          i18n.t("bond_revisit_a", "Je blijft hierbij, dus laten we het serieus nemen. "),
          i18n.t("bond_revisit_b", "Dit komt terug vandaag. Dat zegt iets. "),
          i18n.t("bond_revisit_c", "We zitten hier nog. Prima, dan gaan we een laag dieper. "),
        ],
        memory,
      )
    : "";

  switch (intent) {
    case "sessionPrep": {
      const provider =
        context.nextSession?.providerName ||
        context.therapistName ||
        i18n.t("bond_your_provider", "je begeleider");
      const when = context.nextSession
        ? untilLabel(context.nextSession.daysUntil)
        : i18n.t("bond_until_soon", "binnenkort");
      const theme = context.lastCheckin?.tags[0]
        ? tagLabel(context.lastCheckin.tags[0])
        : null;
      return {
        text:
          revisitPrefix +
          pickFresh(
            [
              i18n.t(
                "bond_prep_a",
                "{{name}}je ziet {{provider}} {{when}}. Zet één ding op papier dat je zeker wil zeggen, dan hoef je het daar niet meer te zoeken.{{themeLine}}",
                {
                  name,
                  provider,
                  when,
                  themeLine: theme
                    ? i18n.t("bond_prep_theme", " Je check-ins wezen deze week vaak naar {{theme}}.", {
                        theme,
                      })
                    : "",
                },
              ),
              i18n.t(
                "bond_prep_b",
                "{{name}}goed idee om dit voor te bereiden. Wat zou je het meest spijten als het {{when}} niet ter sprake komt?",
                { name, when },
              ),
            ],
            memory,
          ),
        suggestions: [
          i18n.t("bond_chip_write_prep", "Schrijf mijn voorbereiding op"),
          i18n.t("bond_chip_dunno", "Ik weet niet waar te beginnen"),
        ],
      };
    }

    case "anxiety":
      return {
        text:
          revisitPrefix +
          pickFresh(
            [
              i18n.t(
                "bond_anxiety_a",
                "{{name}}dat klinkt als veel tegelijk. Laten we het trager maken. Adem vier tellen in, houd vier vast, adem zes tellen uit, drie of vier rondes. Voel intussen je voeten op de grond.",
                { name },
              ),
              i18n.t(
                "bond_anxiety_b",
                "{{name}}spanning maakt alles tegelijk dringend. Eén ankerpunt, noem vijf dingen die je ziet, vier die je hoort, drie die je voelt. Dat haalt je terug naar nu.",
                { name },
              ),
              i18n.t(
                "bond_anxiety_c",
                "{{name}}je lichaam reageert voordat je gedachten volgen. Een trage uitademing vertelt het dat je veilig bent. Zullen we samen een korte ademoefening doen?",
                { name },
              ),
            ],
            memory,
          ),
        suggestions: [
          i18n.t("bond_chip_breathing", "Leer me een ademoefening"),
          i18n.t("bond_chip_racing", "Mijn hoofd raast"),
          i18n.t("bond_chip_helped", "Dat hielp een beetje"),
        ],
      };

    case "lowMood": {
      const echo = context.lastCheckin
        ? i18n.t("bond_low_echo", " Je check-in van {{when}} wees dezelfde kant op.", {
            when: whenLabel(context.lastCheckin.daysAgo),
          })
        : "";
      return {
        text:
          revisitPrefix +
          pickFresh(
            [
              i18n.t(
                "bond_low_a",
                "{{name}}wat vervelend dat het zwaar zit.{{echo}} Zware dagen zijn echt en je mag ze voelen. Eén klein, vriendelijk ding voor jezelf in het komende uur is genoeg. Wat lijkt haalbaar?",
                { name, echo },
              ),
              i18n.t(
                "bond_low_b",
                "{{name}}dank je dat je het zegt.{{echo}} Een sombere dag maakt je wereld klein. Even rechtstaan en strekken verzet al iets. Geen druk om je goed te voelen, alleen één stap.",
                { name, echo },
              ),
              i18n.t(
                "bond_low_c",
                "{{name}}dat is veel, en je praat er wel over. Dat telt. Wat geeft je normaal gezien zelfs een klein beetje lucht?",
                { name },
              ),
            ],
            memory,
          ),
        suggestions: [
          i18n.t("bond_chip_small_step", "Stel een kleine stap voor"),
          i18n.t("bond_chip_no_energy", "Ik heb geen energie"),
          i18n.t("bond_chip_talk", "Ik wil erover praten"),
        ],
      };
    }

    case "homework": {
      // Naming the actual task beats counting them — that is what memory buys.
      const taskNote = context.openTaskTitle
        ? i18n.t("bond_task_named", "Op je zorgplan staat nu {{task}}. ", {
            task: context.openTaskTitle,
          })
        : context.openTaskCount && context.openTaskCount > 0
          ? i18n.t("bond_task_count", "Er staan {{count}} dingen open op je zorgplan. ", {
              count: context.openTaskCount,
            })
          : "";
      return {
        text:
          revisitPrefix +
          pickFresh(
            [
              i18n.t(
                "bond_hw_a",
                "{{name}}mooi dat je ermee bezig bent. Tussen de sessies gebeurt veel van de vooruitgang. {{taskNote}}Zullen we de eerste stap zo klein maken dat beginnen vanzelf gaat?",
                { name, taskNote },
              ),
              i18n.t(
                "bond_hw_b",
                "{{name}}{{taskNote}}De truc is de eerste handeling piepklein maken. Wat is de eerste stap van twee minuten?",
                { name, taskNote },
              ),
              i18n.t(
                "bond_hw_c",
                "{{name}}houden we het simpel. {{taskNote}}Kies één ding, zet tien minuten op je klok en begin. Stoppen mag daarna. Waarmee start je?",
                { name, taskNote },
              ),
            ],
            memory,
          ),
        suggestions: [
          i18n.t("bond_chip_start", "Help me starten"),
          i18n.t("bond_chip_show_plan", "Toon mijn zorgplan"),
          i18n.t("bond_chip_avoid", "Ik blijf het uitstellen"),
        ],
      };
    }

    case "sleep": {
      const echo = context.lastCheckin?.tags.includes("slaap")
        ? i18n.t("bond_sleep_echo", " Slaap kwam ook terug in je check-ins deze week.")
        : "";
      return {
        text:
          revisitPrefix +
          pickFresh(
            [
              i18n.t(
                "bond_sleep_a",
                "{{name}}slapen lukt moeilijk als je hoofd niet stil valt.{{echo}} Dim je schermen een uur voor bed en probeer liggend de 4-7-8 ademhaling. Lig je twintig minuten wakker, sta dan even op en kom terug.",
                { name, echo },
              ),
              i18n.t(
                "bond_sleep_b",
                "{{name}}slechte nachten putten uit.{{echo}} Een vast uur van opstaan, ook na een rotnacht, helpt je lichaam het ritme terugvinden. Zorgen die opkomen, schrijf je kort op, dan zijn ze geparkeerd tot morgen.",
                { name, echo },
              ),
              i18n.t(
                "bond_sleep_c",
                "{{name}}een afbouwroutine geeft je lijf het signaal dat het veilig is. Gedempt licht, geen scherm, traag ademen. Zal ik je door een korte lichaamsontspanning leiden voor vanavond?",
                { name },
              ),
            ],
            memory,
          ),
        suggestions: [
          i18n.t("bond_chip_breathing", "Leer me een ademoefening"),
          i18n.t("bond_chip_mind_on", "Mijn hoofd gaat niet uit"),
          i18n.t("bond_chip_try", "Dank je, ik probeer het"),
        ],
      };
    }

    case "anger":
      return {
        text:
          revisitPrefix +
          pickFresh(
            [
              i18n.t(
                "bond_anger_a",
                "{{name}}boosheid betekent meestal dat er iets voor je op het spel stond. Je mag dat voelen. Adem eerst traag uit en benoem wat eronder zit, gekwetst zijn, angst, niet gehoord worden. Benoemen haalt er hitte af.",
                { name },
              ),
              i18n.t(
                "bond_anger_b",
                "{{name}}die frustratie klinkt terecht. Een snelle reset, stap twee minuten weg, ontspan je kaak en je schouders, adem traag uit. Daarna kijken we wat je wil doen.",
                { name },
              ),
            ],
            memory,
          ),
        suggestions: [
          i18n.t("bond_chip_calm", "Help me kalmeren"),
          i18n.t("bond_chip_beneath", "Wat zit hieronder"),
          i18n.t("bond_chip_calmer", "Ik voel me rustiger"),
        ],
      };

    case "gratitude": {
      const lift =
        context.checkinDirection === "lifting"
          ? i18n.t("bond_grat_lift", " Je week loopt ook zachtjes omhoog.")
          : "";
      return {
        text:
          revisitPrefix +
          pickFresh(
            [
              i18n.t(
                "bond_grat_a",
                "{{name}}dat hoor ik graag.{{lift}} Sta er even bij stil, wat maakte vandaag goed? Het waarom zien helpt je er meer van maken.",
                { name, lift },
              ),
              i18n.t(
                "bond_grat_b",
                "{{name}}dat is fijn nieuws.{{lift}} Goede momenten even vasthouden is op zich al een oefening. Welk stuk viel je het meest op?",
                { name, lift },
              ),
            ],
            memory,
          ),
        suggestions: [
          i18n.t("bond_chip_hold", "Help me dit vasthouden"),
          i18n.t("bond_chip_more", "Vertel me meer"),
        ],
      };
    }

    case "thanks":
      return {
        text: pickFresh(
          [
            i18n.t(
              "bond_thanks_a",
              "{{name}}graag gedaan. Ik ben er tussen je sessies wanneer je even wil landen. Zit er nog iets?",
              { name },
            ),
            i18n.t(
              "bond_thanks_b",
              "Graag gedaan{{comma}}. Fijn dat het hielp. Ik ben er wanneer je wil inchecken.",
              { comma: context.firstName ? `, ${context.firstName}` : "" },
            ),
          ],
          memory,
        ),
        suggestions,
      };

    default:
      return {
        text:
          revisitPrefix +
          pickFresh(
            [
              i18n.t(
                "bond_default_a",
                "{{name}}dank je dat je dat deelt. Ik luister. Kun je iets meer vertellen over hoe dat voor jou is?",
                { name },
              ),
              i18n.t(
                "bond_default_b",
                "{{name}}ik hoor je. Er zit duidelijk iets. Wat voelt het belangrijkst om nu te bespreken?",
                { name },
              ),
              i18n.t(
                "bond_default_c",
                "{{name}}ik ben er. Wat komt het sterkst op als je hieraan denkt, een gevoel, een gedachte of een situatie?",
                { name },
              ),
            ],
            memory,
          ),
        suggestions,
      };
  }
};

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

/** Simulated "thinking" latency so the typing indicator feels real. */
const simulatedDelay = (): number => 600 + Math.floor(Math.random() * 600); // 600–1200ms

export interface BondRespondOptions {
  /** Streams model text as it arrives. Never called on the scripted path. */
  onDelta?: (delta: string) => void;
  signal?: AbortSignal;
}

/**
 * Generate Bond's next reply.
 *
 * @param history Full conversation so far (oldest → newest). Used both for the
 *                latest user turn AND for short-term memory (what Bond already
 *                said, what the previous turn was about).
 * @param context Continuity context built from real data — see BondContext.
 * @param options Streaming callback + cancellation.
 *
 * Three layers, in this order and never any other:
 *
 *  1. CRISIS — deterministic, client-side, before any network call. Distress is
 *     caught even when the model is unreachable, and it can never be softened,
 *     delayed or missed by a model that read the room wrong. This is the whole
 *     reason the check does not live in the prompt.
 *  2. MODEL — the real Bond, via `/api/coach` (no key in the browser).
 *  3. SCRIPTED — the original companion, unchanged, as the fallback. Bond
 *     staying warm and slightly generic beats Bond showing an error, so a
 *     missing key or a dead provider degrades instead of failing.
 */
export const bondRespond = async (
  history: BondMessage[],
  context: BondContext = {},
  options: BondRespondOptions = {},
): Promise<BondReply> => {
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const lastUserText = lastUser?.text ?? "";
  const memory = buildShortTermMemory(history);

  /* --- 1. Crisis: unconditional, offline, ahead of everything else. --- */
  if (isCrisisMessage(lastUserText)) {
    return generateScriptedReply(lastUserText, context, memory);
  }

  /* --- 2. The real model. --- */
  const result = await streamCoachReply({
    history: history.map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("bond" as const),
      text: m.text,
    })),
    context,
    onDelta: options.onDelta,
    signal: options.signal,
  });

  if (!result.failure) {
    return { text: result.text, suggestions: buildSuggestions(context) };
  }

  /* --- 3. Scripted fallback. --- */
  if (result.failure === "rate_limited") {
    return {
      text: i18n.t(
        "bond_rate_limited",
        "Even te snel achter elkaar. Geef me een momentje, dan pak ik het weer op.",
      ),
      suggestions: buildSuggestions(context),
    };
  }

  // Keep the cosmetic delay ONLY here: without a real round-trip the scripted
  // reply would otherwise land instantly and give the fallback away.
  await new Promise((resolve) => setTimeout(resolve, simulatedDelay()));
  return generateScriptedReply(lastUserText, context, memory);
};

/**
 * Bond's opening turn. Warm + TRANSPARENT (EU AI Act Art. 50): it states it is
 * an AI companion working alongside the provider's plan, available between
 * sessions, and explicitly not a crisis service — and then it PICKS UP WHERE
 * YESTERDAY LEFT OFF instead of greeting a stranger.
 */
export const buildOpening = (context: BondContext): BondOpening => {
  const hi = context.firstName
    ? i18n.t("bond_open_hi_named", "Dag {{name}}.", { name: context.firstName })
    : i18n.t("bond_open_hi", "Dag.");

  const supervised = context.therapistName
    ? i18n.t(
        "bond_open_supervised_named",
        "Ik ben Bond, je AI-gezel. Ik werk naast {{provider}} en het plan dat jullie samen opbouwen.",
        { provider: context.therapistName },
      )
    : i18n.t(
        "bond_open_supervised",
        "Ik ben Bond, je AI-gezel. Ik werk naast je begeleider en het plan dat jullie samen opbouwen.",
      );

  const disclaimer = i18n.t(
    "bond_open_disclaimer",
    "Ik ben een AI, geen therapeut en geen crisisdienst. Ben je in gevaar of denk je aan zelfbeschadiging, gebruik dan de knop hierboven of bel 112.",
  );

  const continuity = buildContinuityLine(context);
  const sessionLine = buildSessionLine(context);

  const text = [hi, supervised, disclaimer, continuity, sessionLine]
    .filter(Boolean)
    .join(" ");

  return { text, suggestions: buildSuggestions(context) };
};

/** Back-compat: the opening as a plain string. */
export const buildOpeningMessage = (context: BondContext): string =>
  buildOpening(context).text;

/** Fallback suggestion chips when there is no context at all. */
export const DEFAULT_SUGGESTIONS: string[] = [
  "Ik voel me gespannen",
  "Help me met mijn zorgplan",
  "Ik had een zware dag",
  "Leer me een ademoefening",
];
