import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { useIntakeTemplate, useUpdateTemplate, useIntakeQuestions, useQuestionMutations } from "@/hooks/api/useIntakeTemplates";
import { QuestionCard } from "@/components/intake/QuestionCard";
import { QuestionTypePicker } from "@/components/intake/QuestionTypePicker";
import type { QuestionType, QuestionRow } from "@/types/intake";

const AUTOSAVE_MS = 500;

export default function IntakeTemplateBuilderPage() {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthManager();
  const therapistId = user?.id ?? "";
  const { data: tpl, isLoading } = useIntakeTemplate(id);
  const updateMut = useUpdateTemplate(therapistId);
  const { data: questions = [] } = useIntakeQuestions(id);
  const qmut = useQuestionMutations(id);

  const addQuestion = async (type: QuestionType) => {
    await qmut.create.mutateAsync({
      template_id: id,
      question_text: "",
      question_type: type,
      position: questions.length,
      is_required: false,
      options: type === "radio" || type === "checkbox" ? [{ id: crypto.randomUUID(), label: "Option 1" }] : null,
      config: type === "number" ? { min: 0, max: 100 } : null,
    });
  };

  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingRef = useRef<Record<string, any>>({});

  const updateQuestion = (qid: string, patch: Partial<QuestionRow>) => {
    pendingRef.current[qid] = { ...(pendingRef.current[qid] ?? {}), ...patch };
    clearTimeout(debounceRef.current[qid]);
    debounceRef.current[qid] = setTimeout(async () => {
      const merged = pendingRef.current[qid];
      delete pendingRef.current[qid];
      await qmut.update.mutateAsync({ id: qid, patch: merged });
    }, 250);
  };
  const deleteQuestion = (qid: string) => qmut.remove.mutateAsync(qid);

  const moveQuestion = async (qid: string, dir: "up" | "down") => {
    const idx = questions.findIndex(q => q.id === qid);
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= questions.length) return;
    const a = questions[idx], b = questions[swap];
    await qmut.reorder.mutateAsync([
      { id: a.id, position: b.position },
      { id: b.id, position: a.position },
    ]);
  };

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Load server state into local state
  useEffect(() => {
    if (!tpl) return;
    setTitle(tpl.title);
    setDescription(tpl.description ?? "");
    setCategory(tpl.category ?? "");
    setIsPublished(tpl.is_published);
  }, [tpl?.id]);

  // Debounced auto-save for title/description/category/publish
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const patch = useMemo(() => ({ title, description: description || null, category: category || null, is_published: isPublished }), [title, description, category, isPublished]);

  useEffect(() => {
    if (!tpl) return;
    // Skip initial sync (when local state just loaded from server)
    const unchanged =
      patch.title === tpl.title &&
      (patch.description ?? null) === (tpl.description ?? null) &&
      (patch.category ?? null)    === (tpl.category ?? null) &&
      patch.is_published          === tpl.is_published;
    if (unchanged) return;

    dirtyRef.current = true;
    setSaveState("saving");
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        await updateMut.mutateAsync({ id, patch });
        dirtyRef.current = false;
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, AUTOSAVE_MS);
    return () => clearTimeout(timerRef.current);
  }, [patch, tpl?.id, tpl?.title, tpl?.description, tpl?.category, tpl?.is_published]);

  if (isLoading) return <DashboardLayout><p className="p-6 text-gray-400">{t("intake:saving")}</p></DashboardLayout>;
  if (!tpl)     return <DashboardLayout><p className="p-6 text-gray-400">Not found</p></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate("/dashboard/therapist/intake-forms")}>←</Button>
          <span className="text-xs text-gray-400">
            {saveState === "saving" && t("intake:saving")}
            {saveState === "saved"  && `✓ ${t("intake:saved")}`}
            {saveState === "error"  && t("intake:save_failed")}
          </span>
        </div>

        <Card className="bg-[#111] border-[#1f1f23]">
          <CardContent className="p-5 space-y-3">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("intake:template_title")} />
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t("intake:template_category")} />
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("intake:template_description")} />
            <div className="flex items-center gap-2">
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
              <span className="text-sm text-gray-300">{isPublished ? t("intake:published") : t("intake:draft")}</span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          {questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              q={q}
              onChange={(patch) => updateQuestion(q.id, patch)}
              onDelete={() => deleteQuestion(q.id)}
              onMove={(dir) => moveQuestion(q.id, dir)}
              isFirst={i === 0}
              isLast={i === questions.length - 1}
            />
          ))}
          <div className="pt-2">
            <QuestionTypePicker onPick={addQuestion} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
