import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import clsx from "clsx";

interface TimePickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export function TimePicker({
  label,
  value,
  onChange,
  disabled = false,
  required = false,
  className = "",
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState(parseInt(value.split(":")[0]) || 10);
  const [minutes, setMinutes] = useState(parseInt(value.split(":")[1]) || 0);

  const hourOptions = Array.from({ length: 24 }, (_, i) => i);
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i);

  const formatTime = (h: number, m: number) => {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const handleTimeChange = (newHours: number, newMinutes: number) => {
    setHours(newHours);
    setMinutes(newMinutes);
    onChange(formatTime(newHours, newMinutes));
  };

  const handleHourChange = (hourValue: string) => {
    const newHour = parseInt(hourValue);
    handleTimeChange(newHour, minutes);
  };

  const handleMinuteChange = (minuteValue: string) => {
    const newMinute = parseInt(minuteValue);
    handleTimeChange(hours, newMinute);
  };

  const handleInputChange = (inputValue: string) => {
    const timeMatch = inputValue.match(/^(\d{1,2}):(\d{2})$/);
    if (timeMatch) {
      const h = parseInt(timeMatch[1]);
      const m = parseInt(timeMatch[2]);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        setHours(h);
        setMinutes(m);
        onChange(formatTime(h, m));
      }
    }
  };

  const handleDone = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(":").map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        setHours(h);
        setMinutes(m);
      }
    }
  }, [value]);

  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-sm font-medium text-gray-300">
          {label} {required && <span className="text-red-400">*</span>}
        </Label>
      )}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={clsx(
              "w-full justify-between text-left font-normal",
              "bg-[#0a0a0a] border-[#1f1f23] text-white",
              "hover:bg-[#1a1a1a] hover:text-white",
              !value && "text-gray-500",
              className
            )}
          >
            {value ? formatTime(hours, minutes) : "Select time"}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 p-0 bg-[#111111] border-[#1f1f23]"
          align="start"
        >
          <div className="p-4 space-y-4">
            <div className="space-y-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-400">Hour</Label>
                  <Select
                    value={hours.toString()}
                    onValueChange={handleHourChange}
                  >
                    <SelectTrigger className="bg-[#0a0a0a] border-[#1f1f23] text-white h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111111] border-[#1f1f23] max-h-48">
                      {hourOptions.map((hour) => (
                        <SelectItem
                          key={hour}
                          value={hour.toString()}
                          className="text-gray-300 hover:!text-neutral-950 data-[state=checked]:text-neutral-50 data-[highlighted]:!text-neutral-950"
                        >
                          {hour.toString().padStart(2, "0")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-gray-400">Minute</Label>
                  <Select
                    value={minutes.toString()}
                    onValueChange={handleMinuteChange}
                  >
                    <SelectTrigger className="bg-[#0a0a0a] border-[#1f1f23] text-white h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111111] border-[#1f1f23] max-h-48">
                      {minuteOptions.map((minute) => (
                        <SelectItem
                          key={minute}
                          value={minute.toString()}
                          className="text-gray-300 hover:!text-neutral-950 data-[state=checked]:text-neutral-50 data-[highlighted]:!text-neutral-950"
                        >
                          {minute.toString().padStart(2, "0")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <Label htmlFor="custom-time" className="text-xs text-gray-400">
                  Or enter time manually
                </Label>
                <Input
                  id="custom-time"
                  type="text"
                  placeholder="HH:MM"
                  className="w-full bg-[#0a0a0a] border-[#1f1f23] text-white placeholder:text-gray-500 focus:border-gray-400"
                  onChange={(e) => handleInputChange(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDone}
                className="border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-neutral-300"
              >
                Done
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
