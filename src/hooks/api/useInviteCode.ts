
import { useOptimizedState } from '@/hooks/performance/useOptimizedComponents';
import { inviteCodeService, InviteCodeValidationResult } from "@/services/api";

export const useInviteCode = () => {
  const [isValidating, setIsValidating] = useOptimizedState(false);
  const [validationResult, setValidationResult] = useOptimizedState<InviteCodeValidationResult | null>(null);

  const validateCode = async (code: string): Promise<InviteCodeValidationResult> => {
    setIsValidating(true);
    try {
      const result = await inviteCodeService.validateInviteCode(code);
      setValidationResult(result);
      return result;
    } finally {
      setIsValidating(false);
    }
  };

  const clearValidation = () => {
    setValidationResult(null);
  };

  return {
    validateCode,
    clearValidation,
    isValidating,
    validationResult,
  };
};
