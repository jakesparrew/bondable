"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { boolean } from "zod";

interface SimpleDatePickerProps {
  label?: string;
  value?: string;
  defaultValue?: string;
  readOnly?: boolean;
  className?: string;
  onChange?: (date: string) => void;
  required?: boolean;
}

export function SimpleDatePicker({
  label,
  value,
  defaultValue,
  readOnly = false,
  className,
  onChange,
  required = false,
}: SimpleDatePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(
    value ? new Date(value) : defaultValue ? new Date(defaultValue) : undefined
  );
  const [month, setMonth] = React.useState<Date>(date || new Date());

  // Update date when value changes (controlled component)
  React.useEffect(() => {
    if (value !== undefined) {
      if (value) {
        const newDate = new Date(value);
        setDate(newDate);
        setMonth(newDate);
      } else {
        setDate(undefined);
        setMonth(new Date());
      }
    }
  }, [value]);

  // Update date when defaultValue changes (uncontrolled component)
  React.useEffect(() => {
    if (value === undefined && defaultValue) {
      const newDate = new Date(defaultValue);
      setDate(newDate);
      setMonth(newDate);
    } else if (value === undefined && !defaultValue) {
      setDate(undefined);
      setMonth(new Date());
    }
  }, [defaultValue, value]);

  // Generate year options (from 1900 to current year + 10)
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - 1900 + 11 },
    (_, i) => 1900 + i
  ).reverse();

  const handleYearChange = (year: string) => {
    const newMonth = new Date(month);
    newMonth.setFullYear(parseInt(year));
    setMonth(newMonth);
  };

  const handleMonthChange = (monthIndex: string) => {
    const newMonth = new Date(month);
    newMonth.setMonth(parseInt(monthIndex));
    setMonth(newMonth);
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    if (selectedDate && onChange) {
      // Format the date as YYYY-MM-DD for the database
      const formattedDate = selectedDate.toISOString().split("T")[0];
      console.log("SimpleDatePicker: Selected date:", formattedDate);
      onChange(formattedDate);
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-gray-300 text-sm font-medium">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </Label>
      )}
      {readOnly ? (
        <Input
          value={date ? format(date, "PPP") : ""}
          readOnly
          className={cn("bg-[#1a1a1a] border-[#1f1f23] text-white", className)}
        />
      ) : (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal bg-[#0a0a0a] border-[#1f1f23] text-white hover:bg-[#1a1a1a] hover:text-white",
                !date && "text-gray-500",
                className
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0 bg-[#111111] border-[#1f1f23] text-neutral-50 "
            align="start"
          >
            <div className="p-3 space-y-2">
              {/* Year and Month selectors */}
              <div className="flex gap-2">
                <Select
                  value={month.getFullYear().toString()}
                  onValueChange={handleYearChange}
                >
                  <SelectTrigger className="w-24 bg-[#0a0a0a] border-[#1f1f23] text-white ">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111111] border-[#1f1f23] max-h-40">
                    {years.map((year) => (
                      <SelectItem
                        key={year}
                        value={year.toString()}
                        className="text-white hover:bg-[#1f1f23] "
                      >
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={month.getMonth().toString()}
                  onValueChange={handleMonthChange}
                >
                  <SelectTrigger className="flex-1 bg-[#0a0a0a] border-[#1f1f23] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111111] border-[#1f1f23]">
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem
                        key={i}
                        value={i.toString()}
                        className="text-white hover:bg-[#1f1f23]"
                      >
                        {format(new Date(2000, i, 1), "MMMM")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              month={month}
              onMonthChange={setMonth}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
