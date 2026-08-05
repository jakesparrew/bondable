import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MessageCircle, ArrowRight, Eye, EyeOff } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { checkinService, useCheckins } from "@/services/api/checkinService";
import { carePlanService } from "@/services/api/carePlanService";

/**
 * CheckinEchoCard — the proof that a check-in changed something.
 *
 * Before this card, a check-in vanished. Now it comes back the next time the
 * client opens their dashboard: Bondable repeats what they said, and offers the
 * ONE next step that fits it.
 *
 *   • a heavy day  → support first. Talk to Bond, message the provider. Nothing
 *                    is asked of the client, and the always-visible crisis button
 *                    in the page header stays exactly where it is.
 *   • a good day   → the zorgplan, by name. Momentum is easier to spend than to store.
 *   • a steady day → a light invitation, no push.
 *   • quiet days   → welcome back, never "je hebt gemist".
 *
 * NO MINT here — this is the general client dashboard, not a Bond surface.
 * Border-first: no shadow at rest, `hover:shadow-raise` lives on the buttons.
 */

const MOOD_WORDS: Record<number, [string, string]> = {
  1: ["checkin_mood_1", "Zwaar"],
  2: ["checkin_mood_2", "Matig"],
  3: ["checkin_mood_3", "Oké"],
  4: ["checkin_mood_4", "Goed"],
  5: ["checkin_mood_5", "Sterk"],
};

const CheckinEchoCard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { insight, today } = useCheckins();

  // One open zorgplan task, named — a card that says "de ademoefening" beats a
  // card that says "je hebt 3 open taken".
  const openTaskTitle = useMemo(() => {
    try {
      const plan = carePlanService.getCarePlan();
      for (const group of plan.goals) {
        const open = group.tasks.find((task) => task.status === "open");
        if (open) return open.title;
      }
    } catch {
      /* the plan is optional context; never break the dashboard over it */
    }
    return null;
  }, []);

  // Demonstrates the consent gate from the client's side: what, if anything,
  // would reach the provider. Content-free by construction.
  const providerSummary = useMemo(() => checkinService.getProviderVisibleSummary(), []);

  const { signal, latest, continuity } = insight;

  const whenLabel = (daysAgo: number | null): string => {
    if (daysAgo == null) return "";
    if (daysAgo <= 0) return t("echo_when_today", "vandaag");
    if (daysAgo === 1) return t("echo_when_yesterday", "gisteren");
    if (daysAgo === 2) return t("echo_when_day_before", "eergisteren");
    return t("echo_when_days", "{{count}} dagen geleden", { count: daysAgo });
  };

  /** The when-label opens the sentence, so it needs a capital. */
  const sentenceCase = (value: string): string =>
    value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

  const moodWord = (mood: number): string => {
    const entry = MOOD_WORDS[mood];
    return entry ? t(entry[0], entry[1]).toLowerCase() : String(mood);
  };

  let title: string;
  let body: string;
  let primaryLabel: string;
  let primaryTo: string;
  let secondary: { label: string; to: string } | null = null;

  if (signal === "low" && latest) {
    title = t("echo_low_title", "{{when}} gaf je {{mood}} op 5 aan", {
      when: sentenceCase(whenLabel(continuity.daysSinceLast)),
      mood: latest.mood,
    });
    body = t(
      "echo_low_body",
      "Een zware dag vraagt niets van je behalve doorkomen. Je hoeft er niets mee te doen, maar praten kan wel helpen.",
    );
    primaryLabel = t("echo_low_cta", "Praat met Bond");
    primaryTo = "/dashboard/client/bond";
    secondary = {
      label: t("echo_low_secondary", "Bericht je begeleider"),
      to: "/dashboard/client/messages",
    };
  } else if (signal === "bright" && latest) {
    title = t("echo_bright_title", "{{when}} stond je op {{mood}} op 5", {
      when: sentenceCase(whenLabel(continuity.daysSinceLast)),
      mood: latest.mood,
    });
    body = openTaskTitle
      ? t(
          "echo_bright_body_task",
          "Een goede dag is een goed moment voor een kleine stap. Op je zorgplan staat nog {{task}}.",
          { task: openTaskTitle },
        )
      : t(
          "echo_bright_body",
          "Een goede dag is een goed moment voor een kleine stap uit je zorgplan.",
        );
    primaryLabel = t("echo_bright_cta", "Naar je zorgplan");
    primaryTo = "/dashboard/client/care-plan";
    secondary = { label: t("echo_bright_secondary", "Praat met Bond"), to: "/dashboard/client/bond" };
  } else if (signal === "steady" && latest) {
    title = t("echo_steady_title", "{{when}} noteerde je {{word}}", {
      when: sentenceCase(whenLabel(continuity.daysSinceLast)),
      word: moodWord(latest.mood),
    });
    body = openTaskTitle
      ? t("echo_steady_body_task", "Als je zin hebt in één kleine stap, staat {{task}} klaar.", {
          task: openTaskTitle,
        })
      : t("echo_steady_body", "Als je wil, kunnen we even kijken hoe vandaag zit.");
    primaryLabel = t("echo_steady_cta", "Even inchecken");
    primaryTo = "/dashboard/client/bond";
    secondary = openTaskTitle
      ? { label: t("echo_bright_cta", "Naar je zorgplan"), to: "/dashboard/client/care-plan" }
      : null;
  } else {
    title = continuity.lastCheckinAt
      ? t("echo_quiet_title", "Je hebt al even niet ingecheckt")
      : t("echo_first_title", "Nog geen check-in");
    body = t(
      "echo_quiet_body",
      "Er is niets in te halen en niets te herstellen. We pikken gewoon op waar je nu zit.",
    );
    primaryLabel = t("echo_quiet_cta", "Even inchecken");
    primaryTo = "/dashboard/client/bond";
  }

  const alreadyToday = Boolean(today);

  return (
    <Card className="rounded-card border-border bg-card p-5">
      <p className="text-label uppercase tracking-wide text-muted-foreground">
        {t("echo_eyebrow", "Je laatste check-in")}
      </p>

      <h2 className="mt-1.5 text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{body}</p>

      {alreadyToday && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t("echo_today_done", "Je checkte vandaag al in. Nog eens mag altijd.")}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={() => navigate(primaryTo)}
          className="h-auto gap-1.5 rounded-ctl px-3.5 py-2 text-xs font-medium"
        >
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {primaryLabel}
        </Button>
        {secondary && (
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(secondary.to)}
            className="h-auto gap-1.5 rounded-ctl px-3.5 py-2 text-xs font-medium"
          >
            {secondary.label}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* What leaves this screen — stated plainly, from the client's side. */}
      <p className="mt-4 flex items-start gap-1.5 border-t border-border pt-3 text-[11px] leading-snug text-muted-foreground">
        {providerSummary.consentGranted ? (
          <Eye className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        ) : (
          <EyeOff className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        )}
        {providerSummary.consentGranted
          ? t(
              "echo_consent_on",
              "Je begeleider ziet een samenvatting van je week, nooit wat je schreef. Aanpasbaar in je toestemmingen.",
            )
          : t(
              "echo_consent_off",
              "Je check-ins blijven van jou. Je begeleider ziet hier niets van, tenzij je dat aanzet.",
            )}
      </p>
    </Card>
  );
};

export default CheckinEchoCard;
