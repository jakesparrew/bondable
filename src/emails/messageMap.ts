/**
 * messageMap — the canonical registry of every Bondable lifecycle email.
 *
 * Authored per docs/plan/06-onboarding-activation.md (T-OA-9). These are typed
 * MOCK definitions: subjects + a 2-3 sentence body summary in NL and EN, plus
 * trigger / audience / category metadata. Nothing here is wired to Resend yet —
 * sending is Phase 4 (T-OA-13/14/15). The dev preview at /dev/emails renders
 * each entry via renderEmail.tsx for copy + sequencing review.
 *
 * Compliance rails baked into the copy (see plan §Part 3):
 *   - client emails carry ZERO health content — neutral prompts + login link only
 *   - drips (activation/digest/trial/winback) carry a one-click unsubscribe
 *   - transactional mail never carries an unsubscribe (it is care-relevant)
 *   - concrete Flemish example data (Thomas Claes, An Peeters, praktijk De Brug)
 *
 * NL is the reference language; EN mirrors it. No exclamation marks, warm je/jij.
 */

/** Who receives this message. Drives compliance framing and preview grouping. */
export type EmailAudience = 'client' | 'provider' | 'manager' | 'staff' | 'admin';

/**
 * Delivery category. `transactional` is care-relevant and never unsubscribable;
 * everything else is a drip/lifecycle send that carries an unsubscribe footer.
 */
export type EmailCategory =
  | 'transactional'
  | 'activation'
  | 'digest'
  | 'trial'
  | 'winback';

export interface EmailBodyCopy {
  /** 2-3 sentence plain-language summary; renderEmail expands it into 1-2 paras. */
  summary: string;
  /** Label for the single CTA button placeholder. */
  cta: string;
}

export interface EmailMessage {
  /** Stable id from the plan (E-01 … E-35). */
  id: string;
  /** Human trigger description — what fires this send. */
  trigger: string;
  audience: EmailAudience;
  category: EmailCategory;
  /** For drips: the day offset in the sequence (D0/D2/…). Omitted for one-offs. */
  dripDay?: number;
  nl: { subject: string } & EmailBodyCopy;
  en: { subject: string } & EmailBodyCopy;
}

/** True for any category that must carry a one-click unsubscribe footer. */
export function isUnsubscribable(category: EmailCategory): boolean {
  return category !== 'transactional';
}

export const EMAIL_CATEGORY_LABELS: Record<EmailCategory, { nl: string; en: string }> = {
  transactional: { nl: 'Transactioneel', en: 'Transactional' },
  activation: { nl: 'Activatie-drip', en: 'Activation drip' },
  digest: { nl: 'Overzicht', en: 'Digest' },
  trial: { nl: 'Proefperiode', en: 'Trial' },
  winback: { nl: 'Heractivatie', en: 'Win-back' },
};

/** Stable display order for the preview page. */
export const EMAIL_CATEGORY_ORDER: EmailCategory[] = [
  'transactional',
  'activation',
  'digest',
  'trial',
  'winback',
];

export const EMAIL_AUDIENCE_LABELS: Record<EmailAudience, { nl: string; en: string }> = {
  client: { nl: 'Cliënt', en: 'Client' },
  provider: { nl: 'Hulpverlener', en: 'Provider' },
  manager: { nl: 'Praktijkbeheerder', en: 'Practice manager' },
  staff: { nl: 'Teamlid', en: 'Staff member' },
  admin: { nl: 'Beheerder', en: 'Admin' },
};

export const EMAIL_MESSAGES: EmailMessage[] = [
  // ── Transactional ──────────────────────────────────────────────────────────
  {
    id: 'E-01',
    trigger: 'Provider invites a client',
    audience: 'client',
    category: 'transactional',
    nl: {
      subject: 'Thomas Claes nodigt je uit op Bondable',
      summary:
        'Thomas Claes gebruikt Bondable om jullie traject samen op te volgen. Maak je account in twee minuten aan — jij bepaalt zelf wat je deelt.',
      cta: 'Account aanmaken',
    },
    en: {
      subject: 'Thomas Claes invited you to Bondable',
      summary:
        'Thomas Claes uses Bondable to support your work together. Set up your account in two minutes — you decide what you share.',
      cta: 'Create account',
    },
  },
  {
    id: 'E-02',
    trigger: 'Manager invites a staff member',
    audience: 'staff',
    category: 'transactional',
    nl: {
      subject: 'An Peeters voegt je toe aan praktijk De Brug',
      summary:
        'Je collega’s plannen en volgen hun cliënten op via Bondable. Aanvaard de uitnodiging om je agenda en profiel in te stellen. Je beheert alles zelf.',
      cta: 'Uitnodiging aanvaarden',
    },
    en: {
      subject: 'An Peeters is adding you to praktijk De Brug',
      summary:
        'Your colleagues schedule and follow up their clients in Bondable. Accept the invitation to set up your calendar and profile. You manage everything yourself.',
      cta: 'Accept invitation',
    },
  },
  {
    id: 'E-03',
    trigger: 'Practice created (manager welcome)',
    audience: 'manager',
    category: 'transactional',
    nl: {
      subject: 'Praktijk De Brug staat klaar',
      summary:
        'Je praktijk is aangemaakt op Bondable. De volgende stap is je team uitnodigen — elk teamlid beheert zijn eigen agenda en profiel. Zo staat iedereen samen op één plek.',
      cta: 'Team uitnodigen',
    },
    en: {
      subject: 'Praktijk De Brug is ready',
      summary:
        'Your practice is set up on Bondable. The next step is inviting your team — each member manages their own calendar and profile. That way everyone works from one place.',
      cta: 'Invite your team',
    },
  },
  {
    id: 'E-04',
    trigger: 'Password setup / reset requested',
    audience: 'client',
    category: 'transactional',
    nl: {
      subject: 'Stel je wachtwoord in',
      summary:
        'Klik binnen 24 uur op de link om je wachtwoord te kiezen. Vroeg je dit niet aan? Dan mag je deze mail rustig negeren.',
      cta: 'Wachtwoord instellen',
    },
    en: {
      subject: 'Set your password',
      summary:
        'Use the link within 24 hours to choose your password. If you did not request this, you can safely ignore this email.',
      cta: 'Set password',
    },
  },
  {
    id: 'E-05',
    trigger: 'Session reminder, 24h before (both parties)',
    audience: 'client',
    category: 'transactional',
    nl: {
      subject: 'Morgen om 14u: sessie met Thomas',
      summary:
        'Je sessie vindt morgen plaats. Lukt het niet? Verzet ze ten laatste vandaag via de app. We houden geen inhoud bij in deze herinnering.',
      cta: 'Bekijk in de app',
    },
    en: {
      subject: 'Tomorrow at 2pm: session with Thomas',
      summary:
        'Your session takes place tomorrow. Can you not make it? Reschedule today via the app. We keep no content in this reminder.',
      cta: 'Open in the app',
    },
  },
  {
    id: 'E-06',
    trigger: 'Session confirmed / changed / declined',
    audience: 'client',
    category: 'transactional',
    nl: {
      subject: 'Je sessie van 12 juli is bevestigd',
      summary:
        'Thomas bevestigde jullie afspraak. De details en je voorbereiding vind je terug in de app.',
      cta: 'Sessiedetails openen',
    },
    en: {
      subject: 'Your July 12 session is confirmed',
      summary:
        'Thomas confirmed your appointment. You will find the details and your preparation back in the app.',
      cta: 'Open session details',
    },
  },
  {
    id: 'E-07',
    trigger: 'New lead via provider finder profile',
    audience: 'provider',
    category: 'transactional',
    nl: {
      subject: 'Nieuwe aanvraag via je Bondable-profiel',
      summary:
        'Iemand zocht een hulpverlener en koos jouw profiel. Reageer binnen 48 uur — een snelle reactie bepaalt de ervaring, nooit je positie in de lijst.',
      cta: 'Aanvraag bekijken',
    },
    en: {
      subject: 'New request via your Bondable profile',
      summary:
        'Someone searching for care chose your profile. Reply within 48 hours — responsiveness shapes their experience, never your ranking.',
      cta: 'View the request',
    },
  },
  {
    id: 'E-08',
    trigger: 'Unacknowledged client check-in > 4h (provider)',
    audience: 'provider',
    category: 'transactional',
    nl: {
      subject: 'Een cliënt vraagt je aandacht',
      summary:
        'Een cliënt stuurde een check-in die nog openstaat. Bekijk hem in je wachtrij wanneer het je past. We noemen geen naam en geen inhoud in deze mail.',
      cta: 'Naar mijn wachtrij',
    },
    en: {
      subject: 'A client flagged a check-in',
      summary:
        'A client sent a check-in that is still open. Review it in your queue when it suits you. We name no person and no content in this email.',
      cta: 'Go to my queue',
    },
  },

  // ── Activation drips · Provider (solo) ─────────────────────────────────────
  {
    id: 'E-10',
    trigger: 'Provider signup + 0 days',
    audience: 'provider',
    category: 'activation',
    dripDay: 0,
    nl: {
      subject: 'Welkom bij Bondable — je eerste drie stappen',
      summary:
        'Profiel, beschikbaarheid en je eerste cliënt: meer heb je niet nodig om te starten. De checklist in je dashboard houdt bij waar je zit, zodat je nooit iets vergeet.',
      cta: 'Open mijn checklist',
    },
    en: {
      subject: 'Welcome to Bondable — your first three steps',
      summary:
        'Profile, availability and your first client: that is all you need to start. The checklist in your dashboard tracks where you are, so nothing slips.',
      cta: 'Open my checklist',
    },
  },
  {
    id: 'E-11',
    trigger: 'Provider signup + 2 days',
    audience: 'provider',
    category: 'activation',
    dripDay: 2,
    nl: {
      subject: 'Word vindbaar voor wie jou zoekt',
      summary:
        'Je Finder-profiel kost je tien minuten en rangschikt puur op match, nooit op betaling. Zet het live wanneer jij er klaar voor bent.',
      cta: 'Profiel vervolledigen',
    },
    en: {
      subject: 'Become findable for the people looking for you',
      summary:
        'Your Finder profile takes ten minutes and ranks purely on fit, never on payment. Go live when you feel ready.',
      cta: 'Complete my profile',
    },
  },
  {
    id: 'E-12',
    trigger: 'Provider signup + 7 days',
    audience: 'provider',
    category: 'activation',
    dripDay: 7,
    nl: {
      subject: 'Je eerste cliënt uitnodigen duurt één minuut',
      summary:
        'Stuur een uitnodiging en je cliënt vult zelf alles in. Zo verhuist je administratie vanzelf naar één plek, zonder overtypen.',
      cta: 'Cliënt uitnodigen',
    },
    en: {
      subject: 'Inviting your first client takes a minute',
      summary:
        'Send an invitation and your client fills in everything themselves. That way your admin moves to one place on its own, without retyping.',
      cta: 'Invite a client',
    },
  },
  {
    id: 'E-13',
    trigger: 'Provider signup + 14 days',
    audience: 'provider',
    category: 'activation',
    dripDay: 14,
    nl: {
      subject: 'Zo verloopt een sessie op Bondable',
      summary:
        'Van voorbereiding tot recap en opvolgtaken: één korte rondleiding. Daarna staat alles klaar voor je echte praktijk.',
      cta: 'Bekijk de rondleiding',
    },
    en: {
      subject: 'How a session flows on Bondable',
      summary:
        'From preparation to recap and follow-up tasks: one short tour. After that everything is set for your real practice.',
      cta: 'View the tour',
    },
  },

  // ── Activation drips · Practice manager ────────────────────────────────────
  {
    id: 'E-15',
    trigger: 'Practice created + 0 days',
    audience: 'manager',
    category: 'activation',
    dripDay: 0,
    nl: {
      subject: 'Zet je team op in drie stappen',
      summary:
        'Nodig je collega’s uit, ken elk een rol toe en deel je agenda-instellingen. Je praktijk is actief zodra twee teamleden hun uitnodiging aanvaarden.',
      cta: 'Team uitnodigen',
    },
    en: {
      subject: 'Set up your team in three steps',
      summary:
        'Invite your colleagues, assign each a role and share your calendar defaults. Your practice is active once two members accept their invitation.',
      cta: 'Invite your team',
    },
  },
  {
    id: 'E-16',
    trigger: 'Practice created + 2 days',
    audience: 'manager',
    category: 'activation',
    dripDay: 2,
    nl: {
      subject: 'Twee collega’s uitgenodigd = praktijk actief',
      summary:
        'Je nodigde tot nu toe collega’s uit; nog niet iedereen aanvaardde. Een korte herinnering vanuit je dashboard helpt de laatste over de streep.',
      cta: 'Uitnodigingen opvolgen',
    },
    en: {
      subject: 'Two colleagues invited = practice active',
      summary:
        'You invited colleagues so far; not everyone accepted yet. A short reminder from your dashboard helps the last ones across the line.',
      cta: 'Follow up invitations',
    },
  },
  {
    id: 'E-17',
    trigger: 'Practice created + 7 days',
    audience: 'manager',
    category: 'activation',
    dripDay: 7,
    nl: {
      subject: 'Stel je intakesjablonen en gedeelde agenda in',
      summary:
        'Een gedeeld intakesjabloon en vaste agenda-afspraken besparen je team elke week tijd. Je hoeft het maar één keer in te stellen.',
      cta: 'Praktijk configureren',
    },
    en: {
      subject: 'Set up your intake templates and shared calendar',
      summary:
        'A shared intake template and fixed calendar defaults save your team time every week. You only set it up once.',
      cta: 'Configure practice',
    },
  },
  {
    id: 'E-18',
    trigger: 'Practice created + 14 days',
    audience: 'manager',
    category: 'activation',
    dripDay: 14,
    nl: {
      subject: 'Je eerste week als praktijk op Bondable',
      summary:
        'Een kort overzicht van hoe je team van start ging: sessies, actieve teamleden en openstaande uitnodigingen. Enkel cijfers, geen cliëntnamen.',
      cta: 'Overzicht bekijken',
    },
    en: {
      subject: 'Your first week as a practice on Bondable',
      summary:
        'A short recap of how your team got started: sessions, active members and open invitations. Numbers only, no client names.',
      cta: 'View the recap',
    },
  },

  // ── Activation drips · Staff ───────────────────────────────────────────────
  {
    id: 'E-20',
    trigger: 'Staff invite accepted + 0 days',
    audience: 'staff',
    category: 'activation',
    dripDay: 0,
    nl: {
      subject: 'An heeft alles voorbereid — nu jij',
      summary:
        'An Peeters zette de praktijk klaar; jij hoeft enkel je profiel en agenda in te stellen. Twee korte stappen en je staat klaar voor je eerste cliënt.',
      cta: 'Profiel afwerken',
    },
    en: {
      subject: 'An set everything up — now it is your turn',
      summary:
        'An Peeters prepared the practice; you only need to set up your profile and calendar. Two short steps and you are ready for your first client.',
      cta: 'Finish my profile',
    },
  },
  {
    id: 'E-21',
    trigger: 'Staff invite accepted + 2 days',
    audience: 'staff',
    category: 'activation',
    dripDay: 2,
    nl: {
      subject: 'Een foto en je discipline maken het verschil',
      summary:
        'Cliënten kiezen sneller voor een hulpverlener met een foto en een duidelijke discipline. Het vervolledigen van je profiel duurt geen twee minuten.',
      cta: 'Profiel vervolledigen',
    },
    en: {
      subject: 'A photo and your discipline make the difference',
      summary:
        'Clients choose a provider faster when there is a photo and a clear discipline. Completing your profile takes under two minutes.',
      cta: 'Complete my profile',
    },
  },
  {
    id: 'E-22',
    trigger: 'Staff invite accepted + 7 days, handoffs pending',
    audience: 'staff',
    category: 'activation',
    dripDay: 7,
    nl: {
      subject: 'Bevestig de cliënten die aan jou zijn toegewezen',
      summary:
        'Er staan nog cliënten klaar die An aan jou overdroeg. Bevestig ze één voor één, zodat de klinische verantwoordelijkheid duidelijk bij jou ligt.',
      cta: 'Overdracht bevestigen',
    },
    en: {
      subject: 'Confirm the clients assigned to you',
      summary:
        'There are still clients waiting that An handed over to you. Confirm them one by one, so clinical responsibility clearly sits with you.',
      cta: 'Confirm handover',
    },
  },

  // ── Activation drips · Client (OPT-IN, zero health content) ────────────────
  {
    id: 'E-25',
    trigger: 'Client account created + 0 days (opt-in)',
    audience: 'client',
    category: 'activation',
    dripDay: 0,
    nl: {
      subject: 'Welkom op Bondable',
      summary:
        'Fijn dat je er bent. Bondable is de plek waar jij en Thomas samenwerken tussen sessies door. Jij houdt de controle: je beslist zelf wat je deelt en wat privé blijft.',
      cta: 'Naar mijn omgeving',
    },
    en: {
      subject: 'Welcome to Bondable',
      summary:
        'Good to have you here. Bondable is where you and Thomas work together between sessions. You stay in control: you decide what you share and what stays private.',
      cta: 'Go to my space',
    },
  },
  {
    id: 'E-26',
    trigger: 'Client account created + 2 days (opt-in)',
    audience: 'client',
    category: 'activation',
    dripDay: 2,
    nl: {
      subject: 'Maak kennis met Bond',
      summary:
        'Bond is er om te luisteren tussen je sessies door, altijd onder toezicht van Thomas. Eén gesprek volstaat om te voelen hoe het werkt.',
      cta: 'Praat met Bond',
    },
    en: {
      subject: 'Meet Bond',
      summary:
        'Bond is here to listen between your sessions, always overseen by Thomas. One conversation is enough to feel how it works.',
      cta: 'Talk to Bond',
    },
  },
  {
    id: 'E-27',
    trigger: 'Client account created + 7 days (opt-in)',
    audience: 'client',
    category: 'activation',
    dripDay: 7,
    nl: {
      subject: 'Je dagboek en taken, wanneer het jou past',
      summary:
        'Eén zin over je dag is genoeg om te beginnen in je dagboek. Enkel jij leest dit, tenzij je iets bewust deelt met Thomas.',
      cta: 'Open mijn omgeving',
    },
    en: {
      subject: 'Your journal and tasks, whenever it suits you',
      summary:
        'One sentence about your day is enough to start your journal. Only you can read it, unless you deliberately share something with Thomas.',
      cta: 'Open my space',
    },
  },
  {
    id: 'E-28',
    trigger: 'Client account created + 14 days (opt-in)',
    audience: 'client',
    category: 'activation',
    dripDay: 14,
    nl: {
      subject: 'Hoe voelt het tot nu toe?',
      summary:
        'We horen graag hoe Bondable voor jou werkt. Je feedback geef je in de app; we vragen nooit inhoud per e-mail.',
      cta: 'Feedback geven',
    },
    en: {
      subject: 'How does it feel so far?',
      summary:
        'We would like to hear how Bondable works for you. You share feedback in the app; we never ask for content by email.',
      cta: 'Give feedback',
    },
  },

  // ── Recurring digest ───────────────────────────────────────────────────────
  {
    id: 'E-30',
    trigger: 'Weekly provider digest (Mon 07:30)',
    audience: 'provider',
    category: 'digest',
    nl: {
      subject: 'Je week: 6 sessies, 2 open taken, 1 nieuwe aanvraag',
      summary:
        'Een overzicht van je week: geplande sessies, openstaande check-ins en één voorgestelde volgende stap. Enkel cijfers, nooit cliëntnamen.',
      cta: 'Open mijn dashboard',
    },
    en: {
      subject: 'Your week: 6 sessions, 2 open tasks, 1 new request',
      summary:
        'A recap of your week: scheduled sessions, open check-ins and one suggested next step. Numbers only, never client names.',
      cta: 'Open my dashboard',
    },
  },

  // ── Trial-ending ───────────────────────────────────────────────────────────
  {
    id: 'E-33',
    trigger: 'Trial ending, D-7',
    audience: 'provider',
    category: 'trial',
    dripDay: -7,
    nl: {
      subject: 'Nog zeven dagen Pro — dit gebruikte je het meest',
      summary:
        'Je proefperiode loopt over zeven dagen af. Dit zijn de Pro-functies die jij het meest gebruikte. Zonder Pro behoud je al je gegevens en cliënten.',
      cta: 'Bekijk mijn opties',
    },
    en: {
      subject: 'Seven days of Pro left — what you used most',
      summary:
        'Your trial ends in seven days. These are the Pro features you used most. Without Pro you keep all your data and clients.',
      cta: 'View my options',
    },
  },
  {
    id: 'E-34',
    trigger: 'Trial ending, D-3',
    audience: 'provider',
    category: 'trial',
    dripDay: -3,
    nl: {
      subject: 'Nog drie dagen Pro',
      summary:
        'Je proefperiode loopt over drie dagen af. Kies rustig wat bij je praktijk past. Kies je niets, dan ga je gewoon verder op het gratis plan met al je gegevens.',
      cta: 'Plan kiezen',
    },
    en: {
      subject: 'Three days of Pro left',
      summary:
        'Your trial ends in three days. Take your time choosing what fits your practice. If you choose nothing, you simply continue on the free plan with all your data.',
      cta: 'Choose a plan',
    },
  },
  {
    id: 'E-35',
    trigger: 'Trial ended, D0',
    audience: 'provider',
    category: 'trial',
    dripDay: 0,
    nl: {
      subject: 'Je proefperiode is afgelopen',
      summary:
        'Je bent nu verder op het gratis plan; al je cliënten en gegevens blijven behouden. Wil je de Pro-functies terug, dan kan dat op elk moment.',
      cta: 'Upgraden naar Pro',
    },
    en: {
      subject: 'Your trial has ended',
      summary:
        'You now continue on the free plan; all your clients and data are kept. Whenever you want the Pro features back, you can upgrade at any time.',
      cta: 'Upgrade to Pro',
    },
  },

  // ── Win-back ───────────────────────────────────────────────────────────────
  {
    id: 'E-31',
    trigger: 'Provider 21 days inactive (max 2 sends)',
    audience: 'provider',
    category: 'winback',
    nl: {
      subject: 'Je praktijk op Bondable wacht op je',
      summary:
        'Het is even geleden. Dit is de stand van je praktijk in één oogopslag, en waar je gebleven was op je checklist. Verdergaan kan met één klik.',
      cta: 'Verder waar ik stopte',
    },
    en: {
      subject: 'Your practice on Bondable is waiting for you',
      summary:
        'It has been a while. Here is your practice at a glance and where you left off on your checklist. Picking up again takes one click.',
      cta: 'Resume where I left off',
    },
  },
];

/** Entries for one category, in registry order. */
export function messagesByCategory(category: EmailCategory): EmailMessage[] {
  return EMAIL_MESSAGES.filter((m) => m.category === category);
}

/** Lookup by id (E-01 …). */
export function getEmailById(id: string): EmailMessage | undefined {
  return EMAIL_MESSAGES.find((m) => m.id === id);
}
