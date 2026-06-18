import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { QuestionRow, QuestionOption, QuestionConfig, QuestionType } from "@/types/intake";

export function QuestionEditor({ q, onChange }: { q: QuestionRow; onChange: (patch: Partial<QuestionRow>) => void }) {
  const { t } = useTranslation();

  const setText     = (v: string) => onChange({ question_text: v });
  const setHelp     = (v: string) => onChange({ help_text: v || null });
  const setRequired = (b: boolean) => onChange({ is_required: b });

  return (
    <div className="space-y-3">
      <Input value={q.question_text}            onChange={(e) => setText(e.target.value)}    placeholder={t("intake:question_text")} />
      <Textarea value={q.help_text ?? ""}       onChange={(e) => setHelp(e.target.value)}    placeholder={t("intake:help_text")} />
      <div className="flex items-center gap-2">
        <Switch checked={q.is_required} onCheckedChange={setRequired} />
        <span className="text-xs text-gray-300">{t("intake:required")}</span>
      </div>

      {q.question_type === "number"   && <NumberConfig q={q} onChange={onChange} />}
      {q.question_type === "radio"    && <OptionsConfig q={q} onChange={onChange} />}
      {q.question_type === "checkbox" && <OptionsConfig q={q} onChange={onChange} />}
      {/* text and date need no extra config in v1 */}
    </div>
  );
}

function NumberConfig({ q, onChange }: { q: QuestionRow; onChange: (patch: Partial<QuestionRow>) => void }) {
  const { t } = useTranslation();
  const cfg = (q.config as QuestionConfig | null) ?? {};
  const set = (patch: Partial<QuestionConfig>) => onChange({ config: { ...cfg, ...patch } as any });

  return (
    <div className="flex gap-2">
      <Input type="number" value={cfg.min ?? ""} onChange={(e) => set({ min: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder={t("intake:min")} />
      <Input type="number" value={cfg.max ?? ""} onChange={(e) => set({ max: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder={t("intake:max")} />
    </div>
  );
}

function OptionsConfig({ q, onChange }: { q: QuestionRow; onChange: (patch: Partial<QuestionRow>) => void }) {
  const { t } = useTranslation();
  const options = (q.options as QuestionOption[] | null) ?? [];

  const setLabel = (i: number, label: string) => {
    const next = options.slice();
    next[i] = { ...next[i], label };
    onChange({ options: next as any });
  };
  const add = () => onChange({ options: [...options, { id: crypto.randomUUID(), label: t("intake:option_label") + ` ${options.length + 1}` }] as any });
  const remove = (i: number) => onChange({ options: options.filter((_, idx) => idx !== i) as any });

  return (
    <div className="space-y-2">
      {options.map((o, i) => (
        <div key={o.id} className="flex gap-2">
          <Input value={o.label} onChange={(e) => setLabel(i, e.target.value)} />
          <Button variant="outline" size="sm" onClick={() => remove(i)}>{t("intake:remove_option")}</Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add}>+ {t("intake:add_option")}</Button>
    </div>
  );
}
