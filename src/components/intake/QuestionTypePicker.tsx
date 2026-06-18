import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import type { QuestionType } from "@/types/intake";

const TYPES: QuestionType[] = ["number", "radio", "checkbox", "text", "date"];

export function QuestionTypePicker({ onPick }: { onPick: (t: QuestionType) => void }) {
  const { t } = useTranslation();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="border-dashed">+ {t("intake:add_question")}</Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1">
        <div className="flex flex-col">
          {TYPES.map((type) => (
            <Button key={type} variant="ghost" className="justify-start" onClick={() => onPick(type)}>
              {t(`intake:type_${type}`)}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
