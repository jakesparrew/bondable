import { useState, useCallback } from 'react';
import { useForm, UseFormProps, FieldValues, SubmitHandler } from 'react-hook-form';

export interface FormModalConfig<TData extends FieldValues = FieldValues> {
  // Form configuration
  formOptions?: UseFormProps<TData>;
  
  // Modal behavior
  closeOnSuccess?: boolean;
  resetOnClose?: boolean;
  resetOnSuccess?: boolean;
  
  // Validation
  validateOnSubmit?: boolean;
  
  // Callbacks
  onSubmit?: SubmitHandler<TData>;
  onSuccess?: (data: TData, result?: any) => void;
  onError?: (error: any, data: TData) => void;
  onClose?: () => void;
}

export interface FormModalState {
  isOpen: boolean;
  isSubmitting: boolean;
  submitError: string | null;
}

export interface FormModalActions {
  open: () => void;
  close: () => void;
  handleSubmit: () => void;
  clearError: () => void;
  reset: () => void;
}

/**
 * Hook for managing dialog + form combinations
 * Provides common patterns for modal forms with validation and state management
 */
export function useFormModal<TData extends FieldValues = FieldValues>(
  config: FormModalConfig<TData> = {}
) {
  const {
    formOptions = {},
    closeOnSuccess = true,
    resetOnClose = true,
    resetOnSuccess = false,
    validateOnSubmit = true,
    onSubmit,
    onSuccess,
    onError,
    onClose,
  } = config;

  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form setup
  const form = useForm<TData>(formOptions);
  const { handleSubmit: rhfHandleSubmit, reset: rhfReset, formState } = form;

  // Clear error when form changes
  const clearError = useCallback(() => {
    setSubmitError(null);
  }, []);

  // Open modal
  const open = useCallback(() => {
    setIsOpen(true);
    clearError();
  }, [clearError]);

  // Close modal
  const close = useCallback(() => {
    setIsOpen(false);
    if (resetOnClose) {
      rhfReset();
    }
    clearError();
    onClose?.();
  }, [resetOnClose, rhfReset, clearError, onClose]);

  // Reset form
  const reset = useCallback(() => {
    rhfReset();
    clearError();
  }, [rhfReset, clearError]);

  // Handle form submission
  const handleSubmit = useCallback(() => {
    if (!onSubmit) {
      console.warn('useFormModal: No onSubmit handler provided');
      return;
    }

    return rhfHandleSubmit(async (data: TData) => {
      if (isSubmitting) return;

      setIsSubmitting(true);
      clearError();

      try {
        const result = await onSubmit(data);
        
        // Handle success
        onSuccess?.(data, result);
        
        if (resetOnSuccess) {
          rhfReset();
        }
        
        if (closeOnSuccess) {
          setIsOpen(false);
        }
        
        console.log('✅ Form submitted successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Submission failed';
        setSubmitError(errorMessage);
        onError?.(error, data);
        console.error('❌ Form submission failed:', error);
      } finally {
        setIsSubmitting(false);
      }
    }, (errors) => {
      if (validateOnSubmit) {
        const firstError = Object.values(errors)[0]?.message;
        if (firstError) {
          setSubmitError(firstError as string);
        }
      }
      console.warn('Form validation errors:', errors);
    })();
  }, [
    onSubmit,
    isSubmitting,
    clearError,
    rhfHandleSubmit,
    onSuccess,
    onError,
    resetOnSuccess,
    closeOnSuccess,
    validateOnSubmit,
    rhfReset,
  ]);

  return {
    // Form methods and state
    form,
    formState,
    
    // Modal state
    state: {
      isOpen,
      isSubmitting,
      submitError,
    } as FormModalState,
    
    // Actions
    actions: {
      open,
      close,
      handleSubmit,
      clearError,
      reset,
    } as FormModalActions,
    
    // Convenience props for dialog components
    dialogProps: {
      open: isOpen,
      onOpenChange: (open: boolean) => {
        if (open) {
          // Only allow opening via the open() method
          return;
        } else {
          close();
        }
      },
    },
    
    // Convenience props for form components
    formProps: {
      onSubmit: handleSubmit,
      disabled: isSubmitting,
    },
  };
}

/**
 * Utility hook for simple confirmation dialogs
 */
export function useConfirmationModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const confirm = useCallback((action: () => void) => {
    setPendingAction(() => action);
    setIsOpen(true);
  }, []);

  const handleConfirm = useCallback(() => {
    if (pendingAction) {
      pendingAction();
    }
    setIsOpen(false);
    setPendingAction(null);
  }, [pendingAction]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    setPendingAction(null);
  }, []);

  return {
    isOpen,
    confirm,
    handleConfirm,
    handleCancel,
    dialogProps: {
      open: isOpen,
      onOpenChange: (open: boolean) => {
        if (!open) {
          handleCancel();
        }
      },
    },
  };
}