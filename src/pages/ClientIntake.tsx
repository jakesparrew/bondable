import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { QuestionInput } from "@/components/intake/QuestionInput";
import {
  useAssignmentsForSelf,
  useAssignment,
  useAssignmentResponses,
  useUpsertResponse,
  useSubmitAssignment,
} from "@/hooks/api/useIntakeAssignments";
import type { Answer, SnapshotQuestion } from "@/types/intake";

export default function ClientIntakePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const id = searchParams.get("id");
  return id ? <FillOut id={id} /> : <IntakeList onOpen={(aid) => setSearchParams({ id: aid })} />;
}

function IntakeList({ onOpen }: { onOpen: (id: string) => void }) {
  const { t } = useTranslation();
  const { data: assignments = [] } = useAssignmentsForSelf();
  return (
    <DashboardLayout>
      <div className="p-6 space-y-3 max-w-3xl mx-auto">
        <h1 className="text-2xl text-foreground font-semibold">{t("intake:title")}</h1>
        {assignments.length === 0 ? (
          <Card className="bg-card border-border"><CardContent className="p-6 text-center text-muted-foreground">{t("intake:no_assignments_client_self")}</CardContent></Card>
        ) : assignments.map((a) => (
          <Card key={a.id} className="bg-card border-border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-foreground">{a.title_snapshot}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                  <Badge>{t(`intake:status_${a.status}`)}</Badge>
                  <span>{t("intake:assigned_at", { date: format(new Date(a.assigned_at), "PP") })}</span>
                </div>
              </div>
              <Button variant="outline" onClick={() => onOpen(a.id)}>{t("intake:open")}</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}

function FillOut({ id }: { id: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: a } = useAssignment(id);
  const { data: responseRows = [] } = useAssignmentResponses(id);
  const upsert = useUpsertResponse(id);
  const submit = useSubmitAssignment(id);

  const snapshot: SnapshotQuestion[] = useMemo(() => (a?.questions_snapshot as any) ?? [], [a?.questions_snapshot]);
  const [draft, setDraft] = useState<Record<string, Answer>>({});
  const [missing, setMissing] = useState<Set<string>>(new Set());

  useEffect(() => {
    const init: Record<string, Answer> = {};
    for (const r of responseRows) init[r.question_id] = r.answer as Answer;
    setDraft(init);
  }, [responseRows.length, id]);

  const setAnswer = (qid: string, ans: Answer) => {
    setDraft((prev) => ({ ...prev, [qid]: ans }));
    upsert.mutate({ questionId: qid, answer: ans });
  };

  const onSubmit = async () => {
    try {
      await submit.mutateAsync();
      navigate("/dashboard/client/intake");
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      const marker = "missing_required_answers:";
      if (msg.includes(marker)) {
        const ids = msg.split(marker)[1].trim().split(",").filter(Boolean);
        setMissing(new Set(ids));
      }
    }
  };

  if (!a) return <DashboardLayout><p className="p-6 text-muted-foreground">{t("intake:saving")}</p></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate("/dashboard/client/intake")}>←</Button>
          <Badge>{t(`intake:status_${a.status}`)}</Badge>
        </div>
        <h1 className="text-xl text-foreground font-semibold">{a.title_snapshot}</h1>
        {a.description_snapshot && <p className="text-sm text-muted-foreground">{a.description_snapshot}</p>}

        {missing.size > 0 && (
          <div className="rounded border border-red-700 bg-red-900/20 p-3 text-sm text-red-300">
            {t("intake:submit_missing_required")}
          </div>
        )}

        <div className="space-y-4">
          {snapshot.map((q) => (
            <Card key={q.id} className={`bg-card border ${missing.has(q.id) ? "border-red-700" : "border-border"}`}>
              <CardContent className="p-4 space-y-2">
                <div className="text-sm text-foreground">{q.question_text}{q.is_required && " *"}</div>
                {q.help_text && <div className="text-xs text-muted-foreground">{q.help_text}</div>}
                <QuestionInput q={q} value={draft[q.id]} onChange={(ans) => setAnswer(q.id, ans)} invalid={missing.has(q.id)} />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => navigate("/dashboard/client/intake")}>{t("intake:save_and_close")}</Button>
          <Button onClick={onSubmit} disabled={submit.isPending}>{submit.isPending ? t("intake:saving") : t("intake:submit")}</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
