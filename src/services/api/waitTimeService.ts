/**
 * waitTimeService — de Bondable Wachtlijstradar.
 *
 * WAAROM DIT BESTAAT: de Belgische pijn is de wachtlijst, niet het gebrek aan
 * hulpverleners. "Wachttijd psycholoog Gent" is exact wat mensen googelen, en
 * niemand publiceert er een eerlijk, citeerbaar cijfer over. Deze module is de
 * databron achter /wachttijden en /wachttijden/:stad.
 *
 * EERLIJKHEID IS HET PRODUCT. Alles hier is een INDICATIE, geen meting:
 *
 *   - We publiceren BANDEN (direct / 2-4 weken / 1-2 maanden / 3+ maanden /
 *     gesloten), nooit een precies aantal dagen dat we niet kunnen verdedigen.
 *   - Een band is de MEDIAAN van de wachttijden die profielen zelf opgeven.
 *     Bij een even aantal nemen we de kortste van de twee middelste banden —
 *     we schatten liever te kort dan te alarmerend.
 *   - Profielen die géén wachttijd opgeven tellen wel mee voor "neemt nieuwe
 *     cliënten aan", maar NIET voor de band. `declaredCount` is altijd zichtbaar
 *     zodat een lezer (of journalist) kan zien hoe dun het cijfer is.
 *   - De vraagdruk (`demandIndex`) verlengt de band met één stap wanneer het om
 *     ERKENDE ZORG gaat, de druk hoog is (>= 75) én minder dan 9 op de 10
 *     profielen nog aanneemt. Die correctie wordt per rij gemarkeerd
 *     (`demandAdjusted`) en nooit stil toegepast. Ze kan een band nooit op
 *     "gesloten" zetten: gesloten is iets dat een praktijk zelf verklaart, niet
 *     iets dat wij afleiden. Voor coaching passen we ze niet toe — daar is geen
 *     wachtlijstcrisis en zou ze een probleem suggereren dat er niet is.
 *
 * DETERMINISTISCH: geen Math.random, nergens. Dezelfde invoer geeft altijd
 * dezelfde uitvoer, zodat een screenshot van vandaag morgen nog klopt.
 *
 * MOCK: het panel is geseed (demo-modus heeft geen backend). Live Bondable-
 * profielen komen uit finderService en worden erbij geteld — een gesloten
 * Bondable-profiel is een échte verklaarde "gesloten", een open profiel zonder
 * opgegeven wachttijd telt alleen mee in de noemer.
 */

import { finderService, type Provider } from '@/services/api/finderService';
import type { ProviderType } from '@/lib/providerTypes';

/* -------------------------------------------------------------------------- */
/* Banden                                                                      */
/* -------------------------------------------------------------------------- */

/** De vijf banden, van kortst naar langst. Volgorde is betekenisdragend. */
export const WAIT_BANDS = [
  'direct',
  'weken_2_4',
  'maanden_1_2',
  'maanden_3_plus',
  'gesloten',
] as const;

export type WaitBand = (typeof WAIT_BANDS)[number];

/** Banden waar de vraagdruk-correctie in mag bewegen (gesloten is verklaard). */
const ADJUSTABLE_BANDS: WaitBand[] = [
  'direct',
  'weken_2_4',
  'maanden_1_2',
  'maanden_3_plus',
];

export type BandTone = 'success' | 'info' | 'warning' | 'destructive';

export interface WaitBandMeta {
  id: WaitBand;
  /** Volledige NL-omschrijving. */
  label: string;
  /** Korte variant voor tabelcellen en badges. */
  short: string;
  /** Semantische tint — nooit een ruwe tailwind-kleur. */
  tone: BandTone;
  /** Positie 0-4, voor sorteren en voor de vraagdruk-correctie. */
  order: number;
}

export const WAIT_BAND_META: Record<WaitBand, WaitBandMeta> = {
  direct: {
    id: 'direct',
    label: 'Direct beschikbaar',
    short: 'Direct',
    tone: 'success',
    order: 0,
  },
  weken_2_4: {
    id: 'weken_2_4',
    label: 'Twee tot vier weken',
    short: '2-4 weken',
    tone: 'success',
    order: 1,
  },
  maanden_1_2: {
    id: 'maanden_1_2',
    label: 'Een tot twee maanden',
    short: '1-2 maanden',
    tone: 'info',
    order: 2,
  },
  maanden_3_plus: {
    id: 'maanden_3_plus',
    label: 'Drie maanden of langer',
    short: '3+ maanden',
    tone: 'warning',
    order: 3,
  },
  gesloten: {
    id: 'gesloten',
    label: 'Wachtlijst gesloten',
    short: 'Gesloten',
    tone: 'destructive',
    order: 4,
  },
};

export const bandMeta = (band: WaitBand): WaitBandMeta => WAIT_BAND_META[band];

/* -------------------------------------------------------------------------- */
/* Disciplines                                                                 */
/* -------------------------------------------------------------------------- */

export type DisciplineId = 'psycholoog' | 'psychotherapeut' | 'coach';

export interface DisciplineMeta {
  id: DisciplineId;
  /** Enkelvoud, zoals een bezoeker het zou typen. */
  label: string;
  /** Meervoud voor koppen en tabelheaders. */
  plural: string;
  /** Welke provider_types uit de taxonomie hier onder vallen. */
  providerTypes: ProviderType[];
  /** Erkende zorg vs coaching — bepaalt de toon van de uitleg. */
  regulated: boolean;
}

export const DISCIPLINES: DisciplineMeta[] = [
  {
    id: 'psycholoog',
    label: 'Psycholoog',
    plural: 'Psychologen',
    providerTypes: ['clinical_psychologist', 'clinical_orthopedagogue'],
    regulated: true,
  },
  {
    id: 'psychotherapeut',
    label: 'Psychotherapeut',
    plural: 'Psychotherapeuten',
    providerTypes: ['psychotherapist'],
    regulated: true,
  },
  {
    id: 'coach',
    label: 'Coach',
    plural: 'Coaches en begeleiders',
    providerTypes: ['coach', 'counselor'],
    regulated: false,
  },
];

export const DISCIPLINE_IDS: DisciplineId[] = DISCIPLINES.map((d) => d.id);

export const disciplineMeta = (id: DisciplineId): DisciplineMeta =>
  DISCIPLINES.find((d) => d.id === id) ?? DISCIPLINES[0];

/** Welke discipline hoort bij een provider_type (null = niet meegeteld). */
function disciplineOf(type: ProviderType | null): DisciplineId | null {
  if (!type) return null;
  const hit = DISCIPLINES.find((d) => d.providerTypes.includes(type));
  return hit ? hit.id : null;
}

/* -------------------------------------------------------------------------- */
/* Het geseede panel                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Aantal profielen per band, in de volgorde van WAIT_BANDS:
 * [direct, 2-4 weken, 1-2 maanden, 3+ maanden, gesloten].
 */
type BandCounts = [number, number, number, number, number];

interface CitySeed {
  slug: string;
  name: string;
  province: string;
  /** Vraagdruk 0-100: hoeveel mensen zoeken hier per beschikbare plek. */
  demandIndex: number;
  panel: Record<DisciplineId, BandCounts>;
}

/**
 * Het panel. Vlaamse centrumsteden + Brussel. Deze cijfers zijn demo-data die
 * de vorm van de werkelijkheid volgen (erkende zorg loopt vast, coaching niet);
 * ze zijn geen meting en de pagina zegt dat ook met zoveel woorden.
 */
const CITY_SEEDS: CitySeed[] = [
  {
    slug: 'gent',
    name: 'Gent',
    province: 'Oost-Vlaanderen',
    demandIndex: 82,
    panel: {
      psycholoog: [1, 2, 5, 9, 6],
      psychotherapeut: [0, 1, 4, 6, 3],
      coach: [6, 7, 4, 1, 1],
    },
  },
  {
    slug: 'antwerpen',
    name: 'Antwerpen',
    province: 'Antwerpen',
    demandIndex: 86,
    panel: {
      psycholoog: [1, 3, 7, 12, 8],
      psychotherapeut: [1, 2, 5, 7, 4],
      coach: [9, 8, 5, 2, 1],
    },
  },
  {
    slug: 'leuven',
    name: 'Leuven',
    province: 'Vlaams-Brabant',
    demandIndex: 79,
    panel: {
      psycholoog: [1, 3, 5, 5, 4],
      psychotherapeut: [0, 1, 3, 5, 2],
      coach: [5, 5, 3, 1, 0],
    },
  },
  {
    slug: 'brugge',
    name: 'Brugge',
    province: 'West-Vlaanderen',
    demandIndex: 64,
    panel: {
      psycholoog: [1, 2, 4, 5, 2],
      psychotherapeut: [0, 1, 3, 3, 1],
      coach: [4, 4, 2, 1, 0],
    },
  },
  {
    slug: 'hasselt',
    name: 'Hasselt',
    province: 'Limburg',
    demandIndex: 61,
    panel: {
      psycholoog: [1, 2, 4, 4, 2],
      psychotherapeut: [0, 1, 2, 3, 1],
      coach: [3, 4, 2, 1, 0],
    },
  },
  {
    slug: 'mechelen',
    name: 'Mechelen',
    province: 'Antwerpen',
    demandIndex: 58,
    panel: {
      psycholoog: [1, 2, 3, 4, 1],
      psychotherapeut: [0, 1, 2, 2, 1],
      coach: [5, 3, 2, 0, 0],
    },
  },
  {
    slug: 'kortrijk',
    name: 'Kortrijk',
    province: 'West-Vlaanderen',
    demandIndex: 55,
    panel: {
      psycholoog: [1, 2, 3, 4, 1],
      psychotherapeut: [0, 1, 2, 2, 0],
      coach: [3, 3, 1, 1, 0],
    },
  },
  {
    slug: 'oostende',
    name: 'Oostende',
    province: 'West-Vlaanderen',
    demandIndex: 52,
    panel: {
      psycholoog: [0, 1, 3, 3, 2],
      psychotherapeut: [0, 1, 1, 2, 1],
      coach: [2, 3, 1, 0, 0],
    },
  },
  {
    slug: 'brussel',
    name: 'Brussel',
    province: 'Brussels Hoofdstedelijk Gewest',
    demandIndex: 88,
    panel: {
      psycholoog: [1, 3, 6, 10, 7],
      psychotherapeut: [1, 2, 4, 6, 3],
      coach: [7, 7, 4, 2, 1],
    },
  },
];

/** Alle stad-slugs, in publicatievolgorde. Handig voor routes en sitemaps. */
export const CITY_SLUGS: string[] = CITY_SEEDS.map((c) => c.slug);

/* -------------------------------------------------------------------------- */
/* Publieke vormen                                                             */
/* -------------------------------------------------------------------------- */

export interface DisciplineWait {
  disciplineId: DisciplineId;
  /** De gepubliceerde band. */
  band: WaitBand;
  /** De mediaan vóór de vraagdruk-correctie. */
  medianBand: WaitBand;
  /** True als de vraagdruk de band één stap verlengd heeft. */
  demandAdjusted: boolean;
  /** Profielen die een wachttijd opgaven — de noemer onder de band. */
  declaredCount: number;
  /** Alle profielen in deze stad+discipline (ook zonder opgegeven wachttijd). */
  profileCount: number;
  /** Hoeveel daarvan nu nieuwe cliënten aannemen. */
  acceptingCount: number;
  /** 0-1. Deel dat nieuwe cliënten aanneemt. */
  acceptingShare: number;
  /** Verdeling van de opgegeven banden (voor de detailpagina). */
  distribution: Record<WaitBand, number>;
  /** True bij minder dan 5 opgaven — de band is dan te dun om te citeren. */
  lowConfidence: boolean;
  /** Live Bondable-profielen die meetellen in deze rij. */
  bondableProfiles: number;
}

export interface CityWait {
  slug: string;
  name: string;
  province: string;
  demandIndex: number;
  /** Per discipline, in de volgorde van DISCIPLINES. */
  disciplines: DisciplineWait[];
  /** De langste band over de erkende disciplines — de "kop" van de stad. */
  headlineBand: WaitBand;
  profileCount: number;
  declaredCount: number;
  acceptingCount: number;
  acceptingShare: number;
  /** Live Bondable-profielen in deze stad. */
  bondableProfiles: number;
  updatedAt: string;
}

export interface NationalSummary {
  cityCount: number;
  profileCount: number;
  declaredCount: number;
  acceptingCount: number;
  acceptingShare: number;
  /** Landelijke mediaanband per discipline (zonder vraagdruk-correctie). */
  bandByDiscipline: Record<DisciplineId, WaitBand>;
  /** Op hoeveel opgegeven wachttijden elke landelijke band steunt. */
  declaredByDiscipline: Record<DisciplineId, number>;
  /** Steden waar je als psycholoog-zoeker 3+ maanden wacht of niet binnen kan. */
  citiesAtThreeMonths: number;
  /** Steden waar minstens één discipline direct of binnen 4 weken kan. */
  citiesWithFastOption: number;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Rekenwerk                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * De mediaanband uit een telling per band. Bij een even aantal nemen we de
 * KORTSTE van de twee middelste banden — liever te voorzichtig dan alarmerend.
 * Geeft null als er niets opgegeven is.
 */
function medianBand(counts: BandCounts): WaitBand | null {
  const total = counts.reduce((sum, n) => sum + n, 0);
  if (total === 0) return null;
  const target = Math.floor((total - 1) / 2);
  let seen = 0;
  for (let i = 0; i < counts.length; i += 1) {
    seen += counts[i];
    if (target < seen) return WAIT_BANDS[i];
  }
  return WAIT_BANDS[WAIT_BANDS.length - 1];
}

/** Eén stap langer, maar nooit tot "gesloten" — dat verklaart een praktijk zelf. */
function lengthenOneStep(band: WaitBand): WaitBand {
  const idx = ADJUSTABLE_BANDS.indexOf(band);
  if (idx === -1) return band;
  return ADJUSTABLE_BANDS[Math.min(idx + 1, ADJUSTABLE_BANDS.length - 1)];
}

/**
 * Drempels van de vraagdruk-correctie. Bewust hard-coded, en op de pagina
 * woordelijk uitgelegd — een correctie die je niet kan navertellen, hoort niet
 * in een cijfer dat je citeerbaar noemt.
 *
 * De correctie geldt ALLEEN voor erkende zorg (psycholoog, psychotherapeut).
 * Coaching kent de wachtlijstcrisis niet; daar zou ze een probleem suggereren
 * dat er niet is.
 */
export const DEMAND_THRESHOLD = 75;
export const ACCEPTING_THRESHOLD = 0.9;
/** Onder dit aantal opgaven noemen we een band te dun om te citeren. */
export const MIN_DECLARED = 5;

function emptyDistribution(): Record<WaitBand, number> {
  return {
    direct: 0,
    weken_2_4: 0,
    maanden_1_2: 0,
    maanden_3_plus: 0,
    gesloten: 0,
  };
}

/** Alle gepubliceerde providers, gegroepeerd per stad-slug. */
async function loadLiveByCity(): Promise<Map<string, Provider[]>> {
  const byCity = new Map<string, Provider[]>();
  let providers: Provider[] = [];
  try {
    providers = await finderService.listProviders();
  } catch {
    providers = [];
  }
  for (const p of providers) {
    const slug = slugifyCity(p.city);
    if (!slug) continue;
    const list = byCity.get(slug);
    if (list) list.push(p);
    else byCity.set(slug, [p]);
  }
  return byCity;
}

/** Stadsnaam → slug ("Sint-Niklaas" → "sint-niklaas"). Alleen bekende steden tellen mee. */
export function slugifyCity(city: string | null | undefined): string | null {
  if (!city) return null;
  const slug = city
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || null;
}

/** Bouw één stadsrij uit het panel plus de live Bondable-profielen. */
function buildCity(seed: CitySeed, live: Provider[], updatedAt: string): CityWait {
  const disciplines: DisciplineWait[] = DISCIPLINES.map((d) => {
    const panel = seed.panel[d.id];
    const distribution = emptyDistribution();
    WAIT_BANDS.forEach((band, i) => {
      distribution[band] = panel[i];
    });

    const panelTotal = panel.reduce((sum, n) => sum + n, 0);
    const panelAccepting = panelTotal - panel[4]; // alles behalve "gesloten"

    // Live Bondable-profielen. Een gesloten profiel is een échte verklaring en
    // telt mee in de band; een open profiel zonder opgegeven wachttijd telt
    // alleen mee in de noemer, nooit in de mediaan.
    const mine = live.filter((p) => disciplineOf(p.providerType) === d.id);
    const liveClosed = mine.filter((p) => !p.acceptingNewClients).length;
    const liveAccepting = mine.length - liveClosed;
    distribution.gesloten += liveClosed;

    const counts = WAIT_BANDS.map((b) => distribution[b]) as BandCounts;
    const declaredCount = panelTotal + liveClosed;
    const profileCount = panelTotal + mine.length;
    const acceptingCount = panelAccepting + liveAccepting;

    const median = medianBand(counts) ?? 'maanden_1_2';
    const acceptingShare = profileCount > 0 ? acceptingCount / profileCount : 0;
    const shouldAdjust =
      d.regulated &&
      seed.demandIndex >= DEMAND_THRESHOLD &&
      acceptingShare < ACCEPTING_THRESHOLD &&
      median !== 'gesloten';
    const band = shouldAdjust ? lengthenOneStep(median) : median;

    return {
      disciplineId: d.id,
      band,
      medianBand: median,
      demandAdjusted: shouldAdjust && band !== median,
      declaredCount,
      profileCount,
      acceptingCount,
      acceptingShare,
      distribution,
      lowConfidence: declaredCount < MIN_DECLARED,
      bondableProfiles: mine.length,
    };
  });

  const regulated = disciplines.filter(
    (row) => disciplineMeta(row.disciplineId).regulated,
  );
  const headlineBand = (regulated.length ? regulated : disciplines).reduce<WaitBand>(
    (worst, row) =>
      WAIT_BAND_META[row.band].order > WAIT_BAND_META[worst].order ? row.band : worst,
    'direct',
  );

  const profileCount = disciplines.reduce((sum, r) => sum + r.profileCount, 0);
  const declaredCount = disciplines.reduce((sum, r) => sum + r.declaredCount, 0);
  const acceptingCount = disciplines.reduce((sum, r) => sum + r.acceptingCount, 0);

  return {
    slug: seed.slug,
    name: seed.name,
    province: seed.province,
    demandIndex: seed.demandIndex,
    disciplines,
    headlineBand,
    profileCount,
    declaredCount,
    acceptingCount,
    acceptingShare: profileCount > 0 ? acceptingCount / profileCount : 0,
    bondableProfiles: live.length,
    updatedAt,
  };
}

/* -------------------------------------------------------------------------- */
/* Publieke API                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Wanneer de radar voor het laatst bijgewerkt is: maandag 06:00 van de lopende
 * week. Deterministisch (geen willekeur), en het klopt met de belofte "we
 * verversen wekelijks".
 */
export function getLastUpdated(): string {
  const now = new Date();
  const day = now.getDay(); // 0 = zondag
  const daysSinceMonday = (day + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysSinceMonday);
  monday.setHours(6, 0, 0, 0);
  return monday.toISOString();
}

/** Alle steden, gesorteerd zoals gepubliceerd (grootste vraagdruk eerst). */
export async function getCityIndex(): Promise<CityWait[]> {
  const liveByCity = await loadLiveByCity();
  const updatedAt = getLastUpdated();
  return CITY_SEEDS.map((seed) =>
    buildCity(seed, liveByCity.get(seed.slug) ?? [], updatedAt),
  ).sort((a, b) => b.demandIndex - a.demandIndex || a.name.localeCompare(b.name));
}

/** Eén stad op slug. Null wanneer we die stad (nog) niet publiceren. */
export async function getCity(slug: string): Promise<CityWait | null> {
  const seed = CITY_SEEDS.find((c) => c.slug === slug.toLowerCase());
  if (!seed) return null;
  const liveByCity = await loadLiveByCity();
  return buildCity(seed, liveByCity.get(seed.slug) ?? [], getLastUpdated());
}

/** De landelijke samenvatting bovenaan /wachttijden. */
export async function getNationalSummary(): Promise<NationalSummary> {
  const cities = await getCityIndex();

  const totals = cities.reduce(
    (acc, c) => {
      acc.profileCount += c.profileCount;
      acc.declaredCount += c.declaredCount;
      acc.acceptingCount += c.acceptingCount;
      return acc;
    },
    { profileCount: 0, declaredCount: 0, acceptingCount: 0 },
  );

  const bandByDiscipline = {} as Record<DisciplineId, WaitBand>;
  const declaredByDiscipline = {} as Record<DisciplineId, number>;
  for (const d of DISCIPLINES) {
    const counts = emptyDistribution();
    for (const city of cities) {
      const row = city.disciplines.find((r) => r.disciplineId === d.id);
      if (!row) continue;
      for (const band of WAIT_BANDS) counts[band] += row.distribution[band];
    }
    const asTuple = WAIT_BANDS.map((b) => counts[b]) as BandCounts;
    bandByDiscipline[d.id] = medianBand(asTuple) ?? 'maanden_1_2';
    declaredByDiscipline[d.id] = asTuple.reduce((sum, n) => sum + n, 0);
  }

  const citiesAtThreeMonths = cities.filter((c) => {
    const row = c.disciplines.find((r) => r.disciplineId === 'psycholoog');
    return !!row && WAIT_BAND_META[row.band].order >= WAIT_BAND_META.maanden_3_plus.order;
  }).length;

  const citiesWithFastOption = cities.filter((c) =>
    c.disciplines.some(
      (row) => WAIT_BAND_META[row.band].order <= WAIT_BAND_META.weken_2_4.order,
    ),
  ).length;

  return {
    cityCount: cities.length,
    profileCount: totals.profileCount,
    declaredCount: totals.declaredCount,
    acceptingCount: totals.acceptingCount,
    acceptingShare:
      totals.profileCount > 0 ? totals.acceptingCount / totals.profileCount : 0,
    bandByDiscipline,
    declaredByDiscipline,
    citiesAtThreeMonths,
    citiesWithFastOption,
    updatedAt: getLastUpdated(),
  };
}

/**
 * De hulpverleners in een stad die vandaag nieuwe cliënten aannemen. Dit is de
 * enige "harde" lijst op een stadspagina: echte profielen, geen schatting.
 */
export async function getAcceptingProviders(slug: string): Promise<Provider[]> {
  const seed = CITY_SEEDS.find((c) => c.slug === slug.toLowerCase());
  if (!seed) return [];
  try {
    return await finderService.listProviders({ city: seed.name, acceptingNew: true });
  } catch {
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/* Wachtlijst-interesse (mock store)                                           */
/* -------------------------------------------------------------------------- */

/**
 * Waar een dood spoor in de finder op landt. Iemand die niets vindt, laat hier
 * een e-mailadres achter voor een specialisatie in een stad — dat is de enige
 * manier waarop we later kunnen laten weten dat er een plek vrijkomt.
 *
 * GEEN GEZONDHEIDSGEGEVENS: we bewaren een e-mailadres, een stad en een
 * onderwerpslabel uit de finder-facetten. Nooit vrije tekst over een klacht.
 */
export type WaitlistSource =
  | 'find_zero_results'
  | 'find_no_match'
  | 'wachtruimte'
  | 'wachttijden_stad';

export interface WaitlistInterest {
  id: string;
  email: string;
  citySlug: string | null;
  cityName: string | null;
  /** Facetlabel uit de finder (bv. "burnout"), nooit vrije tekst. */
  specialization: string | null;
  disciplineId: DisciplineId | null;
  source: WaitlistSource;
  createdAt: string;
}

export interface SaveWaitlistInput {
  email: string;
  cityName?: string | null;
  specialization?: string | null;
  disciplineId?: DisciplineId | null;
  source: WaitlistSource;
}

const WAITLIST_KEY = 'bondable_waitlist_interest';

const hasWindow = (): boolean => typeof window !== 'undefined';

function readWaitlist(): WaitlistInterest[] {
  if (!hasWindow()) return [];
  try {
    const raw = window.localStorage.getItem(WAITLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WaitlistInterest[]) : [];
  } catch {
    return [];
  }
}

function writeWaitlist(rows: WaitlistInterest[]): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(WAITLIST_KEY, JSON.stringify(rows));
  } catch {
    /* stil falen — quota of private mode mag nooit een formulier breken */
  }
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `wl_${Date.now().toString(36)}`;
}

/** Minimale, eerlijke e-mailcheck — we blokkeren alleen wat zeker fout is. */
export function isPlausibleEmail(value: string): boolean {
  const v = value.trim();
  return v.length > 4 && v.includes('@') && v.lastIndexOf('.') > v.indexOf('@') + 1;
}

/** Bewaar een interesse. Hetzelfde adres voor dezelfde stad blijft één rij. */
export function saveWaitlistInterest(input: SaveWaitlistInput): WaitlistInterest {
  const cityName = input.cityName?.trim() || null;
  const row: WaitlistInterest = {
    id: newId(),
    email: input.email.trim(),
    citySlug: slugifyCity(cityName),
    cityName,
    specialization: input.specialization?.trim() || null,
    disciplineId: input.disciplineId ?? null,
    source: input.source,
    createdAt: new Date().toISOString(),
  };
  const rows = readWaitlist().filter(
    (r) =>
      !(
        r.email.toLowerCase() === row.email.toLowerCase() &&
        r.citySlug === row.citySlug &&
        r.specialization === row.specialization
      ),
  );
  writeWaitlist([...rows, row]);
  return row;
}

/** Alle bewaarde interesses, nieuwste eerst. */
export function listWaitlistInterest(): WaitlistInterest[] {
  return readWaitlist().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Aantal interesses, optioneel voor één stad. */
export function countWaitlistInterest(citySlug?: string): number {
  const rows = readWaitlist();
  if (!citySlug) return rows.length;
  return rows.filter((r) => r.citySlug === citySlug).length;
}

/** Verwijder een interesse (de bezoeker mag zich altijd weer uitschrijven). */
export function removeWaitlistInterest(id: string): void {
  writeWaitlist(readWaitlist().filter((r) => r.id !== id));
}

/* -------------------------------------------------------------------------- */

export const waitTimeService = {
  getCityIndex,
  getCity,
  getNationalSummary,
  getLastUpdated,
  getAcceptingProviders,
  saveWaitlistInterest,
  listWaitlistInterest,
  countWaitlistInterest,
  removeWaitlistInterest,
  isPlausibleEmail,
  slugifyCity,
  bandMeta,
  disciplineMeta,
};

export default waitTimeService;
