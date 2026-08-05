/**
 * upgradeCopy.ts — canonical NL/EN copy for the top upgrade moments
 * (master-plan §3.3). Every string states NO LOSS ("je huidige plan blijft gewoon
 * werken") and follows the Flemish warm-professional register: je/jij, zero
 * exclamation marks, no urgency, no guilt, no fake scarcity.
 *
 * Copy lives here as data (not scattered in JSX) so it can be reviewed in one
 * place and reused by UpgradeMoment / NudgeStrip. Surfaces pass these strings
 * through `t(key, nlDefault)` inline so translators can override without editing
 * locale JSON now.
 *
 * `{{count}}` placeholders are interpolated LIVE by the caller — numbers are
 * never hardcoded in product (§3.3 note).
 */

/** A single localized upgrade message. */
export interface UpgradeCopy {
  /** Stable nudge/trigger id (matches nudgeService dedupe keys + analytics). */
  id: string;
  /** i18n key prefix; caller uses `${key}.title` / `.body`. */
  key: string;
  nl: { title: string; body: string };
  en: { title: string; body: string };
  /** The tier this moment sells toward (drives ProBadge + CTA copy). */
  targetTier: 'pro' | 'practice';
}

export const UPGRADE_COPY = {
  client_cap_reached: {
    id: 'client_cap_reached',
    key: 'monetization.moment.client_cap_reached',
    targetTier: 'pro',
    nl: {
      title: 'Je praktijk groeit',
      body: 'Je hebt nu 15 actieve cliënten, het maximum in het gratis plan. Met Pro werk je zonder limiet, in dezelfde rustige werkruimte. Je huidige plan blijft gewoon werken.',
    },
    en: {
      title: 'Your practice is growing',
      body: "You've reached 3 active clients, the free plan's limit. Pro removes the cap, in the same calm workspace. Your current plan keeps working as is.",
    },
  },
  locked_template_clicked: {
    id: 'locked_template_clicked',
    key: 'monetization.moment.locked_template_clicked',
    targetTier: 'pro',
    nl: {
      title: 'Meer intakeformulieren',
      body: 'Meerdere intakeformulieren horen bij Pro. Je huidige formulier blijft gewoon werken.',
    },
    en: {
      title: 'More intake templates',
      body: 'Multiple intake templates are part of Pro. Your current form keeps working as is.',
    },
  },
  outcomes_teaser_viewed: {
    id: 'outcomes_teaser_viewed',
    key: 'monetization.moment.outcomes_teaser_viewed',
    targetTier: 'pro',
    nl: {
      title: 'Verloop per cliënt, per week',
      body: 'Dit overzicht is gebaseerd op jouw echte sessies en taken. Pro maakt de details zichtbaar, per cliënt en per week. Je huidige plan blijft gewoon werken.',
    },
    en: {
      title: 'Progress per client, per week',
      body: 'This overview is built from your real sessions and tasks. Pro reveals the detail, per client and per week. Your current plan keeps working as is.',
    },
  },
  bond_flag_no_console: {
    id: 'bond_flag_no_console',
    key: 'monetization.moment.bond_flag_no_console',
    targetTier: 'pro',
    nl: {
      title: 'Bundel je Bond-signalen',
      body: 'Bond markeerde deze week {{count}} gesprekken voor jouw overzicht. De supervisieconsole in Pro bundelt ze in één wachtrij, met context. Je huidige plan blijft gewoon werken.',
    },
    en: {
      title: 'Gather your Bond signals',
      body: "Bond flagged {{count}} conversations for your review this week. Pro's supervision console gathers them in one queue, with context. Your current plan keeps working as is.",
    },
  },
  lead_sla_missed: {
    id: 'lead_sla_missed',
    key: 'monetization.moment.lead_sla_missed',
    targetTier: 'pro',
    nl: {
      title: 'Meldingen bij nieuwe aanvragen',
      body: 'Een aanvraag via Vind een begeleider wacht al {{count}} dagen. Pro stuurt je een melding bij elke nieuwe aanvraag. Reageren is en blijft gratis.',
    },
    en: {
      title: 'Alerts for new requests',
      body: 'A finder request has been waiting {{count}} days. Pro notifies you the moment a request arrives. Responding is and stays free.',
    },
  },
  recurring_session_attempted: {
    id: 'recurring_session_attempted',
    key: 'monetization.moment.recurring_session_attempted',
    targetTier: 'pro',
    nl: {
      title: 'Terugkerende sessies',
      body: 'Wekelijks terugkerende sessies inplannen hoort bij Pro, één keer instellen en klaar. Je huidige plan blijft gewoon werken.',
    },
    en: {
      title: 'Recurring sessions',
      body: 'Recurring weekly sessions are a Pro feature, set once and done. Your current plan keeps working as is.',
    },
  },
  invoice_needed: {
    id: 'invoice_needed',
    key: 'monetization.moment.invoice_needed',
    targetTier: 'pro',
    nl: {
      title: 'Facturen in twee klikken',
      body: 'Je rondde deze maand {{count}} sessies af. Met Pro maak je daar in twee klikken facturen van. Je huidige plan blijft gewoon werken.',
    },
    en: {
      title: 'Invoices in two clicks',
      body: 'You completed {{count}} sessions this month. Pro turns those into invoices in two clicks. Your current plan keeps working as is.',
    },
  },
  second_staff_invited: {
    id: 'second_staff_invited',
    key: 'monetization.moment.second_staff_invited',
    targetTier: 'practice',
    nl: {
      title: 'Twee begeleiders, één praktijk',
      body: 'Het Practice-plan geeft jullie gedeelde sjablonen, rollen en een teamoverzicht, €29 per zetel per maand (jaarlijks). Je huidige plan blijft gewoon werken.',
    },
    en: {
      title: 'Two providers, one practice',
      body: 'The Practice plan adds shared templates, roles and a team overview, €29 per seat per month (annual). Your current plan keeps working as is.',
    },
  },
} as const;

export type UpgradeMomentId = keyof typeof UPGRADE_COPY;

/** Interpolate `{{count}}` (and any other `{{key}}`) placeholders in a copy line. */
export function interpolate(
  text: string,
  vars: Record<string, string | number> = {},
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_m, k: string) =>
    k in vars ? String(vars[k]) : `{{${k}}}`,
  );
}
