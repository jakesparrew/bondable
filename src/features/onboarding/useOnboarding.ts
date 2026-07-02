/**
 * useOnboarding — reactive wrapper over onboardingService for the current
 * demo role. No global provider needed: each consumer subscribes to its role.
 */

import { useCallback, useState } from 'react';
import { onboardingService, stepsFor } from './onboardingService';
import type { OnboardingProgress, OnboardingRole } from './types';

export function useOnboarding(role: OnboardingRole) {
  const [progress, setProgress] = useState<OnboardingProgress>(() =>
    onboardingService.getProgress(role),
  );

  const refresh = useCallback(() => {
    setProgress(onboardingService.getProgress(role));
  }, [role]);

  const setStep = useCallback(
    (key: string, done = true) => {
      onboardingService.setStep(role, key, done);
      refresh();
    },
    [role, refresh],
  );

  const dismiss = useCallback(() => {
    onboardingService.dismiss(role);
    refresh();
  }, [role, refresh]);

  const steps = stepsFor(role);
  const doneCount = steps.filter((s) => progress.steps[s.key]).length;

  return {
    progress,
    steps,
    doneCount,
    total: steps.length,
    activated: progress.activatedAt != null,
    setStep,
    dismiss,
    refresh,
  };
}
