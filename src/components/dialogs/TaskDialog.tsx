import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOptimizedState, useOptimizedEffect } from "@/hooks/performance/useOptimizedComponents";
import { SimpleDatePicker } from "@/components/ui/simple-date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import type { TaskPriority } from "@/types/global";
import { useTranslation } from "react-i18next";

interface Client {
  id: string;
  name: string;
  initials: string;
}

interface TaskData {
  id?: string;
  title: string;
  description: string;
  clientId: string;
  clientName?: string;
  priority: TaskPriority | null;
  dueDate: string | null;
  assignedDate?: string;
  notes: string;
  status?: string;
  deniedReason?: string;
}

interface TaskDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  task?: TaskData | null;
  clients: Client[];
  onSave: (task: Omit<TaskData, "id" | "assignedDate">) => void;
  onStatusChange?: (taskId: string, status: string, reason?: string) => void;
  mode: "add" | "edit" | "view";
  userType?: "therapist" | "client";
}

export default function TaskDialog({
  open,
  setOpen,
  task,
  clients,
  onSave,
  onStatusChange,
  mode,
  userType = "therapist",
}: TaskDialogProps) {
  const { t } = useTranslation();
  // Defensive: `clients` must be an array. JSX children are evaluated eagerly,
  // so `clients.map(...)` below runs on every render even while the dialog is
  // closed — a non-array prop would crash the whole page. Never trust the shape.
  const safeClients = Array.isArray(clients) ? clients : [];
  const [formData, setFormData] = useOptimizedState({
    title: "",
    description: "",
    clientId: "",
    priority: "medium" as TaskPriority,
    dueDate: "",
    notes: "",
  });

  const [showDeniedReason, setShowDeniedReason] = useOptimizedState(false);
  const [deniedReason, setDeniedReason] = useOptimizedState("");
  const [hasPriority, setHasPriority] = useOptimizedState(false);
  const [hasDueDate, setHasDueDate] = useOptimizedState(false);

  useOptimizedEffect(() => {
    if (task && (mode === "edit" || mode === "view")) {
      setFormData({
        title: task.title,
        description: task.description,
        clientId: task.clientId,
        priority: task.priority || "medium",
        dueDate: task.dueDate || "",
        notes: task.notes || "",
      });
      setHasPriority(!!task.priority);
      setHasDueDate(!!task.dueDate);
    } else if (mode === "add") {
      setFormData({
        title: "",
        description: "",
        clientId: "",
        priority: "medium",
        dueDate: "",
        notes: "",
      });
      setHasPriority(false);
      setHasDueDate(false);
    }
    setShowDeniedReason(false);
    setDeniedReason("");
  }, [task, mode, open]);

  const handleSave = () => {
    if (!formData.title || !formData.clientId) {
      return;
    }

    const client = safeClients.find((c) => c.id === formData.clientId);
    const taskData = {
      ...formData,
      clientName: client?.name || "",
      // Only include priority and dueDate if they're enabled
      priority: hasPriority ? formData.priority : null,
      dueDate: hasDueDate ? formData.dueDate : null,
    };

    onSave(taskData);
    
    // Add small delay before closing to ensure save operation completes
    setTimeout(() => {
      setOpen(false);
    }, 100);
  };

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === "denied") {
      setShowDeniedReason(true);
    } else {
      setShowDeniedReason(false);
      if (task && onStatusChange) {
        onStatusChange(task.id!, newStatus);
        setTimeout(() => {
          setOpen(false);
        }, 100);
      }
    }
  };

  const handleDeniedSubmit = () => {
    if (task && onStatusChange && deniedReason.trim()) {
      onStatusChange(task.id!, "denied", deniedReason);
      setTimeout(() => {
        setOpen(false);
      }, 100);
    }
  };

  const isReadOnly = mode === "view";
  const title =
    mode === "add"
      ? t("assign_new_task")
      : mode === "edit"
      ? t("edit_task")
      : t("task_details");

  return (
    <Dialog 
      open={open} 
      onOpenChange={setOpen}
    >
      <DialogContent
        className="bg-card border border-border text-foreground max-w-2xl"
        onCloseAutoFocus={(e) => {
          // Prevent auto focus to avoid focus trapping
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">{title}</DialogTitle>
        </DialogHeader>
        <div className="mt-2 h-px w-full bg-gradient-to-r from-transparent via-[#3f3f3f] to-transparent " />
        <div className="space-y-4 overflow-y-auto scrollbar-hide ">
          {mode === "view" && task && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-card rounded-lg border border-border">
              <div>
                <Label className="text-muted-foreground text-xs">{t('task_id')}</Label>
                <p className="font-mono text-sm">{task.id}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">{t('assigned_date')}</Label>
                <p className="text-sm">
                  {task.assignedDate ? new Date(task.assignedDate).toLocaleDateString() : t("n_a")}
                </p>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="client" className="text-muted-foreground ">
              {t("client")} <span className="text-red-400">*</span>
            </Label>
            <Select
              value={formData.clientId}
              onValueChange={(value) =>
                setFormData({ ...formData, clientId: value })
              }
              disabled={isReadOnly}
              required
            >
              <SelectTrigger className="bg-card border-border text-foreground mt-2 !cursor-default">
                <SelectValue placeholder={t("select_client")} />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {safeClients.map((client) => (
                  <SelectItem
                    className="text-muted-foreground data-[state=checked]:text-neutral-50 data-[highlighted]:!text-neutral-50"
                    key={client.id}
                    value={client.id}
                  >
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="pb-2">
            <Label htmlFor="title" className="text-muted-foreground ">
              {t("task_title")} <span className="text-red-400">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder={t("enter_task_title")}
              className="bg-background border-border text-foreground mt-2"
              readOnly={isReadOnly}
              required
            />
          </div>

          <div className="flex-1 bg-muted border border-border text-foreground p-4 rounded-lg pt-2 ">
            <div>
              <Label htmlFor="description" className="text-muted-foreground">
                {t("description")}
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder={t("describe_task_purpose")}
                className="bg-background border-border text-foreground mt-2"
                rows={4}
                readOnly={isReadOnly}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div>
                {!isReadOnly ? (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="priority-checkbox"
                      checked={hasPriority}
                      onCheckedChange={(checked) => {
                        setHasPriority(!!checked);
                        if (!checked) {
                          setFormData({ ...formData, priority: "medium" });
                        }
                      }}
                    />
                    <Label htmlFor="priority-checkbox" className="text-muted-foreground">
                      {t("set_priority")}
                    </Label>
                  </div>
                ) : (
                  <Label className="text-muted-foreground">{t('priority')}</Label>
                )}
                
                {(hasPriority || isReadOnly) && (
                  <div className="mt-2">
                    <Select
                      value={formData.priority}
                      onValueChange={(value: TaskPriority) =>
                        setFormData({ ...formData, priority: value })
                      }
                      disabled={isReadOnly}
                    >
                      <SelectTrigger className="bg-card border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem
                          className="text-muted-foreground hover:!text-neutral-950 data-[state=checked]:text-neutral-50 data-[highlighted]:!text-neutral-950"
                          value="low"
                        >
                          {t("low")}
                        </SelectItem>
                        <SelectItem
                          className="text-muted-foreground hover:!text-neutral-950 data-[state=checked]:text-neutral-50 data-[highlighted]:!text-neutral-950"
                          value="medium"
                        >
                          {t("medium")}
                        </SelectItem>
                        <SelectItem
                          className="text-muted-foreground hover:!text-neutral-950 data-[state=checked]:text-neutral-50 data-[highlighted]:!text-neutral-950"
                          value="high"
                        >
                          {t("high")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              
              <div>
                {!isReadOnly ? (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="duedate-checkbox"
                      checked={hasDueDate}
                      onCheckedChange={(checked) => {
                        setHasDueDate(!!checked);
                        if (!checked) {
                          setFormData({ ...formData, dueDate: "" });
                        }
                      }}
                    />
                    <Label htmlFor="duedate-checkbox" className="text-muted-foreground">
                      {t("set_due_date")}
                    </Label>
                  </div>
                ) : (
                  <Label className="text-muted-foreground">{t('due_date')}</Label>
                )}
                
                {(hasDueDate || isReadOnly) && (
                  <div className="mt-2">
                    <SimpleDatePicker
                      label=""
                      defaultValue={formData.dueDate}
                      readOnly={isReadOnly}
                      className="w-full"
                      onChange={(date) => setFormData({ ...formData, dueDate: date })}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="notes" className="text-muted-foreground">
              {t("additional_notes")}
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder={t("additional_instructions")}
              className="bg-background border-border text-foreground mt-2"
              rows={3}
              readOnly={isReadOnly}
            />
          </div>

          {/* Client Status Update Section — actionable while the task is open
              (assigned or in progress). NOTE: status values are underscore-cased
              ("in_progress") to match the rest of the app; a hyphen here would
              produce an unknown status the task table can't render. */}
          {userType === "client" &&
            mode === "view" &&
            task &&
            (task.status === "assigned" || task.status === "in_progress") && (
            <div className="space-y-3 p-4 bg-secondary/50 rounded-lg border border-border">
              <Label className="text-foreground font-medium">
                {t('update_task_status', 'Update status')}
              </Label>
              {!showDeniedReason ? (
                <div className="flex flex-wrap gap-2">
                  {task.status === "assigned" && (
                    <Button
                      onClick={() => handleStatusChange("in_progress")}
                      variant="outline"
                      className="border-border"
                    >
                      {t("start_task", "Start task")}
                    </Button>
                  )}
                  <Button
                    onClick={() => handleStatusChange("completed")}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {t("mark_complete", "Mark complete")}
                  </Button>
                  <Button
                    onClick={() => handleStatusChange("denied")}
                    variant="destructive"
                  >
                    {t("decline_task", "Decline")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">{t("reason_for_declining")}</Label>
                  <Textarea
                    value={deniedReason}
                    onChange={(e) => setDeniedReason(e.target.value)}
                    placeholder={t("explain_declining_task")}
                    className="bg-background border-border text-foreground"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleDeniedSubmit}
                      disabled={!deniedReason.trim()}
                      variant="destructive"
                    >
                      {t("submit_decline")}
                    </Button>
                    <Button
                      onClick={() => setShowDeniedReason(false)}
                      variant="outline"
                      className="border-border bg-transparent hover:bg-muted text-muted-foreground"
                    >
                      {t("cancel")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Read-only confirmation once the task is resolved (client). */}
          {userType === "client" &&
            mode === "view" &&
            task &&
            (task.status === "completed" || task.status === "denied") && (
            <div className="p-4 bg-secondary/50 rounded-lg border border-border">
              <p className="text-sm text-foreground">
                {task.status === "completed"
                  ? t("task_completed_note", "You marked this task complete. Nice work!")
                  : t("task_declined_note", "You declined this task.")}
              </p>
              {task.status === "denied" && task.deniedReason && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("reason_for_declining", "Reason")}: {task.deniedReason}
                </p>
              )}
            </div>
          )}

          {!isReadOnly && userType === "therapist" && (
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="border-border bg-transparent hover:bg-muted text-muted-foreground"
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={handleSave}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {mode === "add" ? t("assign_task") : t("save_changes")}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
