
import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RequiredInputProps {
  label: string;
  placeholder?: string;
  type?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readOnly?: boolean;
  className?: string;
  required?: boolean;
}

export function RequiredInput({ 
  label, 
  placeholder, 
  type = "text", 
  defaultValue, 
  value,
  onChange,
  readOnly = false,
  className,
  required = true
}: RequiredInputProps) {
  const id = useId();
  
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-gray-300">
        {label} {required && <span className="text-red-400">*</span>}
      </Label>
      <Input
        id={id}
        placeholder={placeholder}
        type={type}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        required={required}
        className={className}
      />
    </div>
  );
}
