/**
 * finderService — Bondable Finder marketplace (mock-backed via the supabase
 * client, so it works in dev explore mode and against the real DB later).
 *
 * REFERRAL-NEUTRAL BY DESIGN (EU Platform-to-Business + Belgian
 * dichotomieverbod). The directory and the matcher rank PURELY on FIT —
 * specialization, language, modality and availability. Price/payment is NEVER
 * an input to ordering or scoring, and there is NO "promoted"/"sponsored"
 * placement. hourly_rate is surfaced only for transparency on the profile.
 *
 * The mock query builder ignores Supabase embedded-join select strings, so this
 * service joins provider_profiles ↔ profiles CLIENT-SIDE (fetch both, merge by
 * id). That keeps name / photo / is_regulated reliable in both backends.
 */

import { supabase } from '@/integrations/supabase/client';

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export type Modality = 'in_person' | 'online' | string;

/** A provider as shown in the Finder: provider_profiles joined to its profile. */
export interface Provider {
  /** = profiles.id = provider_profiles.provider_id */
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  /** Regulated clinician (therapist/psychologist) vs coach. */
  isRegulated: boolean;
  headline: string | null;
  bio: string | null;
  approach: string | null;
  specializations: string[];
  languages: string[];
  modalities: Modality[];
  /** Transparency only — NEVER used for ranking/matching. */
  hourlyRate: number | null;
  city: string | null;
  country: string | null;
  acceptingNewClients: boolean;
  credentials: string | null;
  yearsExperience: number | null;
  photoUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  isPublished: boolean;
}

export interface ProviderRequest {
  id: string;
  providerId: string;
  clientId: string | null;
  clientName: string | null;
  clientEmail: string | null;
  topic: string | null;
  message: string | null;
  preferredModality: Modality | null;
  status: 'pending' | 'accepted' | 'declined' | string;
  createdAt: string | null;
  respondedAt: string | null;
}

export interface FinderFilters {
  /** Free-text search across name / headline / bio / city. */
  search?: string;
  specialization?: string;
  language?: string;
  modality?: Modality;
  /** true = regulated clinicians only; false = coaches only; undefined = both. */
  regulated?: boolean;
  city?: string;
  /** true = only providers currently accepting new clients. */
  acceptingNew?: boolean;
}

/** Intake answers used to compute FIT-based matches. */
export interface MatchIntake {
  specializations?: string[];
  /** Single topic convenience alias (folded into specializations). */
  topic?: string;
  language?: string;
  modality?: Modality;
  city?: string;
  /** If true, only consider providers accepting new clients. */
  acceptingNewOnly?: boolean;
}

export interface MatchResult {
  provider: Provider;
  /** 0–100 FIT score (specialization/language/modality/availability only). */
  score: number;
  /** Plain-language, transparent explanation of why this provider matched. */
  whyMatch: string;
  /** Structured reasons (handy for chips/badges in the UI). */
  reasons: string[];
}

export interface CreateRequestPayload {
  providerId: string;
  clientId?: string | null;
  clientName?: string;
  clientEmail?: string;
  topic?: string;
  message?: string;
  preferredModality?: Modality;
}

/**
 * Editable provider-profile fields a clinician/coach can change so they appear
 * (and rank on FIT) in the Finder. Identity-level fields (name, is_regulated)
 * live on the profiles row and are NOT editable here.
 */
export interface UpdateProviderPayload {
  headline?: string | null;
  bio?: string | null;
  approach?: string | null;
  specializations?: string[];
  languages?: string[];
  modalities?: Modality[];
  hourlyRate?: number | null;
  city?: string | null;
  country?: string | null;
  acceptingNewClients?: boolean;
  credentials?: string | null;
  yearsExperience?: number | null;
  photoUrl?: string | null;
  isPublished?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Internal helpers                                                            */
/* -------------------------------------------------------------------------- */

/** A raw DB/mock row — untyped at the edge, narrowed by the helpers below. */
type Row = Record<string, unknown>;

/** Read a column as string|null. */
const str = (row: Row, key: string): string | null => {
  const v = row[key];
  return typeof v === 'string' ? v : null;
};

function asArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  if (typeof v === 'string' && v.trim()) {
    // Tolerate a comma-separated string or a JSON-encoded array.
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === 'string');
    } catch {
      /* not JSON — fall through */
    }
    return v.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function toNumber(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function fullNameOf(first: unknown, last: unknown): string {
  const name = [first, last].filter((p) => typeof p === 'string' && p.trim()).join(' ').trim();
  return name || 'Hulpverlener';
}

/** Merge a provider_profiles row with its profile row into a Provider. */
function toProvider(pp: Row, profile: Row | null): Provider {
  return {
    id: String(pp.provider_id ?? ''),
    firstName: profile ? str(profile, 'first_name') : null,
    lastName: profile ? str(profile, 'last_name') : null,
    fullName: fullNameOf(profile?.first_name, profile?.last_name),
    isRegulated: profile?.is_regulated === true,
    headline: str(pp, 'headline'),
    bio: str(pp, 'bio'),
    approach: str(pp, 'approach'),
    specializations: asArray(pp.specializations),
    languages: asArray(pp.languages),
    modalities: asArray(pp.modalities),
    hourlyRate: toNumber(pp.hourly_rate),
    city: str(pp, 'city'),
    country: str(pp, 'country'),
    acceptingNewClients: pp.accepting_new_clients !== false,
    credentials: str(pp, 'credentials'),
    yearsExperience: toNumber(pp.years_experience),
    photoUrl: str(pp, 'photo_url'),
    rating: toNumber(pp.rating),
    reviewCount: toNumber(pp.review_count),
    isPublished: pp.is_published !== false,
  };
}

function toRequest(r: Row): ProviderRequest {
  return {
    id: String(r.id ?? ''),
    providerId: String(r.provider_id ?? ''),
    clientId: str(r, 'client_id'),
    clientName: str(r, 'client_name'),
    clientEmail: str(r, 'client_email'),
    topic: str(r, 'topic'),
    message: str(r, 'message'),
    preferredModality: str(r, 'preferred_modality'),
    status: str(r, 'status') ?? 'pending',
    createdAt: str(r, 'created_at'),
    respondedAt: str(r, 'responded_at'),
  };
}

/** Fetch all profiles once and index by id (for client-side joins). */
async function loadProfilesById(): Promise<Map<string, Row>> {
  const { data } = await supabase.from('profiles').select('*');
  const map = new Map<string, Row>();
  for (const p of (data ?? []) as Row[]) {
    const id = p?.id;
    if (typeof id === 'string') map.set(id, p);
  }
  return map;
}

/** Fetch published provider rows joined to their profiles. */
async function loadAllProviders(): Promise<Provider[]> {
  const [{ data: rows }, profilesById] = await Promise.all([
    supabase.from('provider_profiles').select('*'),
    loadProfilesById(),
  ]);
  const out: Provider[] = [];
  for (const pp of (rows ?? []) as Row[]) {
    if (pp?.is_published === false) continue;
    const providerId = typeof pp.provider_id === 'string' ? pp.provider_id : '';
    out.push(toProvider(pp, profilesById.get(providerId) ?? null));
  }
  return out;
}

const normalize = (s: unknown): string =>
  typeof s === 'string' ? s.trim().toLowerCase() : '';

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

export const finderService = {
  /**
   * List published providers, optionally filtered by FIT criteria + search.
   * Ordering is FIT/identity-neutral (name); never price, never "promoted".
   */
  async listProviders(filters: FinderFilters = {}): Promise<Provider[]> {
    let providers = await loadAllProviders();

    if (filters.regulated !== undefined) {
      providers = providers.filter((p) => p.isRegulated === filters.regulated);
    }
    if (filters.acceptingNew) {
      providers = providers.filter((p) => p.acceptingNewClients);
    }
    if (filters.specialization) {
      const want = normalize(filters.specialization);
      providers = providers.filter((p) => p.specializations.some((s) => normalize(s) === want));
    }
    if (filters.language) {
      const want = normalize(filters.language);
      providers = providers.filter((p) => p.languages.some((l) => normalize(l) === want));
    }
    if (filters.modality) {
      const want = normalize(filters.modality);
      providers = providers.filter((p) => p.modalities.some((m) => normalize(m) === want));
    }
    if (filters.city) {
      const want = normalize(filters.city);
      providers = providers.filter((p) => normalize(p.city) === want);
    }
    if (filters.search) {
      const q = normalize(filters.search);
      providers = providers.filter((p) =>
        [p.fullName, p.headline, p.bio, p.city, ...p.specializations].some((field) =>
          normalize(field).includes(q),
        ),
      );
    }

    // Neutral, stable ordering — alphabetical by name.
    return providers.sort((a, b) => a.fullName.localeCompare(b.fullName));
  },

  /** Fetch a single provider by id (= profiles.id). Returns null if missing. */
  async getProvider(providerId: string): Promise<Provider | null> {
    if (!providerId) return null;
    const [{ data: rows }, profilesById] = await Promise.all([
      supabase.from('provider_profiles').select('*').eq('provider_id', providerId),
      loadProfilesById(),
    ]);
    const pp = ((rows ?? []) as Row[])[0];
    if (!pp) return null;
    const id = typeof pp.provider_id === 'string' ? pp.provider_id : '';
    return toProvider(pp, profilesById.get(id) ?? null);
  },

  /**
   * Compute the top-3 FIT matches for an intake. Scoring is PURELY on fit:
   * specialization overlap (heaviest), language, modality, and availability.
   * Price/payment is never considered. Each result carries a transparent,
   * plain-language `whyMatch` so the client can see exactly why it ranked.
   */
  async getMatches(intake: MatchIntake = {}): Promise<MatchResult[]> {
    const providers = await loadAllProviders();

    const wantedSpecs = [
      ...(intake.specializations ?? []),
      ...(intake.topic ? [intake.topic] : []),
    ]
      .map(normalize)
      .filter(Boolean);
    const wantedLang = normalize(intake.language);
    const wantedModality = normalize(intake.modality);
    const wantedCity = normalize(intake.city);

    const pool = intake.acceptingNewOnly
      ? providers.filter((p) => p.acceptingNewClients)
      : providers;

    const scored: MatchResult[] = pool.map((provider) => {
      const reasons: string[] = [];
      let score = 0;

      // Specialization overlap — the dominant FIT signal (up to 60 pts).
      const provSpecs = provider.specializations.map(normalize);
      const matchedSpecs = wantedSpecs.filter((s) => provSpecs.includes(s));
      if (wantedSpecs.length > 0) {
        const ratio = matchedSpecs.length / wantedSpecs.length;
        score += Math.round(ratio * 60);
        if (matchedSpecs.length > 0) {
          reasons.push(
            `Gespecialiseerd in ${matchedSpecs.join(', ')}`,
          );
        }
      }

      // Language (up to 20 pts).
      if (wantedLang) {
        if (provider.languages.map(normalize).includes(wantedLang)) {
          score += 20;
          reasons.push(`Spreekt jouw taal (${intake.language})`);
        }
      }

      // Modality (up to 12 pts).
      if (wantedModality) {
        if (provider.modalities.map(normalize).includes(wantedModality)) {
          score += 12;
          reasons.push(
            wantedModality === 'online' ? 'Biedt online sessies' : 'Biedt sessies op locatie',
          );
        }
      }

      // Availability (up to 8 pts) — fit, not payment.
      if (provider.acceptingNewClients) {
        score += 8;
        reasons.push('Neemt nieuwe cliënten aan');
      }

      // Same-city is a soft availability/fit signal (up to 5 pts).
      if (wantedCity && normalize(provider.city) === wantedCity) {
        score += 5;
        reasons.push(`Gevestigd in ${provider.city}`);
      }

      const kind = provider.isRegulated ? 'erkende hulpverlener' : 'coach';
      const whyMatch = reasons.length
        ? `Deze ${kind} past omdat: ${reasons.join('; ')}.`
        : `Deze ${kind} is beschikbaar en kan mogelijk helpen.`;

      return { provider, score: Math.min(score, 100), whyMatch, reasons };
    });

    return scored
      .sort((a, b) => b.score - a.score || a.provider.fullName.localeCompare(b.provider.fullName))
      .slice(0, 3);
  },

  /** Create a Finder lead (client → provider). Echoes the created request. */
  async createRequest(payload: CreateRequestPayload): Promise<ProviderRequest> {
    const row = {
      provider_id: payload.providerId,
      client_id: payload.clientId ?? null,
      client_name: payload.clientName ?? null,
      client_email: payload.clientEmail ?? null,
      topic: payload.topic ?? null,
      message: payload.message ?? null,
      preferred_modality: payload.preferredModality ?? null,
      status: 'pending',
    };
    const { data, error } = await supabase
      .from('provider_requests')
      .insert([row])
      .select()
      .single();
    if (error) throw error;
    return toRequest((data ?? row) as Row);
  },

  /** List the leads addressed to a given provider (newest first). */
  async listRequestsForProvider(providerId: string): Promise<ProviderRequest[]> {
    if (!providerId) return [];
    const { data } = await supabase
      .from('provider_requests')
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });
    return ((data ?? []) as Row[]).map(toRequest);
  },

  /** Accept/decline a lead. Stamps responded_at. Echoes the updated row. */
  async respondToRequest(
    id: string,
    status: 'accepted' | 'declined',
  ): Promise<ProviderRequest> {
    const patch = { id, status, responded_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from('provider_requests')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return toRequest((data ?? patch) as Row);
  },

  /**
   * Update the calling provider's own public profile. Maps the camelCase
   * payload to the snake_case provider_profiles columns and stamps updated_at.
   * In dev/explore mode the mock client echoes the patch (graceful mock save);
   * against the real DB it persists. Echoes the merged Provider.
   *
   * NOTE: only FIT/profile fields are writable here — never anything that would
   * let payment influence ranking, in line with the referral-neutral design.
   */
  async updateProvider(
    providerId: string,
    payload: UpdateProviderPayload,
  ): Promise<Provider | null> {
    if (!providerId) return null;

    // Translate camelCase → snake_case, omitting undefined keys so a partial
    // patch never clobbers fields the form didn't touch.
    const patch: Row = { provider_id: providerId, updated_at: new Date().toISOString() };
    const set = (key: string, value: unknown) => {
      if (value !== undefined) patch[key] = value;
    };
    set('headline', payload.headline);
    set('bio', payload.bio);
    set('approach', payload.approach);
    set('specializations', payload.specializations);
    set('languages', payload.languages);
    set('modalities', payload.modalities);
    set('hourly_rate', payload.hourlyRate);
    set('city', payload.city);
    set('country', payload.country);
    set('accepting_new_clients', payload.acceptingNewClients);
    set('credentials', payload.credentials);
    set('years_experience', payload.yearsExperience);
    set('photo_url', payload.photoUrl);
    set('is_published', payload.isPublished);

    const { data, error } = await supabase
      .from('provider_profiles')
      .update(patch)
      .eq('provider_id', providerId)
      .select()
      .single();
    if (error) throw error;

    // Merge the echoed/persisted row with the backing profile for name/photo.
    const profilesById = await loadProfilesById();
    const pp = (data ?? patch) as Row;
    return toProvider(pp, profilesById.get(providerId) ?? null);
  },
};

export default finderService;
