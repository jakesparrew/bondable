/**
 * practiceService — mock-backed group-practice management for the demo.
 *
 * Front-end MOCKUP (no real backend): state lives in localStorage, seeded once
 * with a non-empty demo practice ("Praktijk De Brug", Leuven) so the settings
 * page and team list demo well. Mirrors the schema in src/server/db/schema.ts
 * (practices / practice_members / practice_invites) and the roles owner|manager
 * |staff from docs/plan/02.
 *
 * Design invariants encoded here (not just in the UI):
 *  - Practices are an ORGANIZATIONAL layer only. This service exposes members,
 *    roles, seats and invites — never notes, journals, messages or any clinical
 *    content. Managers see operations, never clinical content (docs/plan/02 §7).
 *  - Seats are a Practice-tier workflow feature (seatLimit), never finder
 *    visibility (P2B-safe).
 *  - `is_regulated` stays derived elsewhere; here `providerType` is descriptive
 *    only, used for the member's discipline label via providerLabel.
 */

import type { ProviderType } from '@/lib/providerTypes';

export type PracticeRole = 'owner' | 'manager' | 'staff';
export type MemberStatus = 'active' | 'suspended';

export interface PracticeMember {
  id: string;
  practiceId: string;
  profileId: string;
  name: string;
  email: string;
  /** Discipline — descriptive label source only (via providerLabel). */
  providerType: ProviderType;
  role: PracticeRole;
  status: MemberStatus;
  joinedAt: string; // ISO date
}

export interface PracticeInvite {
  id: string;
  practiceId: string;
  email: string;
  role: PracticeRole;
  token: string;
  invitedBy: string;
  createdAt: string; // ISO date
  expiresAt: string; // ISO date
  acceptedAt: string | null;
}

export interface Practice {
  id: string;
  name: string;
  slug: string;
  city: string;
  country: string;
  bio: string;
  seatLimit: number;
  isPublished: boolean;
  createdBy: string;
  createdAt: string; // ISO date
}

export interface SeatUsage {
  used: number; // active members + pending (unaccepted) invites
  members: number;
  pendingInvites: number;
  limit: number;
  remaining: number;
  atLimit: boolean;
}

interface PracticeStore {
  practice: Practice | null;
  members: PracticeMember[];
  invites: PracticeInvite[];
}

const STORAGE_KEY = 'bondable_practice_store_v1';
const DAY = 24 * 60 * 60 * 1000;

const OWNER_PROFILE_ID = 'demo-owner';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);
}

function makeToken(): string {
  // Human-shareable, URL-safe token for the /practice-invite/:token link.
  const rand = Math.random().toString(36).slice(2, 10);
  return `prc-${rand}${Date.now().toString(36).slice(-4)}`;
}

/** Seed one non-empty demo practice: owner + a coach + a psycholoog. */
function seed(): PracticeStore {
  const now = Date.now();
  const practiceId = 'practice-de-brug';
  const practice: Practice = {
    id: practiceId,
    name: 'Praktijk De Brug',
    slug: 'praktijk-de-brug',
    city: 'Leuven',
    country: 'BE',
    bio: 'Een warme groepspraktijk in het hart van Leuven. Psychologische zorg en coaching onder één dak.',
    seatLimit: 6,
    isPublished: false,
    createdBy: OWNER_PROFILE_ID,
    createdAt: new Date(now - 120 * DAY).toISOString(),
  };
  const members: PracticeMember[] = [
    {
      id: 'member-lotte',
      practiceId,
      profileId: OWNER_PROFILE_ID,
      name: 'Lotte Vermeulen',
      email: 'lotte@praktijkdebrug.be',
      providerType: 'clinical_psychologist',
      role: 'owner',
      status: 'active',
      joinedAt: new Date(now - 120 * DAY).toISOString(),
    },
    {
      id: 'member-an',
      practiceId,
      profileId: 'demo-an',
      name: 'An Verhaeghe',
      email: 'an@praktijkdebrug.be',
      providerType: 'clinical_psychologist',
      role: 'staff',
      status: 'active',
      joinedAt: new Date(now - 74 * DAY).toISOString(),
    },
    {
      id: 'member-wout',
      practiceId,
      profileId: 'demo-wout',
      name: 'Wout Claes',
      email: 'wout@praktijkdebrug.be',
      providerType: 'coach',
      role: 'staff',
      status: 'active',
      joinedAt: new Date(now - 31 * DAY).toISOString(),
    },
  ];
  return { practice, members, invites: [] };
}

function read(): PracticeStore {
  if (typeof window === 'undefined' || !window.localStorage) {
    return seed();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seed();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw) as PracticeStore;
  } catch {
    return seed();
  }
}

function write(store: PracticeStore): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota / private-mode errors in the demo */
  }
}

function computeSeats(store: PracticeStore): SeatUsage {
  const limit = store.practice?.seatLimit ?? 0;
  const members = store.members.filter((m) => m.status === 'active').length;
  const pendingInvites = store.invites.filter((i) => !i.acceptedAt).length;
  const used = members + pendingInvites;
  const remaining = Math.max(0, limit - used);
  return {
    used,
    members,
    pendingInvites,
    limit,
    remaining,
    atLimit: used >= limit,
  };
}

export const practiceService = {
  /** The current demo user's practice, or null if none created yet. */
  async getMyPractice(): Promise<Practice | null> {
    return read().practice;
  },

  /** Owner first-run: create a practice; creator becomes owner. */
  async createPractice(name: string, city: string): Promise<Practice> {
    const now = new Date().toISOString();
    const practice: Practice = {
      id: `practice-${slugify(name) || 'nieuw'}`,
      name: name.trim(),
      slug: slugify(name),
      city: city.trim(),
      country: 'BE',
      bio: '',
      seatLimit: 3,
      isPublished: false,
      createdBy: OWNER_PROFILE_ID,
      createdAt: now,
    };
    const ownerMember: PracticeMember = {
      id: `member-${OWNER_PROFILE_ID}`,
      practiceId: practice.id,
      profileId: OWNER_PROFILE_ID,
      name: 'Jij',
      email: 'jij@praktijk.be',
      providerType: 'clinical_psychologist',
      role: 'owner',
      status: 'active',
      joinedAt: now,
    };
    const next: PracticeStore = { practice, members: [ownerMember], invites: [] };
    write(next);
    return practice;
  },

  async updatePractice(patch: Partial<Pick<Practice, 'name' | 'city' | 'bio' | 'isPublished'>>): Promise<Practice | null> {
    const store = read();
    if (!store.practice) return null;
    store.practice = {
      ...store.practice,
      ...patch,
      slug: patch.name ? slugify(patch.name) : store.practice.slug,
    };
    write(store);
    return store.practice;
  },

  async listMembers(): Promise<PracticeMember[]> {
    return read().members;
  },

  async listInvites(): Promise<PracticeInvite[]> {
    return read().invites.filter((i) => !i.acceptedAt);
  },

  async getSeatUsage(): Promise<SeatUsage> {
    return computeSeats(read());
  },

  /**
   * Invite a staff member by email + role. Returns the created invite (with a
   * shareable token for /practice-invite/:token). Blocks when at the seat limit.
   */
  async inviteStaff(
    email: string,
    role: PracticeRole,
  ): Promise<{ ok: true; invite: PracticeInvite } | { ok: false; reason: 'seat_limit' | 'no_practice' | 'duplicate' }> {
    const store = read();
    if (!store.practice) return { ok: false, reason: 'no_practice' };

    const seats = computeSeats(store);
    if (seats.atLimit) return { ok: false, reason: 'seat_limit' };

    const normalized = email.trim().toLowerCase();
    const dup =
      store.members.some((m) => m.email.toLowerCase() === normalized) ||
      store.invites.some((i) => !i.acceptedAt && i.email.toLowerCase() === normalized);
    if (dup) return { ok: false, reason: 'duplicate' };

    const now = Date.now();
    const invite: PracticeInvite = {
      id: `invite-${makeToken()}`,
      practiceId: store.practice.id,
      email: normalized,
      role,
      token: makeToken(),
      invitedBy: OWNER_PROFILE_ID,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 14 * DAY).toISOString(),
      acceptedAt: null,
    };
    store.invites.push(invite);
    write(store);
    return { ok: true, invite };
  },

  async revokeInvite(inviteId: string): Promise<void> {
    const store = read();
    store.invites = store.invites.filter((i) => i.id !== inviteId);
    write(store);
  },

  /** Look up an invite by its token (for the accept page). */
  async getInviteByToken(token: string): Promise<{ invite: PracticeInvite; practice: Practice } | null> {
    const store = read();
    const invite = store.invites.find((i) => i.token === token && !i.acceptedAt);
    if (!invite || !store.practice) return null;
    const expired = new Date(invite.expiresAt).getTime() < Date.now();
    if (expired) return null;
    return { invite, practice: store.practice };
  },

  /**
   * Staff accepts an invite: creates a practice_members row from the invite +
   * the self-entered name/discipline, marks the invite accepted.
   */
  async acceptInvite(
    token: string,
    profile: { name: string; providerType: ProviderType },
  ): Promise<{ ok: true; member: PracticeMember } | { ok: false; reason: 'invalid' | 'expired' | 'seat_limit' }> {
    const store = read();
    const invite = store.invites.find((i) => i.token === token);
    if (!invite || invite.acceptedAt || !store.practice) return { ok: false, reason: 'invalid' };
    if (new Date(invite.expiresAt).getTime() < Date.now()) return { ok: false, reason: 'expired' };

    const now = new Date().toISOString();
    const member: PracticeMember = {
      id: `member-${makeToken()}`,
      practiceId: store.practice.id,
      profileId: `demo-${makeToken()}`,
      name: profile.name.trim(),
      email: invite.email,
      providerType: profile.providerType,
      role: invite.role,
      status: 'active',
      joinedAt: now,
    };
    invite.acceptedAt = now;
    store.members.push(member);
    write(store);
    return { ok: true, member };
  },

  /** Demo helper: reset to the seeded state. */
  async resetDemo(): Promise<void> {
    write(seed());
  },
};

export default practiceService;
