import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { intakeService } from "@/services/api/intakeService";
import type { TemplateRow } from "@/types/intake";

const keys = {
  list:   (therapistId: string)      => ["intake", "templates", therapistId] as const,
  one:    (id: string)               => ["intake", "template", id] as const,
  questions: (templateId: string)    => ["intake", "template", templateId, "questions"] as const,
};

export function useIntakeTemplates(therapistId: string) {
  return useQuery({
    queryKey: keys.list(therapistId),
    queryFn: () => intakeService.listTemplates(therapistId),
    enabled: !!therapistId,
  });
}

export function useIntakeTemplate(id: string) {
  return useQuery({
    queryKey: keys.one(id),
    queryFn: () => intakeService.getTemplate(id),
    enabled: !!id,
  });
}

export function useIntakeQuestions(templateId: string) {
  return useQuery({
    queryKey: keys.questions(templateId),
    queryFn: () => intakeService.listQuestions(templateId),
    enabled: !!templateId,
  });
}

export function useCreateTemplate(therapistId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; description?: string; category?: string }) =>
      intakeService.createTemplate({ therapist_id: therapistId, ...input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list(therapistId) }),
  });
}

export function useUpdateTemplate(therapistId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<TemplateRow, "title" | "description" | "category" | "is_published">> }) =>
      intakeService.updateTemplate(id, patch),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: keys.one(row.id) });
      qc.invalidateQueries({ queryKey: keys.list(therapistId) });
    },
  });
}

export function useDeleteTemplate(therapistId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => intakeService.deleteTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list(therapistId) }),
  });
}

export function useQuestionMutations(templateId: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: keys.questions(templateId) });

  const create = useMutation({ mutationFn: intakeService.createQuestion, onSuccess: invalidate });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof intakeService.updateQuestion>[1] }) =>
      intakeService.updateQuestion(id, patch),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: intakeService.deleteQuestion, onSuccess: invalidate });
  const reorder = useMutation({
    mutationFn: intakeService.reorderQuestions,
    onSuccess: invalidate,
  });

  return { create, update, remove, reorder };
}
