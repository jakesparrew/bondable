import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { intakeService } from "@/services/api/intakeService";
import type { Answer } from "@/types/intake";

const keys = {
  forClient:     (clientId: string)   => ["intake", "assignments", "client", clientId] as const,
  forSelf:       ()                   => ["intake", "assignments", "self"] as const,
  one:           (id: string)         => ["intake", "assignment", id] as const,
  responses:     (id: string)         => ["intake", "assignment", id, "responses"] as const,
};

export function useAssignmentsForClient(clientId: string) {
  return useQuery({
    queryKey: keys.forClient(clientId),
    queryFn: () => intakeService.listAssignmentsForClient(clientId),
    enabled: !!clientId,
  });
}

export function useAssignmentsForSelf() {
  return useQuery({
    queryKey: keys.forSelf(),
    queryFn: () => intakeService.listAssignmentsForSelf(),
  });
}

export function useAssignment(id: string) {
  return useQuery({
    queryKey: keys.one(id),
    queryFn: () => intakeService.getAssignment(id),
    enabled: !!id,
  });
}

export function useAssignmentResponses(id: string) {
  return useQuery({
    queryKey: keys.responses(id),
    queryFn: () => intakeService.listResponses(id),
    enabled: !!id,
  });
}

export function useAssignTemplate(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) => intakeService.assignTemplate(templateId, clientId),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.forClient(clientId) }),
  });
}

export function useUpsertResponse(assignmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, answer }: { questionId: string; answer: Answer }) =>
      intakeService.upsertResponse(assignmentId, questionId, answer),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.responses(assignmentId) });
      qc.invalidateQueries({ queryKey: keys.one(assignmentId) });
      qc.invalidateQueries({ queryKey: keys.forSelf() });
    },
  });
}

export function useSubmitAssignment(assignmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => intakeService.submit(assignmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.one(assignmentId) });
      qc.invalidateQueries({ queryKey: keys.forSelf() });
    },
  });
}
