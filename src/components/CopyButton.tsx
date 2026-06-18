
import { useOptimizedState } from '@/hooks/performance/useOptimizedComponents';
import console from "@/lib/production-console";
import { CheckIcon, CopyIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CopyButtonProps {
  textToCopy: string;
  className?: string;
}

export default function CopyButton({ textToCopy, className }: CopyButtonProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useOptimizedState<boolean>(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={cn("disabled:opacity-100", className)}
            onClick={handleCopy}
            aria-label={copied ? t('copied') : t('copy_to_clipboard')}
            disabled={copied}
          >
            <div
              className={cn(
                "transition-all",
                copied ? "scale-100 opacity-100" : "scale-0 opacity-0"
              )}
            >
              <CheckIcon
                className="stroke-emerald-500"
                size={16}
                aria-hidden="true"
              />
            </div>
            <div
              className={cn(
                "absolute transition-all",
                copied ? "scale-0 opacity-0" : "scale-100 opacity-100"
              )}
            >
              <CopyIcon size={16} aria-hidden="true" />
            </div>
          </Button>
        </TooltipTrigger>
        <TooltipContent className="px-2 py-1 text-xs">
          {t('click_to_copy')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
