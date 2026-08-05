/**
 * Monetization component library (tickets T-MG-5/6). Dormant + all-unlocked-aware
 * in Phase 3; Stripe flips it live in Phase 4.
 *
 * Design grammar: quiet-keyline, no mint (AI-only), no lock icons, no blur, no
 * gradients, no red, zero exclamation marks. Every upgrade nudge is NON-MODAL
 * (ruling R15) and governed by `nudgeService`.
 */
export { ProBadge, default as ProBadgeDefault } from './ProBadge';
export { FeaturePeek } from './FeaturePeek';
export { UpgradeMoment } from './UpgradeMoment';
export { UsageMeter } from './UsageMeter';
export { NudgeStrip } from './NudgeStrip';
export { default as TrialBanner } from './TrialBanner';
export {
  UPGRADE_COPY,
  interpolate,
  type UpgradeMomentId,
  type UpgradeCopy,
} from './upgradeCopy';
