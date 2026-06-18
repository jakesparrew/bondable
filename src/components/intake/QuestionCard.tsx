import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { QuestionRow } from "@/types/intake";
import { QuestionEditor } from "@/components/intake/QuestionEditor";

export function QuestionCard({
  q,
  onChange,
  onDelete,
  onMove,
  isFirst,
  isLast,
}: {
  q: QuestionRow;
  onChange: (patch: Partial<QuestionRow>) => void;
  onDelete: () => void;
  onMove: (dir: "up" | "down") => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">{q.position + 1}.</span>
          <div className="flex-1 text-sm text-foreground cursor-pointer truncate" onClick={() => setOpen(!open)}>
            {q.question_text || <span className="text-muted-foreground">({t("intake:question_text")})</span>}
          </div>
          <Badge variant="outline">{t(`intake:type_${q.question_type}`)}</Badge>
          {q.is_required && <Badge>{t("intake:required")}</Badge>}
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" disabled={isFirst} onClick={() => onMove("up")}>↑</Button>
            <Button size="icon" variant="ghost" disabled={isLast} onClick={() => onMove("down")}>↓</Button>
            <Button size="icon" variant="ghost" onClick={() => setOpen(!open)}>{open ? "▾" : "▸"}</Button>
            <Button size="icon" variant="ghost" onClick={onDelete}>✕</Button>
          </div>
        </div>
        {open && (
          <div className="mt-3 border-t border-border pt-3">
            <QuestionEditor q={q} onChange={onChange} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
