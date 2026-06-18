
import { useState, useCallback } from "react";

interface UseCharacterLimitOptions {
  maxLength: number;
  initialValue?: string;
}

export const useCharacterLimit = ({ maxLength, initialValue = "" }: UseCharacterLimitOptions) => {
  const [value, setValue] = useState(initialValue);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= maxLength) {
      setValue(newValue);
    }
  }, [maxLength]);

  const characterCount = value.length;

  return {
    value,
    characterCount,
    handleChange,
    maxLength,
  };
};
