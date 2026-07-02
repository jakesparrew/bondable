/**
 * Onboarding types (Phase 2 / docs/plan/06). Activation definitions are
 * versioned + contractual per master-plan ruling R21 and consumed verbatim by
 * the owner cockpit later.
 */

export type OnboardingRole = 'provider' | 'client';

export interface StepDef {
  key: string;
  /** NL default label (rendered via t(labelKey, labelDefault)). */
  labelKey: string;
  labelDefault: string;
  /** Short helper line. */
  hintKey: string;
  hintDefault: string;
  /** Route the step's action links to (optional). */
  to?: string;
}

export interface OnboardingProgress {
  role: OnboardingRole;
  steps: Record<string, boolean>;
  dismissed: boolean;
  welcomeSeen: boolean;
  activatedAt: string | null;
}
