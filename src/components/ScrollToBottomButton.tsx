import { useScrollToBottom } from '@/hooks/ui/useScrollToBottom';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { RefObject } from 'react';

interface ScrollToBottomButtonProps {
  scrollContainerRef: RefObject<HTMLElement>;
  className?: string;
}

export const ScrollToBottomButton = ({ 
  scrollContainerRef, 
  className = "" 
}: ScrollToBottomButtonProps) => {
  const { showScrollButton, scrollToBottom } = useScrollToBottom({
    scrollContainerRef,
    threshold: 100
  });

  const handleClick = () => {
    scrollToBottom();
  };

  return (
    <div 
      className={`absolute z-40 transition-all duration-300 ease-out ${
        showScrollButton 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-4 pointer-events-none'
      } ${className}`}
    >
      <Button
        onClick={handleClick}
        size="sm"
        className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg hover:bg-background/90 hover:shadow-xl transition-all duration-200 hover:scale-105"
        variant="outline"
      >
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  );
};