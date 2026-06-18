import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { AssignTemplateDialog } from "@/components/intake/AssignTemplateDialog";
import { IntakeFormRenderer } from "@/components/intake/IntakeFormRenderer";
import {
  useAssignmentsForClient,
  useAssignment,
  useAssignmentResponses,
} from "@/hooks/api/useIntakeAssignments";
import type { Answer, SnapshotQuestion } from "@/types/intake";

export function ClientIntakeTab({ clientId }: { clientId: string }) {
  const { t } = useTranslation();
  const { data: assignments = [] } = useAssignmentsForClient(clientId);
  const [assignOpen, setAssignOpen] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setAssignOpen(true)}>{t("intake:assign_form")}</Button>
      </div>

      {assignments.length === 0 ? (
        <Card className="bg-[#111] border-[#1f1f23]"><CardContent className="p-6 text-center text-gray-400">{t("intake:no_assignments_client_provider")}</CardContent></Card>
      ) : assignments.map((a) => (
        <Card key={a.id} className="bg-[#111] border-[#1f1f23]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-sm text-white">{a.title_snapshot}</div>
              <div className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                <Badge>{t(`intake:status_${a.status}`)}</Badge>
                <span>{t("intake:assigned_at", { date: format(new Date(a.assigned_at), "PP") })}</span>
                {a.completed_at && <span>· {t("intake:completed_at", { date: format(new Date(a.completed_at), "PP") })}</span>}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setViewingId(a.id)}>{t("intake:view_answers")}</Button>
          </CardContent>
        </Card>
      ))}

      <AssignTemplateDialog clientId={clientId} open={assignOpen} onOpenChange={setAssignOpen} />
      {viewingId && <AnswersModal assignmentId={viewingId} onClose={() => setViewingId(null)} />}
    </div>
  );
}

function AnswersModal({ assignmentId, onClose }: { assignmentId: string; onClose: () => void }) {
  const { t } = useTranslation();
  const { data: a } = useAssignment(assignmentId);
  const { data: responseRows = [] } = useAssignmentResponses(assignmentId);

  const responses: Record<string, Answer> = {};
  for (const r of responseRows) responses[r.question_id] = r.answer as Answer;

  const snapshot = (a?.questions_snapshot as unknown as SnapshotQuestion[]) ?? [];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t("intake:view_answers")}</DialogTitle></DialogHeader>
        {a ? <IntakeFormRenderer snapshot={snapshot} responses={responses} /> : null}
      </DialogContent>
    </Dialog>
  );
}
