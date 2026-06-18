"use client";

import { useId, useMemo, useState, ChangeEvent } from "react";
import { CheckIcon, EyeIcon, EyeOffIcon, XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PasswordStrengthInputProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  state?: "default" | "never" | "always"; // NEW PROP
  readOnly?: boolean;
}

export function PasswordStrengthInput({
  label,
  placeholder = "Password",
  value,
  onChange,
  className = "",
  state = "default", // DEFAULT VALUE
  readOnly = false,
}: PasswordStrengthInputProps) {
  const { t } = useTranslation();
  const id = useId();
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [hasInput, setHasInput] = useState<boolean>(false);

  const toggleVisibility = () => setIsVisible((prev) => !prev);

  const checkStrength = (pass: string) => {
    const requirements = [
      { regex: /.{8,}/, text: t("password_req_8_chars") },
      { regex: /[0-9]/, text: t("password_req_1_number") },
      { regex: /[a-z]/, text: t("password_req_1_lowercase") },
      { regex: /[A-Z]/, text: t("password_req_1_uppercase") },
    ];
    return requirements.map((req) => ({
      met: req.regex.test(pass),
      text: req.text,
    }));
  };

  const strength = checkStrength(value);
  const strengthScore = useMemo(
    () => strength.filter((req) => req.met).length,
    [strength]
  );
  const allRequirementsMet = strengthScore === strength.length;

  const getStrengthColor = (score: number) => {
    if (score === 0) return "bg-border";
    if (score <= 1) return "bg-red-500 opacity-90";
    if (score <= 2) return "bg-orange-500";
    if (score === 3) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const getStrengthText = (score: number) => {
    if (score === 0) return t("enter_password");
    if (score <= 2) return t("weak_password");
    if (score === 3) return t("medium_password");
    return t("strong_password");
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (!hasInput && newValue.length > 0) setHasInput(true);
    if (hasInput && newValue.length === 0) setHasInput(false);
    onChange(newValue);
  };

  const shouldShowFeedback =
    state === "always" || (state === "default" && hasInput);

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-muted-foreground">
        {label}
      </Label>

      <div className="relative">
        <Input
          id={id}
          className={`pe-9 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-ring ${className}`}
          placeholder={placeholder}
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={handleChange}
          aria-describedby={
            shouldShowFeedback && !allRequirementsMet ? `${id}-description` : undefined
          }
          readOnly={readOnly}
        />
        <button
          className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md transition-colors text-muted-foreground/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          type="button"
          onClick={toggleVisibility}
          aria-label={isVisible ? "Hide password" : "Show password"}
          aria-pressed={isVisible}
        >
          {isVisible ? (
            <EyeOffIcon size={16} aria-hidden="true" />
          ) : (
            <EyeIcon size={16} aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Conditional Feedback */}
      {shouldShowFeedback && (
        <div
          className="transition-all duration-300 ease-in-out"
        >
          {/* Strength Bar */}
          <div
            className="bg-border mt-3 mb-4 h-1 w-full overflow-hidden rounded-full"
            role="progressbar"
            aria-valuenow={strengthScore}
            aria-valuemin={0}
            aria-valuemax={4}
            aria-label="Password strength"
          >
            <div
              className={`h-full ${getStrengthColor(strengthScore)} transition-all duration-500 ease-out`}
              style={{ width: `${(strengthScore / 4) * 100}%` }}
            ></div>
          </div>

          {/* Requirements */}
          {!allRequirementsMet && (
            <>
              <p
                id={`${id}-description`}
                className="text-muted-foreground mb-2 text-sm font-medium"
              >
                {getStrengthText(strengthScore)}. {t("must_contain")}:
              </p>

              <ul className="space-y-1.5" aria-label="Password requirements">
                {strength.map((req, index) => (
                  <li key={index} className="flex items-center gap-2">
                    {req.met ? (
                      <CheckIcon size={16} className="text-emerald-500" aria-hidden="true" />
                    ) : (
                      <XIcon size={16} className="text-muted-foreground" aria-hidden="true" />
                    )}
                    <span
                      className={`text-xs ${
                        req.met ? "text-emerald-600" : "text-muted-foreground"
                      }`}
                    >
                      {req.text}
                      <span className="sr-only">
                        {req.met
                          ? ` - ${t("requirement_met")}`
                          : ` - ${t("requirement_not_met")}`}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
