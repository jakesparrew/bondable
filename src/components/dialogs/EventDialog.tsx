import React, { useState, useEffect, useId } from "react";
import console from "@/lib/production-console";
import { 
  useOptimizedState, 
  useOptimizedEffect, 
  useOptimizedCallback 
} from "@/hooks/performance/useOptimizedComponents";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SimpleDatePicker } from "@/components/ui/simple-date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import AddressAutoComplete, {
  AddressType,
} from "@/components/ui/address-autocomplete/index";
import { CalendarEvent } from "@/hooks/api/useEvents";
import { TimeSlotData } from "@/types/timeSlot";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface EventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Omit<CalendarEvent, "id">) => void;
  onUpdate?: (id: string, event: Partial<CalendarEvent>) => void;
  onDelete?: (id: string) => void;
  event?: CalendarEvent;
  selectedDate?: Date;
  timeSlotData?: TimeSlotData;
}

const EventDialog = ({
  isOpen,
  onClose,
  onSave,
  onUpdate,
  onDelete,
  event,
  selectedDate,
  timeSlotData,
}: EventDialogProps) => {
  const id = useId();
  const { t } = useTranslation();
  const [formData, setFormData] = useOptimizedState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    startTime: "09:00",
    endTime: "10:00",
    location: "",
    color: "",
  });

  const [address, setAddress] = useOptimizedState<AddressType>({
    address1: "",
    address2: "",
    formattedAddress: "",
    city: "",
    region: "",
    postalCode: "",
    country: "",
    lat: 0,
    lng: 0,
  });

  const [searchInput, setSearchInput] = useOptimizedState("");

  const colorOptions = [
    { value: "bg-blue-600", color: "blue-500", label: "Blue" },
    { value: "bg-yellow-600", color: "amber-500", label: "Amber" },
    { value: "bg-pink-300", color: "pink-300", label: "Pink" },
    { value: "bg-red-600", color: "red-500", label: "Red" },
    { value: "bg-green-600", color: "emerald-500", label: "Emerald" },
    { value: "bg-orange-600", color: "orange-500", label: "Orange" },
    { value: "bg-indigo-300", color: "indigo-300", label: "Indigo" },
  ];

  useOptimizedEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description || "",
        startDate: event.startDate,
        endDate: event.endDate,
        startTime: event.startTime || "09:00",
        endTime: event.endTime || "10:00",
        location: event.location || "",
        color: event.color,
      });

      // If the event has a location, set it as the formatted address
      if (event.location) {
        setAddress((prev) => ({
          ...prev,
          formattedAddress: event.location,
        }));
      }
    } else if (timeSlotData) {
      // Use the time slot data when provided
      console.log("EventDialog: Using time slot data:", timeSlotData);

      setFormData((prev) => ({
        ...prev,
        startDate: timeSlotData.dateString,
        endDate: timeSlotData.dateString,
        startTime: timeSlotData.startTime,
        endTime: timeSlotData.endTime,
        color: prev.color || "bg-blue-600",
      }));
    } else if (selectedDate) {
      // Format date as YYYY-MM-DD in local timezone to avoid offset issues
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      const dateString = `${year}-${month}-${day}`;

      console.log(
        "EventDialog: Selected date:",
        selectedDate,
        "Formatted as:",
        dateString
      );

      setFormData((prev) => ({
        ...prev,
        startDate: dateString,
        endDate: dateString,
        startTime: "09:00",
        endTime: "10:00",
        color: prev.color || "bg-blue-600",
      }));
    } else {
      // Reset to defaults when no event or date is selected
      setFormData({
        title: "",
        description: "",
        startDate: "",
        endDate: "",
        startTime: "09:00",
        endTime: "10:00",
        location: "",
        color: "bg-blue-600",
      });
    }
  }, [event, selectedDate, timeSlotData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Use the formatted address as the location
    const eventData = {
      ...formData,
      location: address.formattedAddress || formData.location,
    };

    if (event && onUpdate) {
      onUpdate(event.id, eventData);
    } else {
      onSave(eventData);
    }

    onClose();
    setFormData({
      title: "",
      description: "",
      startDate: "",
      endDate: "",
      startTime: "09:00",
      endTime: "10:00",
      location: "",
      color: "bg-blue-600",
    });
    setAddress({
      address1: "",
      address2: "",
      formattedAddress: "",
      city: "",
      region: "",
      postalCode: "",
      country: "",
      lat: 0,
      lng: 0,
    });
    setSearchInput("");
  };

  const handleDelete = () => {
    if (event && onDelete) {
      onDelete(event.id);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 bg-card border-border text-foreground">
        <div className="p-6">
          <DialogHeader className="relative">
            <DialogTitle className="text-left text-lg font-semibold text-foreground">
              {event ? t("edit_event") : t("create_event")}
              <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-[#3f3f3f] to-transparent" />
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 mt-4 ">
            <div className="space-y-2">
              <Label
                htmlFor={`title-${id}`}
                className="text-sm font-medium text-muted-foreground"
              >
                {t("title")} <span className="text-red-400">*</span>
              </Label>
              <Input
                id={`title-${id}`}
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                required
                className="h-10 bg-background border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor={`description-${id}`}
                className="text-sm font-medium text-muted-foreground"
              >
                {t("description")}
              </Label>
              <Textarea
                id={`description-${id}`}
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder={t("description")}
                className="resize-none bg-background border-border text-foreground placeholder:text-muted-foreground"
                rows={3}
              />
            </div>

            <div className="bg-card border border-border p-4 rounded-xl space-y-2">
              <div className="grid grid-cols-2 gap-4 ">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-sm font-medium">
                    {t("start_date")} <span className="text-red-400">*</span>
                  </Label>
                  <SimpleDatePicker
                    defaultValue={formData.startDate}
                    className="flex-1"
                    onChange={(date) => {
                      console.log("Start date changed to:", date);
                      setFormData((prev) => ({ ...prev, startDate: date }));
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-sm font-medium">
                    {t("start_time")} <span className="text-red-400">*</span>
                  </Label>
                  <TimePicker
                    value={formData.startTime}
                    onChange={(time) =>
                      setFormData((prev) => ({ ...prev, startTime: time }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 ">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-sm font-medium">
                    {t("end_date")} <span className="text-red-400">*</span>
                  </Label>
                  <SimpleDatePicker
                    label=""
                    defaultValue={formData.endDate}
                    className="flex-1"
                    onChange={(date) => {
                      console.log("End date changed to:", date);
                      setFormData((prev) => ({ ...prev, endDate: date }));
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-sm font-medium">
                    {t("end_time")} <span className="text-red-400">*</span>
                  </Label>
                  <TimePicker
                    label=""
                    value={formData.endTime}
                    onChange={(time) =>
                      setFormData((prev) => ({ ...prev, endTime: time }))
                    }
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                {t("location")}
              </Label>
              <AddressAutoComplete
                address={address}
                setAddress={setAddress}
                searchInput={searchInput}
                setSearchInput={setSearchInput}
                dialogTitle={t("edit_event_location")}
                placeholder={t("enter_event_location")}
                showInlineError={false}
              />
            </div>

            <fieldset className="space-y-3">
              <RadioGroup
                className="flex gap-1.5"
                value={formData.color}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, color: value }))
                }
              >
                {colorOptions.map((option) => (
                  <RadioGroupItem
                    key={option.value}
                    value={option.value}
                    aria-label={option.label}
                    className={`size-6 border-neutral-500 bg-${option.color} shadow-none data-[state=checked]:border-neutral-500 data-[state=checked]:bg-${option.color}`}
                  />
                ))}
              </RadioGroup>
            </fieldset>

            <div className="flex justify-end pt-0">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  {t("cancel")}
                </Button>
                <Button
                  type="submit"
                  className={`bg-primary text-primary-foreground hover:bg-primary/90 ${
                    event && onDelete ? "" : "-mr-2"
                  }`}
                >
                  {event ? t("update") : t("save")}
                </Button>
                <div>
                  {event && onDelete && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleDelete}
                      className="bg-red-500 hover:bg-red-900"
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventDialog;
