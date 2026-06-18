import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import BaseDialog from "./BaseDialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface FormField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  component?: React.ComponentType<{
    value?: unknown;
    onChange?: (value: unknown) => void;
    placeholder?: string;
    [key: string]: unknown;
  }>;
  props?: Record<string, unknown>;
  validation?: (value: unknown) => string | null;
}

interface FormDialogProps {
  trigger?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: FormField[];
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => Promise<any>;
  submitButtonText?: string;
  mutationKey?: string[];
  invalidateQueries?: string[][];
  className?: string;
  loadingText?: string;
  successMessage?: string;
}

const FormDialog = ({
  trigger,
  open,
  onOpenChange,
  title,
  description,
  fields,
  initialData = {},
  onSubmit,
  submitButtonText = "Save",
  mutationKey,
  invalidateQueries = [],
  className,
  loadingText,
  successMessage,
}: FormDialogProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, any>>(initialData);

  // Reset form data when dialog opens
  React.useEffect(() => {
    if (open) {
      setFormData(initialData);
    }
  }, [open, initialData]);

  const mutation = useMutation({
    mutationKey,
    mutationFn: onSubmit,
    onSuccess: (data) => {
      // Invalidate specified queries
      invalidateQueries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
      });
      
      if (successMessage) {
        toast.success(successMessage);
      }
      
      onOpenChange(false);
      setFormData({});
    },
    onError: (error: unknown) => {
      console.error("Form submission error:", error);
      const errorMessage = error instanceof Error ? error.message : 
                          (error && typeof error === 'object' && 'message' in error ? 
                           String((error as { message: unknown }).message) : 
                           "An error occurred. Please try again.");
      toast.error(errorMessage);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const missingFields = fields
      .filter(field => field.required && !formData[field.name]?.trim())
      .map(field => field.label);

    if (missingFields.length > 0) {
      toast.error(t("please_fill_in", { fields: missingFields.join(", ") }));
      return;
    }

    // Validate custom validation rules
    for (const field of fields) {
      if (field.validation) {
        const error = field.validation(formData[field.name]);
        if (error) {
          toast.error(error);
          return;
        }
      }
    }

    mutation.mutate(formData);
  };

  const handleFieldChange = (fieldName: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  const renderField = (field: FormField) => {
    const { component: Component, props = {}, ...fieldProps } = field;
    
    if (Component) {
      return (
        <Component
          key={field.name}
          value={formData[field.name] || ""}
          onChange={(e: unknown) => handleFieldChange(field.name, (e as Event & { target?: { value?: unknown } })?.target?.value || e)}
          {...fieldProps}
          {...props}
        />
      );
    }

    // Default input rendering based on type
    switch (field.type) {
      case "select":
        // This would need to be implemented with your Select component
        return null;
      case "textarea":
        // This would need to be implemented with your Textarea component
        return null;
      default:
        // This would need to be implemented with your Input component
        return null;
    }
  };

  return (
    <BaseDialog
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      className={className}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map(renderField)}
        
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {mutation.isPending ? (loadingText || t("saving")) : submitButtonText}
          </Button>
        </div>
      </form>
    </BaseDialog>
  );
};

export default FormDialog;