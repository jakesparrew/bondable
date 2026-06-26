/**
 * adminService — self-contained MOCK data service for the Bondable platform
 * superadmin. Powers the admin oversight surfaces: all conversations (Bond AI +
 * direct therapist chats), all clients, and all coaches/therapists.
 *
 * This is a FRONT-END MOCKUP. There is no real backend here — everything is
 * seeded with realistic, deterministic data. Providers are mapped from the
 * referral-neutral finderService when available, with a static fallback seed.
 *
 * Determinism note: we never use Math.random() or `new Date()` with no args at
 * module scope. All timestamps are fixed ISO strings and any pseudo-random
 * counts are derived deterministically from the id.
 */

import { finderService } from '@/services/api/finderService';

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export interface AdminClient {
  id: string;
  fullName: string;
  email: string;
  status: 'active' | 'invited' | 'inactive';
  assignedProviderName: string | null;
  /** ISO date string. */
  lastActiveAt: string;
  sessionsCount: number;
  riskFlag?: boolean;
  /** ISO date string. */
  joinedAt: string;
}

export interface AdminProvider {
  id: string;
  fullName: string;
  isRegulated: boolean;
  headline: string;
  city: string;
  specializations: string[];
  acceptingNewClients: boolean;
  clientsCount: number;
  leadsCount: number;
  rating: number | null;
}

export interface ChatMessage {
  id: string;
  sender: 'client' | 'bond' | 'therapist' | 'system';
  text: string;
  /** ISO date string. */
  at: string;
}

export interface AdminConversation {
  id: string;
  type: 'bond' | 'direct';
  clientName: string;
  /** e.g. "Bond (AI)" or a therapist name. */
  counterpartName: string;
  supervisingTherapistName?: string;
  status: 'active' | 'flagged' | 'archived';
  /** ISO date string. */
  lastMessageAt: string;
  messageCount: number;
  messages: ChatMessage[];
}

export interface AdminStats {
  totalClients: number;
  totalProviders: number;
  totalConversations: number;
  flaggedConversations: number;
  activeToday: number;
}

/* -------------------------------------------------------------------------- */
/* Helpers (deterministic — no Math.random / Date.now)                         */
/* -------------------------------------------------------------------------- */

/** Cheap deterministic hash over a string → non-negative int. */
function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Deterministic int in [min, max] derived from an id + salt. */
function pseudoCount(id: string, salt: number, min: number, max: number): number {
  const span = max - min + 1;
  return min + ((hashId(id) + salt * 7 + id.length * 13) % span);
}

const normalize = (s: unknown): string =>
  typeof s === 'string' ? s.trim().toLowerCase() : '';

/* -------------------------------------------------------------------------- */
/* Seed data                                                                   */
/* -------------------------------------------------------------------------- */

const CLIENTS: AdminClient[] = [
  {
    id: 'cl-1',
    fullName: 'Lotte Vermeulen',
    email: 'lotte.vermeulen@example.be',
    status: 'active',
    assignedProviderName: 'Dr. Anke Willems',
    lastActiveAt: '2026-06-26T08:14:00Z',
    sessionsCount: 12,
    joinedAt: '2026-01-09T10:00:00Z',
  },
  {
    id: 'cl-2',
    fullName: 'Jeroen Peeters',
    email: 'jeroen.peeters@example.be',
    status: 'active',
    assignedProviderName: 'Maarten Claes',
    lastActiveAt: '2026-06-25T19:42:00Z',
    sessionsCount: 7,
    riskFlag: true,
    joinedAt: '2026-02-21T09:30:00Z',
  },
  {
    id: 'cl-3',
    fullName: 'Sofie Maes',
    email: 'sofie.maes@example.be',
    status: 'active',
    assignedProviderName: 'Dr. Anke Willems',
    lastActiveAt: '2026-06-26T07:05:00Z',
    sessionsCount: 19,
    joinedAt: '2025-11-03T14:20:00Z',
  },
  {
    id: 'cl-4',
    fullName: 'Imane El Amrani',
    email: 'imane.elamrani@example.be',
    status: 'active',
    assignedProviderName: 'Naïma Bakkali',
    lastActiveAt: '2026-06-24T16:50:00Z',
    sessionsCount: 4,
    joinedAt: '2026-04-12T11:15:00Z',
  },
  {
    id: 'cl-5',
    fullName: 'Thomas De Smet',
    email: 'thomas.desmet@example.be',
    status: 'invited',
    assignedProviderName: null,
    lastActiveAt: '2026-06-20T12:00:00Z',
    sessionsCount: 0,
    joinedAt: '2026-06-18T08:00:00Z',
  },
  {
    id: 'cl-6',
    fullName: 'Femke Janssens',
    email: 'femke.janssens@example.be',
    status: 'active',
    assignedProviderName: 'Maarten Claes',
    lastActiveAt: '2026-06-26T06:30:00Z',
    sessionsCount: 9,
    joinedAt: '2026-03-01T10:45:00Z',
  },
  {
    id: 'cl-7',
    fullName: 'Bram Wouters',
    email: 'bram.wouters@example.be',
    status: 'inactive',
    assignedProviderName: 'Dr. Anke Willems',
    lastActiveAt: '2026-05-02T18:10:00Z',
    sessionsCount: 14,
    joinedAt: '2025-09-22T13:00:00Z',
  },
  {
    id: 'cl-8',
    fullName: 'Yasmine Haddad',
    email: 'yasmine.haddad@example.be',
    status: 'active',
    assignedProviderName: 'Naïma Bakkali',
    lastActiveAt: '2026-06-25T21:18:00Z',
    sessionsCount: 6,
    riskFlag: true,
    joinedAt: '2026-02-08T09:00:00Z',
  },
  {
    id: 'cl-9',
    fullName: 'Wout Verhoeven',
    email: 'wout.verhoeven@example.be',
    status: 'active',
    assignedProviderName: 'Maarten Claes',
    lastActiveAt: '2026-06-23T15:25:00Z',
    sessionsCount: 3,
    joinedAt: '2026-05-19T16:40:00Z',
  },
  {
    id: 'cl-10',
    fullName: 'Elke Dubois',
    email: 'elke.dubois@example.be',
    status: 'invited',
    assignedProviderName: null,
    lastActiveAt: '2026-06-22T11:00:00Z',
    sessionsCount: 0,
    joinedAt: '2026-06-21T10:30:00Z',
  },
];

/** Fallback provider seed (used only if finderService returns nothing). */
const PROVIDER_FALLBACK: AdminProvider[] = [
  {
    id: 'pr-1',
    fullName: 'Dr. Anke Willems',
    isRegulated: true,
    headline: 'Klinisch psycholoog — angst & burn-out',
    city: 'Gent',
    specializations: ['Angst', 'Burn-out', 'Stress'],
    acceptingNewClients: true,
    clientsCount: 0,
    leadsCount: 0,
    rating: 4.8,
  },
  {
    id: 'pr-2',
    fullName: 'Maarten Claes',
    isRegulated: true,
    headline: 'Psychotherapeut — relaties & rouw',
    city: 'Antwerpen',
    specializations: ['Relaties', 'Rouw', 'Depressie'],
    acceptingNewClients: true,
    clientsCount: 0,
    leadsCount: 0,
    rating: 4.6,
  },
  {
    id: 'pr-3',
    fullName: 'Naïma Bakkali',
    isRegulated: true,
    headline: 'Klinisch psycholoog — trauma & EMDR',
    city: 'Brussel',
    specializations: ['Trauma', 'EMDR', 'Angst'],
    acceptingNewClients: false,
    clientsCount: 0,
    leadsCount: 0,
    rating: 4.9,
  },
  {
    id: 'pr-4',
    fullName: 'Tom Vandenberghe',
    isRegulated: false,
    headline: 'Stress- & veerkrachtcoach',
    city: 'Leuven',
    specializations: ['Stress', 'Veerkracht', 'Mindfulness'],
    acceptingNewClients: true,
    clientsCount: 0,
    leadsCount: 0,
    rating: 4.4,
  },
  {
    id: 'pr-5',
    fullName: 'Sara Goossens',
    isRegulated: false,
    headline: 'Loopbaan- & levenscoach',
    city: 'Brugge',
    specializations: ['Loopbaan', 'Zelfvertrouwen', 'Balans'],
    acceptingNewClients: true,
    clientsCount: 0,
    leadsCount: 0,
    rating: 4.3,
  },
  {
    id: 'pr-6',
    fullName: 'Karim Benali',
    isRegulated: false,
    headline: 'Mindfulness- & slaapcoach',
    city: 'Hasselt',
    specializations: ['Slaap', 'Mindfulness', 'Stress'],
    acceptingNewClients: false,
    clientsCount: 0,
    leadsCount: 0,
    rating: null,
  },
];

const CONVERSATIONS: AdminConversation[] = [
  {
    id: 'cv-1',
    type: 'bond',
    clientName: 'Lotte Vermeulen',
    counterpartName: 'Bond (AI)',
    supervisingTherapistName: 'Dr. Anke Willems',
    status: 'active',
    lastMessageAt: '2026-06-26T08:14:00Z',
    messageCount: 7,
    messages: [
      { id: 'cv-1-m1', sender: 'client', text: 'Ik heb vannacht slecht geslapen, mijn hoofd bleef maar malen.', at: '2026-06-26T08:02:00Z' },
      { id: 'cv-1-m2', sender: 'bond', text: 'Dat klinkt vermoeiend, Lotte. Wil je vertellen waar je gedachten vooral naartoe gingen?', at: '2026-06-26T08:03:00Z' },
      { id: 'cv-1-m3', sender: 'client', text: 'Vooral werk. Ik vrees dat ik de deadline van vrijdag niet ga halen.', at: '2026-06-26T08:06:00Z' },
      { id: 'cv-1-m4', sender: 'bond', text: 'Begrijpelijk dat dat spanning geeft. Zullen we de taak even opdelen in kleinere stappen, zodat het behapbaarder voelt?', at: '2026-06-26T08:07:00Z' },
      { id: 'cv-1-m5', sender: 'client', text: 'Ja, dat zou helpen denk ik.', at: '2026-06-26T08:09:00Z' },
      { id: 'cv-1-m6', sender: 'bond', text: 'Top. Laten we beginnen met wat er vóór vrijdag écht af moet, en de rest parkeren. Wat is de eerste concrete stap?', at: '2026-06-26T08:11:00Z' },
      { id: 'cv-1-m7', sender: 'client', text: 'De outline afmaken. Dat kan ik vanochtend doen.', at: '2026-06-26T08:14:00Z' },
    ],
  },
  {
    id: 'cv-2',
    type: 'bond',
    clientName: 'Jeroen Peeters',
    counterpartName: 'Bond (AI)',
    supervisingTherapistName: 'Maarten Claes',
    status: 'flagged',
    lastMessageAt: '2026-06-25T19:42:00Z',
    messageCount: 8,
    messages: [
      { id: 'cv-2-m1', sender: 'client', text: 'Ik weet niet meer hoe het verder moet. Alles voelt zwaar.', at: '2026-06-25T19:20:00Z' },
      { id: 'cv-2-m2', sender: 'bond', text: 'Het spijt me dat je je zo voelt, Jeroen. Je staat er niet alleen voor. Kun je me iets meer vertellen over wat er nu door je heen gaat?', at: '2026-06-25T19:22:00Z' },
      { id: 'cv-2-m3', sender: 'client', text: 'Soms denk ik dat het beter zou zijn als ik er niet meer was.', at: '2026-06-25T19:28:00Z' },
      { id: 'cv-2-m4', sender: 'system', text: 'Escalated to supervising therapist — crisis protocol. Maarten Claes is genotificeerd. Hulplijn 1813 / 112 getoond aan cliënt.', at: '2026-06-25T19:28:30Z' },
      { id: 'cv-2-m5', sender: 'bond', text: 'Dank dat je dit deelt — dat vraagt moed. Je veiligheid is nu het belangrijkste. Ik heb je begeleider Maarten op de hoogte gebracht. Wil je nu samen met mij contact opnemen met de Zelfmoordlijn (1813)?', at: '2026-06-25T19:29:00Z' },
      { id: 'cv-2-m6', sender: 'client', text: 'Ik weet het niet. Misschien.', at: '2026-06-25T19:33:00Z' },
      { id: 'cv-2-m7', sender: 'therapist', text: 'Jeroen, ik ben er. Ik bel je nu meteen — neem je op? Je hoeft dit niet alleen te dragen.', at: '2026-06-25T19:38:00Z' },
      { id: 'cv-2-m8', sender: 'client', text: 'Oké. Bedankt.', at: '2026-06-25T19:42:00Z' },
    ],
  },
  {
    id: 'cv-3',
    type: 'bond',
    clientName: 'Sofie Maes',
    counterpartName: 'Bond (AI)',
    supervisingTherapistName: 'Dr. Anke Willems',
    status: 'active',
    lastMessageAt: '2026-06-26T07:05:00Z',
    messageCount: 6,
    messages: [
      { id: 'cv-3-m1', sender: 'client', text: 'Goedemorgen! Ik heb mijn ademhalingsoefening gedaan vanochtend.', at: '2026-06-26T06:50:00Z' },
      { id: 'cv-3-m2', sender: 'bond', text: 'Wat fijn om te horen, Sofie. Hoe voelde je je erna?', at: '2026-06-26T06:52:00Z' },
      { id: 'cv-3-m3', sender: 'client', text: 'Rustiger. Mijn schouders waren minder gespannen.', at: '2026-06-26T06:55:00Z' },
      { id: 'cv-3-m4', sender: 'bond', text: 'Mooi dat je het verschil voelt. Dat is precies waarom herhaling helpt. Zullen we het in je dagritme inbouwen?', at: '2026-06-26T06:58:00Z' },
      { id: 'cv-3-m5', sender: 'client', text: 'Ja, misschien elke ochtend na de koffie.', at: '2026-06-26T07:02:00Z' },
      { id: 'cv-3-m6', sender: 'bond', text: 'Een prima anker. Ik check er morgen even op terug. Fijne dag, Sofie.', at: '2026-06-26T07:05:00Z' },
    ],
  },
  {
    id: 'cv-4',
    type: 'bond',
    clientName: 'Femke Janssens',
    counterpartName: 'Bond (AI)',
    supervisingTherapistName: 'Maarten Claes',
    status: 'active',
    lastMessageAt: '2026-06-26T06:30:00Z',
    messageCount: 5,
    messages: [
      { id: 'cv-4-m1', sender: 'client', text: 'Ik heb morgen een sollicitatiegesprek en ben superzenuwachtig.', at: '2026-06-26T06:18:00Z' },
      { id: 'cv-4-m2', sender: 'bond', text: 'Spannend! Zenuwen horen erbij — ze laten zien dat het je iets kan schelen. Wat maakt je het meest onzeker?', at: '2026-06-26T06:20:00Z' },
      { id: 'cv-4-m3', sender: 'client', text: 'Dat ik ga blokkeren op een moeilijke vraag.', at: '2026-06-26T06:24:00Z' },
      { id: 'cv-4-m4', sender: 'bond', text: 'Laten we een paar antwoorden samen voorbereiden, en een korte pauze-zin oefenen voor als je even tijd nodig hebt. Klinkt dat goed?', at: '2026-06-26T06:27:00Z' },
      { id: 'cv-4-m5', sender: 'client', text: 'Ja graag, dat stelt me al wat geruster.', at: '2026-06-26T06:30:00Z' },
    ],
  },
  {
    id: 'cv-5',
    type: 'direct',
    clientName: 'Sofie Maes',
    counterpartName: 'Dr. Anke Willems',
    status: 'active',
    lastMessageAt: '2026-06-25T17:10:00Z',
    messageCount: 6,
    messages: [
      { id: 'cv-5-m1', sender: 'therapist', text: 'Dag Sofie, goed je donderdag te zien. Hoe was je week?', at: '2026-06-25T16:50:00Z' },
      { id: 'cv-5-m2', sender: 'client', text: 'Wisselend. Begin van de week ging het goed, daarna een dipje.', at: '2026-06-25T16:54:00Z' },
      { id: 'cv-5-m3', sender: 'therapist', text: 'Dank voor je eerlijkheid. Herken je wat het dipje in gang zette?', at: '2026-06-25T16:58:00Z' },
      { id: 'cv-5-m4', sender: 'client', text: 'Een lastig gesprek met mijn moeder, denk ik.', at: '2026-06-25T17:02:00Z' },
      { id: 'cv-5-m5', sender: 'therapist', text: 'Laten we daar volgende sessie dieper op ingaan. Probeer tot dan je oefening vast te houden.', at: '2026-06-25T17:06:00Z' },
      { id: 'cv-5-m6', sender: 'client', text: 'Doe ik. Bedankt, tot volgende week.', at: '2026-06-25T17:10:00Z' },
    ],
  },
  {
    id: 'cv-6',
    type: 'direct',
    clientName: 'Imane El Amrani',
    counterpartName: 'Naïma Bakkali',
    status: 'active',
    lastMessageAt: '2026-06-24T16:50:00Z',
    messageCount: 5,
    messages: [
      { id: 'cv-6-m1', sender: 'client', text: 'Hallo Naïma, kunnen we de afspraak van vrijdag een uur later zetten?', at: '2026-06-24T16:30:00Z' },
      { id: 'cv-6-m2', sender: 'therapist', text: 'Dag Imane, dat lukt. Ik zet hem op 15u. Hoe gaat het verder met de oefeningen?', at: '2026-06-24T16:36:00Z' },
      { id: 'cv-6-m3', sender: 'client', text: 'De grounding-techniek helpt echt als ik me overweldigd voel.', at: '2026-06-24T16:41:00Z' },
      { id: 'cv-6-m4', sender: 'therapist', text: 'Heel fijn om te horen. Blijf het toepassen; we bouwen er vrijdag op verder.', at: '2026-06-24T16:46:00Z' },
      { id: 'cv-6-m5', sender: 'client', text: 'Top, tot vrijdag!', at: '2026-06-24T16:50:00Z' },
    ],
  },
  {
    id: 'cv-7',
    type: 'direct',
    clientName: 'Bram Wouters',
    counterpartName: 'Dr. Anke Willems',
    status: 'archived',
    lastMessageAt: '2026-05-02T18:10:00Z',
    messageCount: 5,
    messages: [
      { id: 'cv-7-m1', sender: 'therapist', text: 'Dag Bram, vandaag ronden we ons traject af. Hoe kijk je erop terug?', at: '2026-05-02T17:50:00Z' },
      { id: 'cv-7-m2', sender: 'client', text: 'Ik voel me een stuk steviger dan een jaar geleden. Bedankt voor alles.', at: '2026-05-02T17:55:00Z' },
      { id: 'cv-7-m3', sender: 'therapist', text: 'Dat heb je vooral zelf gedaan. Je weet me te vinden mocht het nodig zijn.', at: '2026-05-02T18:00:00Z' },
      { id: 'cv-7-m4', sender: 'client', text: 'Zeker. Ik hou de oefeningen aan.', at: '2026-05-02T18:05:00Z' },
      { id: 'cv-7-m5', sender: 'therapist', text: 'Het ga je goed, Bram. Tot ziens.', at: '2026-05-02T18:10:00Z' },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Provider mapping (finderService → AdminProvider, with fallback)             */
/* -------------------------------------------------------------------------- */

async function loadProviders(): Promise<AdminProvider[]> {
  try {
    const fromFinder = await finderService.listProviders();
    if (fromFinder && fromFinder.length > 0) {
      return fromFinder.map((p) => ({
        id: p.id || p.fullName,
        fullName: p.fullName,
        isRegulated: p.isRegulated,
        headline: p.headline ?? '',
        city: p.city ?? '',
        specializations: p.specializations ?? [],
        acceptingNewClients: p.acceptingNewClients,
        // Deterministic, static-per-id pseudo counts (NOT Math.random()).
        clientsCount: pseudoCount(p.id || p.fullName, 1, 0, 24),
        leadsCount: pseudoCount(p.id || p.fullName, 2, 0, 12),
        rating: p.rating,
      }));
    }
  } catch {
    /* fall through to the static seed */
  }
  // Static fallback — derive counts deterministically too.
  return PROVIDER_FALLBACK.map((p) => ({
    ...p,
    clientsCount: pseudoCount(p.id, 1, 2, 24),
    leadsCount: pseudoCount(p.id, 2, 0, 12),
  }));
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

export const adminService = {
  async getStats(): Promise<AdminStats> {
    const providers = await loadProviders();
    const flagged = CONVERSATIONS.filter((c) => c.status === 'flagged').length;
    // "Active today" relative to the fixed seed date (2026-06-26).
    const today = '2026-06-26';
    const activeToday = CLIENTS.filter((c) => c.lastActiveAt.startsWith(today)).length;
    return {
      totalClients: CLIENTS.length,
      totalProviders: providers.length,
      totalConversations: CONVERSATIONS.length,
      flaggedConversations: flagged,
      activeToday,
    };
  },

  async listClients(search?: string): Promise<AdminClient[]> {
    let out = [...CLIENTS];
    if (search) {
      const q = normalize(search);
      out = out.filter((c) =>
        [c.fullName, c.email, c.assignedProviderName, c.status].some((field) =>
          normalize(field).includes(q),
        ),
      );
    }
    return out.sort((a, b) => a.fullName.localeCompare(b.fullName));
  },

  async listProviders(opts?: { search?: string; regulated?: boolean }): Promise<AdminProvider[]> {
    let out = await loadProviders();
    if (opts?.regulated !== undefined) {
      out = out.filter((p) => p.isRegulated === opts.regulated);
    }
    if (opts?.search) {
      const q = normalize(opts.search);
      out = out.filter((p) =>
        [p.fullName, p.headline, p.city, ...p.specializations].some((field) =>
          normalize(field).includes(q),
        ),
      );
    }
    return out.sort((a, b) => a.fullName.localeCompare(b.fullName));
  },

  async listConversations(filter?: {
    type?: 'bond' | 'direct';
    status?: string;
    search?: string;
  }): Promise<AdminConversation[]> {
    let out = [...CONVERSATIONS];
    if (filter?.type) {
      out = out.filter((c) => c.type === filter.type);
    }
    if (filter?.status) {
      out = out.filter((c) => c.status === filter.status);
    }
    if (filter?.search) {
      const q = normalize(filter.search);
      out = out.filter((c) =>
        [c.clientName, c.counterpartName, c.supervisingTherapistName].some((field) =>
          normalize(field).includes(q),
        ) || c.messages.some((m) => normalize(m.text).includes(q)),
      );
    }
    // Newest activity first.
    return out.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  },

  async getConversation(id: string): Promise<AdminConversation | null> {
    return CONVERSATIONS.find((c) => c.id === id) ?? null;
  },
};

export default adminService;
