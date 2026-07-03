/**
 * adminAbility — the single capability map for the Bondable owner cockpit
 * (plan 07 §8, ticket T-OC-3). One place decides what each admin role may do,
 * consumed by the cockpit shell (sidebar visibility) AND by every ops surface
 * (mutations hidden/disabled for roles that lack the action).
 *
 * The owner will hire; wiring the role check in from day one costs almost
 * nothing and avoids re-auditing every screen later. A `readonly` advisor or
 * accountant can read the cockpit but can never toggle a flag, issue a refund,
 * approve a verification, or process a GDPR request.
 *
 * Pure, dependency-free: no React, no i18n, no data. `can(role, action)` is the
 * only gate. Services should ALSO enforce this server-side once the backend
 * lands — the UI gate is defence-in-depth, not the whole defence.
 */

export type AdminRole = 'owner' | 'support' | 'trust_safety' | 'finance' | 'readonly';

/**
 * The set of gated actions across the cockpit. Named `domain.verb` so a new
 * screen adds its verbs without colliding. Read access to the command view is
 * implicit for every role and therefore not listed here.
 */
export type AdminAction =
  // Revenue ops (T-OC-8)
  | 'revenue.view'
  | 'revenue.refund'
  | 'revenue.comp'
  | 'revenue.cancel'
  | 'revenue.retry_payment'
  // Feature flags (T-OC-9)
  | 'flags.view'
  | 'flags.toggle'
  // GDPR queue (T-OC-14)
  | 'gdpr.view'
  | 'gdpr.export'
  | 'gdpr.erase'
  // Trust & safety (T-OC-6)
  | 'safety.view'
  | 'safety.resolve'
  // Verification (T-OC-7)
  | 'verification.view'
  | 'verification.decide'
  // Team (T-OC-18)
  | 'team.manage';

/** Every action, in a stable order (used for the readonly = {} default). */
export const ADMIN_ACTIONS: AdminAction[] = [
  'revenue.view',
  'revenue.refund',
  'revenue.comp',
  'revenue.cancel',
  'revenue.retry_payment',
  'flags.view',
  'flags.toggle',
  'gdpr.view',
  'gdpr.export',
  'gdpr.erase',
  'safety.view',
  'safety.resolve',
  'verification.view',
  'verification.decide',
  'team.manage',
];

/**
 * Role → allowed actions. `owner` gets everything (denoted by '*' below and
 * expanded in `can`). Every other role gets an explicit allow-list — deny by
 * default, so forgetting to add a new action to a role fails closed.
 *
 * Mapping follows plan 07 §8:
 *  - support: SupportDesk + GDPR, read command. No revenue, no verification.
 *  - trust_safety: Safety + Verification full, read command. No revenue/comms.
 *  - finance: Revenue full, read command. Nothing content-adjacent.
 *  - readonly: command + queue reads only; zero mutations.
 */
const ROLE_ACTIONS: Record<Exclude<AdminRole, 'owner'>, AdminAction[]> = {
  support: ['gdpr.view', 'gdpr.export', 'gdpr.erase', 'safety.view', 'flags.view'],
  trust_safety: [
    'safety.view',
    'safety.resolve',
    'verification.view',
    'verification.decide',
    'flags.view',
  ],
  finance: [
    'revenue.view',
    'revenue.refund',
    'revenue.comp',
    'revenue.cancel',
    'revenue.retry_payment',
    'flags.view',
  ],
  // readonly can only see; the *.view actions it needs are granted read-only
  // (view yes, mutate no).
  readonly: ['revenue.view', 'flags.view', 'gdpr.view', 'safety.view', 'verification.view'],
};

/** Human-readable role label (NL primary, plan-07 cockpit copy). */
export const ADMIN_ROLE_LABELS: Record<AdminRole, { nl: string; en: string }> = {
  owner: { nl: 'Eigenaar', en: 'Owner' },
  support: { nl: 'Support', en: 'Support' },
  trust_safety: { nl: 'Veiligheid', en: 'Trust & safety' },
  finance: { nl: 'Financiën', en: 'Finance' },
  readonly: { nl: 'Alleen-lezen', en: 'Read-only' },
};

/**
 * Can `role` perform `action`? Owner is allowed everything; every other role is
 * checked against its explicit allow-list (deny by default).
 */
export function can(role: AdminRole, action: AdminAction): boolean {
  if (role === 'owner') return true;
  const allowed = ROLE_ACTIONS[role];
  return allowed ? allowed.includes(action) : false;
}

/** Convenience: is this a read-only advisor (no mutations anywhere)? */
export function isReadonly(role: AdminRole): boolean {
  return role === 'readonly';
}

/**
 * The demo cockpit runs as the founder → owner. Real role resolution arrives
 * with `admin_roles` + auth (plan 07 §8); until then this is the single source
 * every page reads, so swapping it later touches one line.
 */
export const DEMO_ADMIN_ROLE: AdminRole = 'owner';

/** Resolve the current admin role. Mock: always the founder (owner). */
export function currentAdminRole(): AdminRole {
  return DEMO_ADMIN_ROLE;
}

export default { can, isReadonly, currentAdminRole, ADMIN_ACTIONS, ADMIN_ROLE_LABELS };
