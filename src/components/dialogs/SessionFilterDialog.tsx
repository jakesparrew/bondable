
import { useOptimizedState } from '@/hooks/performance/useOptimizedComponents';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from "react-i18next";

interface SessionFilterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: SessionFilters) => void;
  currentFilters: SessionFilters;
  userType?: "therapist" | "client";
  availablePersons?: Array<{ value: string; label: string }>;
}

export interface SessionFilters {
  status: string[];
  sessionType: string[];
  therapyType: string[];
  person: string; // New filter for client/therapist
}

const SessionFilterDialog = ({
  isOpen,
  onClose,
  onApplyFilters,
  currentFilters,
  userType = "therapist",
  availablePersons = [],
}: SessionFilterDialogProps) => {
  const { t } = useTranslation();
  const [filters, setFilters] = useOptimizedState<SessionFilters>(currentFilters);

  const statusOptions = [
    { value: "Confirmed", label: t("confirmed") },
    { value: "Pending", label: t("pending") },
    { value: "Completed", label: t("completed") },
  ];

  const sessionTypeOptions = [
    { value: "In-Person", label: t("in_person") },
    { value: "Video", label: t("video_call") },
  ];

  const therapyTypeOptions = [
    { value: "Individual Therapy", label: t("individual_therapy") },
    { value: "Couples Therapy", label: t("couples_therapy") },
    { value: "Group Therapy", label: t("group_therapy") },
    { value: "Family Therapy", label: t("family_therapy") },
  ];

  const personLabel = userType === "therapist" ? t("client") : t("therapist");

  const handleCheckboxChange = (
    category: keyof Omit<SessionFilters, "person">,
    value: string,
    checked: boolean
  ) => {
    setFilters((prev) => ({
      ...prev,
      [category]: checked
        ? [...prev[category], value]
        : prev[category].filter((item) => item !== value),
    }));
  };

  const handlePersonChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      person: value === "all" ? "" : value,
    }));
  };

  const handleApply = () => {
    onApplyFilters(filters);
    onClose();
  };

  const handleClearAll = () => {
    const clearedFilters = {
      status: [],
      sessionType: [],
      therapyType: [],
      person: "",
    };
    setFilters(clearedFilters);
    onApplyFilters(clearedFilters);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#111111] border-[#1f1f23] text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-white mb-4">{t("filter_sessions")}</DialogTitle>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[#3f3f3f] to-transparent" />
        </DialogHeader>

        <div className="space-y-6">
          {/* Person Filter - Full Width at Top */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-white tracking-wide">
              {personLabel}
            </Label>
            <Select value={filters.person || "all"} onValueChange={handlePersonChange}>
              <SelectTrigger className="w-full bg-[#0a0a0a] border-[#2a2a2a] text-white">
                <SelectValue placeholder={`${t("select")} ${personLabel.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0a0a] border-[#2a2a2a] text-white">
                <SelectItem value="all" className="text-neutral-400 data-[state=checked]:text-neutral-50 data-[highlighted]:!text-neutral-50">
                  {userType === "therapist" ? t("all_clients") : t("all_therapists")}
                </SelectItem>
                {availablePersons.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-neutral-400 data-[state=checked]:text-neutral-50 data-[highlighted]:!text-neutral-50">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Section container style */}
          {(
            [
              {
                label: t("status"),
                options: statusOptions,
                filterKey: "status",
              },
              {
                label: t("session_type"),
                options: sessionTypeOptions,
                filterKey: "sessionType",
              },
              {
                label: t("therapy_type"),
                options: therapyTypeOptions,
                filterKey: "therapyType",
              },
            ] as {
              label: string;
              options: { value: string; label: string }[];
              filterKey: keyof Omit<SessionFilters, "person">;
            }[]
          ).map(({ label, options, filterKey }) => (
            <div key={filterKey} className="space-y-3">
              <Label className="text-sm font-semibold text-white tracking-wide">
                {label}
              </Label>
              <div
                className={`grid gap-2 ${
                  options.length === 3
                    ? "grid-cols-1 sm:grid-cols-2 auto-rows-fr"
                    : options.length === 1
                    ? "grid-cols-1"
                    : "grid-cols-1 sm:grid-cols-2"
                }`}
              >
                {options.map((option, index) => (
                  <label
                    key={option.value}
                    htmlFor={`${filterKey}-${option.value}`}
                    className={`flex items-center gap-3 p-2 rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] hover:bg-[#1a1a1a] transition-colors cursor-pointer w-full ${
                      options.length === 3 && index === 2 ? "sm:col-span-2" : ""
                    }`}
                  >
                    <Checkbox
                      id={`${filterKey}-${option.value}`}
                      checked={filters[filterKey].includes(option.value)}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange(filterKey, option.value, !!checked)
                      }
                      className="border-gray-600 data-[state=checked]:bg-white data-[state=checked]:text-black"
                    />
                    <span className="text-sm text-gray-300">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between pt-2">
          <Button
            variant="outline"
            onClick={handleClearAll}
            className="border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-white"
            >
              {t("clear_all")}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-white"
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={handleApply}
              className="bg-neutral-50 hover:bg-[#d6d6d6] text-neutral-950"
            >
              {t("apply_filters")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SessionFilterDialog;
