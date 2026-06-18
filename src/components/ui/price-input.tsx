import React from "react";
import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RequiredInput } from "./required-input";

interface PriceInputProps {
  price: number;
  onChange: (price: number) => void;
}

export function PriceInput({ price, onChange }: PriceInputProps) {
  const handleIncrement = () => onChange(parseFloat((price + 1).toFixed(2)));
  const handleDecrement = () =>
    onChange(parseFloat(Math.max(0, price - 1).toFixed(2)));

  const handleRawChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseFloat(e.target.value);
    onChange(isNaN(raw) ? 0 : parseFloat(raw.toFixed(2)));
  };

  return (
    <div className="relative w-full">
        <style>{`
        input[type="number"] {
          -moz-appearance: textfield;
          appearance: none;
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      `}</style>
      <RequiredInput
        label="Price"
        type="number"
        value={price.toString()}
        onChange={handleRawChange}
        placeholder="120.00"
        className="bg-[#1a1a1a] border-[#1f1f23] text-white 
                   placeholder:text-gray-500 focus:border-gray-400 
                   pr-12"
      />

      {/* Plus/Minus buttons */}
      <div className="absolute inset-y-0 top-9 right-2 flex flex-col justify-center space-y-1">
        {/* up */}
        <button
          type="button"
          onClick={handleIncrement}
          className="p-0 h-4 w-4 flex items-center justify-center"
        >
          <Plus className="h-4 w-4 text-gray-400 hover:text-white" />
        </button>
        {/* down */}
        <button
          type="button"
          onClick={handleDecrement}
          className="p-0 h-4 w-4 flex items-center justify-center"
        >
          <Minus className="h-4 w-4 text-gray-400 hover:text-white" />
        </button>
      </div>
    </div>
  );
}
