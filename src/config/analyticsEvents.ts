/**
 * analyticsEvents.ts — the single, typed registry of Bondable product-analytics
 * event names (ticket T-MG-2, ruling R12).
 *
 * This file is the CONTRACT. Every user-visible surface that emits analytics must
 * use a name from here; unknown names fail typecheck (that's the whole point of the
 * `AnalyticsEvent` union). The owner cockpit (plan 07) and the monetization layer
 * (plan 05) both read/emit through this same spine — there is never a second
 * registry. 08's PostHog EU is an optional later *sink* behind consent, using this
 * exact taxonomy.
 *
 * Naming convention (per §6 of docs/plan/05-monetization-growth.md):
 *   - snake_case
 *   - object_action order (e.g. `finder_request_sent`, not `sent_finder_request`)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HARD RULE — NO HEALTH DATA, EVER.
 * `properties` may carry only structural, non-clinical facts: ids, counts, enum
 * labels, booleans, durations, tier/channel strings. NEVER put free-text, message
 * bodies, journal content, check-in answers, diagnoses, note contents, or anything
 * that could reveal a person's mental-health state into an analytics property.
 * Monetization/product analytics must never mingle with GDPR Art. 9 health data.
 * `PROPERTY_KEYS` below is the allowlist that documents what each event may carry.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * The canonical event registry.
 *
 * Grouped by funnel to mirror §6 of the monetization plan. Adding an event here is
 * the only supported way to make it trackable — `analyticsService.track()` accepts
 * only members of the derived `AnalyticsEvent` union.
 */
export const ANALYTICS_EVENTS = {
  // ── Acquisition ──────────────────────────────────────────────────────────
  signup_started: 'signup_started',
  signup_completed: 'signup_completed',
  finder_search: 'finder_search',
  finder_profile_view: 'finder_profile_view',
  finder_request_sent: 'finder_request_sent',

  // ── Activation — provider ────────────────────────────────────────────────
  onboarding_step_done: 'onboarding_step_done',
  provider_activated: 'provider_activated',
  first_client_invited: 'first_client_invited',
  first_session_created: 'first_session_created',
  finder_profile_published: 'finder_profile_published',
  session_created: 'session_created',
  task_assigned: 'task_assigned',

  // ── Activation — client ──────────────────────────────────────────────────
  client_activated: 'client_activated',
  invite_accepted: 'invite_accepted',
  first_bond_message: 'first_bond_message',
  first_task_completed: 'first_task_completed',
  first_journal_entry: 'first_journal_entry',

  // ── Bond (AI companion) ──────────────────────────────────────────────────
  bond_message_sent: 'bond_message_sent',
  bond_crisis_triggered: 'bond_crisis_triggered',

  // ── Monetization ─────────────────────────────────────────────────────────
  trial_started: 'trial_started',
  trial_day_10: 'trial_day_10',
  feature_peek_viewed: 'feature_peek_viewed',
  gate_hit: 'gate_hit',
  nudge_shown: 'nudge_shown',
  nudge_clicked: 'nudge_clicked',
  nudge_dismissed: 'nudge_dismissed',
  upgrade_viewed: 'upgrade_viewed',
  checkout_started: 'checkout_started',
  subscription_created: 'subscription_created',
  subscription_upgraded: 'subscription_upgraded',
  subscription_canceled: 'subscription_canceled',
  payment_failed: 'payment_failed',

  // ── Growth ───────────────────────────────────────────────────────────────
  invite_sent: 'invite_sent',
  invite_accepted_referral: 'invite_accepted_referral',
  referral_converted: 'referral_converted',
  seat_invited: 'seat_invited',
  seat_activated: 'seat_activated',
  lead_received: 'lead_received',
  lead_accepted: 'lead_accepted',
  lead_responded: 'lead_responded',
} as const;

/**
 * The union of every valid event name. Passing a string that is not one of these
 * to `analyticsService.track()` is a compile error — typos never reach production.
 */
export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/**
 * Documentation-level allowlist: which property keys each event is permitted to
 * carry. This is intentionally a `Record` of string arrays (not a per-event typed
 * payload) so it can be read by humans, tests, and a future schema linter without
 * over-constraining callers during the mock phase.
 *
 * REMINDER: every key listed here must be structural/non-clinical. If a proposed
 * key could describe a person's health, it does not belong in analytics — full stop.
 */
export const PROPERTY_KEYS: Record<AnalyticsEvent, readonly string[]> = {
  // Acquisition
  signup_started: ['role', 'channel'],
  signup_completed: ['role', 'channel', 'referral_code'],
  finder_search: ['specialty', 'language', 'modality', 'location', 'accepting_new', 'result_count'],
  finder_profile_view: ['provider_id', 'source'],
  finder_request_sent: ['provider_id', 'is_regulated'],

  // Activation — provider
  onboarding_step_done: ['step', 'role'],
  provider_activated: ['provider_id', 'days_to_activate'],
  first_client_invited: ['provider_id'],
  first_session_created: ['provider_id'],
  finder_profile_published: ['provider_id', 'provider_type'],
  session_created: ['provider_id', 'is_recurring'],
  task_assigned: ['provider_id', 'client_ref'],

  // Activation — client
  client_activated: ['provider_id', 'active_count'],
  invite_accepted: ['provider_id', 'kind'],
  first_bond_message: ['client_ref'],
  first_task_completed: ['client_ref'],
  first_journal_entry: ['client_ref'],

  // Bond
  bond_message_sent: ['client_ref', 'turn_index'],
  bond_crisis_triggered: ['client_ref', 'guardrail'],

  // Monetization
  trial_started: ['tier'],
  trial_day_10: ['tier', 'days_left'],
  feature_peek_viewed: ['feature'],
  gate_hit: ['feature'],
  nudge_shown: ['trigger'],
  nudge_clicked: ['trigger'],
  nudge_dismissed: ['trigger'],
  upgrade_viewed: ['source', 'tier'],
  checkout_started: ['tier', 'interval'],
  subscription_created: ['tier', 'interval', 'seats', 'mrr_eur'],
  subscription_upgraded: ['from_tier', 'to_tier', 'interval'],
  subscription_canceled: ['tier', 'reason'],
  payment_failed: ['tier'],

  // Growth
  invite_sent: ['kind', 'provider_id'],
  invite_accepted_referral: ['referral_code'],
  referral_converted: ['referral_code'],
  seat_invited: ['org_id'],
  seat_activated: ['org_id'],
  lead_received: ['provider_id'],
  lead_accepted: ['provider_id'],
  lead_responded: ['provider_id', 'hours_to_response'],
} as const;

/**
 * Loose property bag for a tracked event. Values are limited to primitives by
 * convention; the NO-HEALTH-DATA rule above is the binding constraint on what may
 * appear here — this type does not (and cannot) enforce it, humans and review do.
 */
export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

/** Runtime guard — true when `name` is a registered event. */
export const isKnownEvent = (name: string): name is AnalyticsEvent =>
  Object.prototype.hasOwnProperty.call(ANALYTICS_EVENTS, name);
