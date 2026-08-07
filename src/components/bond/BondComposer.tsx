import { useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Send } from "lucide-react";

import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface BondComposerProps {
  /** Called with the trimmed message text on send. */
  onSend: (text: string) => void;
  /** When true, the input + button are disabled (e.g. while Bond is typing). */
  disabled?: boolean;
}

/**
 * Message composer: auto-growing textarea + mint send button.
 * Enter sends, Shift+Enter inserts a newline. Disabled while Bond "responds".
 */
const BondComposer = ({ onSend, disabled = false }: BondComposerProps) => {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    // Reset height after clearing.
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    setValue(el.value);
    // Auto-grow up to a cap.
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className="flex items-end gap-2 border-t border-border bg-card px-4 py-3 sm:px-6">
      <label htmlFor="bond-composer" className="sr-only">
        {t("bond_composer_label", "Bericht aan Bond")}
      </label>
      <Textarea
        id="bond-composer"
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={1}
        placeholder={t("bond_composer_placeholder", "Schrijf een bericht…")}
        className="max-h-40 min-h-[2.75rem] flex-1 resize-none rounded-2xl border-border bg-background text-sm focus-visible:ring-mint"
      />
      <Button
        type="button"
        onClick={submit}
        disabled={!canSend}
        aria-label={t("bond_send", "Send message")}
        className={cn(
          "h-11 w-11 shrink-0 rounded-2xl bg-mint p-0 text-mint-foreground hover:bg-mint/90",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
      >
        <Send className="h-5 w-5" aria-hidden="true" />
      </Button>
    </div>
  );
};

export default BondComposer;
