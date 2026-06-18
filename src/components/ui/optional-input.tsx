
import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OptionalInputProps {
  label: string;
  placeholder?: string;
  type?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readOnly?: boolean;
  className?: string;
}

export function OptionalInput({ 
  label, 
  placeholder, 
  type = "text", 
  defaultValue, 
  value,
  onChange,
  readOnly = false,
  className 
}: OptionalInputProps) {
  const id = useId();
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-1">
        <Label htmlFor={id} className="text-muted-foreground leading-6">
          {label}
        </Label>
      </div>
      <Input
        id={id}
        placeholder={placeholder}
        type={type}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        className={className}
      />
    </div>
  );
}
