"use client";

import React, { useId, useState } from "react";
import { ChevronDownIcon, Phone } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PhoneInputComponentProps {
  label: string;
  defaultValue?: string;
  readOnly?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}

const countryCodes = [
  { code: "+1", country: "US", flag: "🇺🇸" },
  { code: "+32", country: "BE", flag: "🇧🇪" },
  { code: "+33", country: "FR", flag: "🇫🇷" },
  { code: "+44", country: "GB", flag: "🇬🇧" },
  { code: "+49", country: "DE", flag: "🇩🇪" },
  { code: "+31", country: "NL", flag: "🇳🇱" },
  { code: "+34", country: "ES", flag: "🇪🇸" },
  { code: "+39", country: "IT", flag: "🇮🇹" },
];

export function PhoneInputComponent({
  label,
  defaultValue,
  readOnly,
  value,
  onChange,
  required = false,
  disabled = false
}: PhoneInputComponentProps) {
  const id = useId();
  const [selectedCountryCode, setSelectedCountryCode] = useState("+32");

  const [internalPhoneNumber, setInternalPhoneNumber] = useState(() => {
    const phone = value || defaultValue || "";
    const match = phone.match(/^(\+\d+)\s?(.*)$/);
    if (match) {
      setSelectedCountryCode(match[1]);
      return match[2];
    }
    return phone;
  });

  const phoneNumber = value
    ? value.replace(/^(\+\d+)\s?/, "") // remove country code from prop value
    : internalPhoneNumber;

  const handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const newNationalNumber = event.target.value;
    if (onChange) {
      onChange(`${selectedCountryCode} ${newNationalNumber}`);
    } else {
      setInternalPhoneNumber(newNationalNumber);
    }
  };

  const handleCountryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (readOnly) return;
    const newCode = event.target.value;
    setSelectedCountryCode(newCode);

    // If controlled, inform parent of full new value
    if (onChange) {
      onChange(`${newCode} ${phoneNumber}`);
    }
  };

  return (
    <div className="space-y-2" dir="ltr">
      <Label htmlFor={id} className="text-gray-300 flex mt-2">
        {label}{required && <span className="text-red-400">&nbsp;*</span>}<div className="text-xs text-gray-500 ml-4">{selectedCountryCode} {phoneNumber}</div>
      </Label>
      <div className="flex rounded-md shadow-xs">
        {/* Country Code Selector */}
        <div
          className={cn(
            "border-[#1f1f23] bg-[#0a0a0a] text-muted-foreground focus-within:border-ring focus-within:ring-ring/50 hover:bg-accent hover:text-foreground relative inline-flex items-center self-stretch rounded-s-md border py-2 ps-3 pe-2 transition-[color,box-shadow] outline-none focus-within:z-10 focus-within:ring-[3px]",
            disabled && readOnly && "bg-[#1a1a1a] cursor-not-allowed pointer-events-none"
          )}
        >
          <div className="inline-flex items-center gap-1" aria-hidden="true">
            <span className="text-sm">
              {countryCodes.find((c) => c.code === selectedCountryCode)
                ?.flag || <Phone size={14} />}
            </span>
            <span className="text-muted-foreground/80">
              <ChevronDownIcon size={16} aria-hidden="true" />
            </span>
          </div>
          <select
            disabled={readOnly}
            value={selectedCountryCode}
            onChange={handleCountryChange}
            className="absolute inset-0 text-sm opacity-0 cursor-pointer"
            aria-label="Select country code"
          >
            {countryCodes.map((country) => (
              <option key={country.code} value={country.code}>
                {country.flag} {country.code}
              </option>
            ))}
          </select>
        </div>

        {/* Phone Number Input */}
        <Input
          id={id}
          type="tel"
          placeholder="400 000 000"
          value={phoneNumber}
          onChange={handlePhoneChange}
          readOnly={readOnly}
          className={cn(
            "-ms-px rounded-s-none shadow-none focus-visible:z-10 bg-[#0a0a0a] border-[#1f1f23] text-white placeholder:text-gray-500 focus:border-gray-400",
            disabled && readOnly && "bg-[#1a1a1a] "
          )}
        />
      </div>
    </div>
  );
}
