
import { useId } from "react"
import { AtSign } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface EmailInputProps {
  label: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readOnly?: boolean;
  className?: string;
  required?: boolean;
}

export function EmailInput({ 
  label, 
  placeholder = "Enter your email", 
  value, 
  onChange, 
  readOnly = false, 
  className = "",
  required = false
}: EmailInputProps) {
  const id = useId()
  
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-muted-foreground leading-6">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </Label>
      <div className="relative">
        <Input 
          id={id} 
          className={`peer ps-9 ${className}`}
          placeholder={placeholder} 
          type="email" 
          value={value}
          onChange={onChange}
          readOnly={readOnly}
        />
        <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
          <AtSign size={16} aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
