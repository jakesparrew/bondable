import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { SnapshotQuestion, Answer } from "@/types/intake";

export function QuestionInput({
  q, value, onChange, invalid,
}: { q: SnapshotQuestion; value: Answer | undefined; onChange: (a: Answer) => void; invalid?: boolean }) {
  const ringClass = invalid ? "ring-1 ring-red-500" : "";

  if (q.question_type === "text") {
    const v = (value as any)?.value ?? "";
    return <Textarea value={v} onChange={(e) => onChange({ value: e.target.value })} className={ringClass} />;
  }
  if (q.question_type === "number") {
    const v = (value as any)?.value ?? "";
    const min = q.config?.min, max = q.config?.max;
    return <Input type="number" min={min} max={max} value={v} onChange={(e) => onChange({ value: Number(e.target.value) })} className={ringClass} />;
  }
  if (q.question_type === "date") {
    const v = (value as any)?.value ?? "";
    return <Input type="date" value={v} onChange={(e) => onChange({ value: e.target.value })} className={ringClass} />;
  }
  if (q.question_type === "radio") {
    const v = (value as any)?.optionId ?? "";
    return (
      <RadioGroup value={v} onValueChange={(val) => onChange({ optionId: val })}>
        {(q.options ?? []).map((o) => (
          <div key={o.id} className="flex items-center gap-2">
            <RadioGroupItem value={o.id} id={`${q.id}-${o.id}`} />
            <label htmlFor={`${q.id}-${o.id}`} className="text-sm text-gray-200">{o.label}</label>
          </div>
        ))}
      </RadioGroup>
    );
  }
  if (q.question_type === "checkbox") {
    const ids: string[] = (value as any)?.optionIds ?? [];
    const toggle = (oid: string) => {
      const next = ids.includes(oid) ? ids.filter((x) => x !== oid) : [...ids, oid];
      onChange({ optionIds: next });
    };
    return (
      <div className="space-y-1">
        {(q.options ?? []).map((o) => (
          <div key={o.id} className="flex items-center gap-2">
            <Checkbox checked={ids.includes(o.id)} onCheckedChange={() => toggle(o.id)} id={`${q.id}-${o.id}`} />
            <label htmlFor={`${q.id}-${o.id}`} className="text-sm text-gray-200">{o.label}</label>
          </div>
        ))}
      </div>
    );
  }
  return null;
}
