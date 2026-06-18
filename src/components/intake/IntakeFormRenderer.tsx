import { useTranslation } from "react-i18next";
import type { SnapshotQuestion, Answer, QuestionOption } from "@/types/intake";

export function IntakeFormRenderer({
  snapshot, responses,
}: { snapshot: SnapshotQuestion[]; responses: Record<string, Answer> }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      {snapshot.map((q) => {
        const ans = responses[q.id];
        return (
          <div key={q.id} className="border border-[#1f1f23] rounded p-3">
            <div className="text-sm text-white mb-1">{q.question_text}{q.is_required && " *"}</div>
            {q.help_text && <div className="text-xs text-gray-500 mb-2">{q.help_text}</div>}
            <div className="text-sm text-gray-300">
              {!ans ? <span className="text-gray-600">—</span>
                : q.question_type === "number"   ? (ans as any).value
                : q.question_type === "text"     ? (ans as any).value
                : q.question_type === "date"     ? (ans as any).value
                : q.question_type === "radio"    ? q.options?.find((o) => o.id === (ans as any).optionId)?.label ?? "—"
                : q.question_type === "checkbox" ? (((ans as any).optionIds ?? []) as string[]).map((id) => q.options?.find((o: QuestionOption) => o.id === id)?.label).filter(Boolean).join(", ") || "—"
                : "—"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
