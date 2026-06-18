import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight, ChevronRight as Arrow, ClipboardCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { useOptimizedTasks } from "@/hooks/api/useOptimizedTasks";
import type { TaskWithProfiles } from "@/services/api/TaskService";

type TaskStatus = "assigned" | "in_progress" | "completed" | "denied";

const OPEN_STATES = new Set<TaskStatus>(["assigned", "in_progress"]);

const STATUS_BADGE: Record<TaskStatus, string> = {
  assigned: "border-primary/30 bg-secondary text-primary",
  in_progress: "border-mint/30 bg-mint/15 text-mint",
  completed: "border-border bg-muted text-muted-foreground",
  denied: "border-destructive/30 bg-destructive/15 text-destructive",
};

const statusKey = (status: string) => `task_status_${status}` as const;

/**
 * "My Homework" panel — the client's assigned tasks, styled to mirror the
 * therapist's ActiveClientsTable. Driven by useOptimizedTasks('client').
 */
const MyHomework = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuthManager();
  const { tasks, isLoading } = useOptimizedTasks("client", user?.id ?? "");
  const [onlyOpen, setOnlyOpen] = useState(false);

  const rows = useMemo(() => {
    const all = (tasks ?? []) as TaskWithProfiles[];
    const filtered = onlyOpen
      ? all.filter((task) => OPEN_STATES.has(task.status as TaskStatus))
      : all;
    // Open tasks first, then by due date ascending.
    return [...filtered].sort((a, b) => {
      const aOpen = OPEN_STATES.has(a.status as TaskStatus) ? 0 : 1;
      const bOpen = OPEN_STATES.has(b.status as TaskStatus) ? 0 : 1;
      if (aOpen !== bOpen) return aOpen - bOpen;
      return (a.due_date ?? "").localeCompare(b.due_date ?? "");
    });
  }, [tasks, onlyOpen]);

  const formatDue = (due?: string) => {
    if (!due) return t("no_due_date");
    const ts = Date.parse(due);
    if (Number.isNaN(ts)) return t("no_due_date");
    return new Date(ts).toLocaleDateString(i18n.language || undefined, {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card className="overflow-hidden rounded-3xl border-border shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-6 py-5">
        <div>
          <h2 className="text-sm font-bold text-foreground">{t("my_homework")}</h2>
          <p className="text-[11px] text-muted-foreground">{t("my_homework_sub")}</p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={onlyOpen ? "ghost" : "secondary"}
            className="h-auto rounded-lg px-3 py-1.5 text-[11px] font-bold"
            onClick={() => setOnlyOpen(false)}
            aria-pressed={!onlyOpen}
          >
            {t("homework_all")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={onlyOpen ? "secondary" : "ghost"}
            className="h-auto rounded-lg px-3 py-1.5 text-[11px] font-bold"
            onClick={() => setOnlyOpen(true)}
            aria-pressed={onlyOpen}
          >
            {t("homework_open")}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("th_task")}
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("th_status")}
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("th_due")}
              </TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("th_actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  {t("loading")}
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  <ClipboardCheck className="mx-auto mb-2 h-6 w-6 opacity-50" aria-hidden="true" />
                  <p className="font-bold text-foreground">{t("no_homework")}</p>
                  <p className="text-[11px]">{t("no_homework_sub")}</p>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((task) => {
                const status = (task.status as TaskStatus) ?? "assigned";
                return (
                  <TableRow
                    key={task.id}
                    className="cursor-pointer border-border"
                    onClick={() => navigate("/dashboard/client/tasks")}
                  >
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-foreground">{task.title}</p>
                        {task.description ? (
                          <p className="truncate text-[10px] text-muted-foreground">{task.description}</p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                          STATUS_BADGE[status] ?? STATUS_BADGE.assigned
                        }`}
                      >
                        {t(statusKey(status), status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">{formatDue(task.due_date)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        aria-label={t("open_task", { title: task.title })}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate("/dashboard/client/tasks");
                        }}
                      >
                        <Arrow className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-center border-t border-border p-4">
        <Button
          type="button"
          variant="link"
          className="h-auto gap-1 p-0 text-[11px] font-bold text-primary"
          onClick={() => navigate("/dashboard/client/tasks")}
        >
          {t("view_all_tasks")}
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
    </Card>
  );
};

export default MyHomework;
