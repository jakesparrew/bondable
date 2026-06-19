import { useTranslation } from "react-i18next";

interface BondSuggestionChipsProps {
  suggestions: string[];
  onSelect: (text: string) => void;
  disabled?: boolean;
}

/**
 * Tappable suggested-prompt chips. Shown when the thread is empty and after Bond
 * replies, to give the client easy entry points. Mint-accented (AI surface).
 */
const BondSuggestionChips = ({
  suggestions,
  onSelect,
  disabled = false,
}: BondSuggestionChipsProps) => {
  const { t } = useTranslation();

  if (suggestions.length === 0) return null;

  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label={t("bond_suggestions_label", "Suggested messages")}
    >
      {suggestions.map((s) => (
        <button
          key={s}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(s)}
          className="rounded-full border border-mint/40 bg-mint/10 px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-mint/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
        >
          {s}
        </button>
      ))}
    </div>
  );
};

export default BondSuggestionChips;
