import { useState, useEffect, useCallback, RefObject } from 'react';

interface UseScrollToBottomOptions {
  scrollContainerRef: RefObject<HTMLElement>;
  threshold?: number; // Distance from bottom to trigger visibility
}

export const useScrollToBottom = ({ 
  scrollContainerRef, 
  threshold = 100 
}: UseScrollToBottomOptions) => {
  const [showScrollButton, setShowScrollButton] = useState(false);

  const checkScrollPosition = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isNearBottom = distanceFromBottom <= threshold;
    
    setShowScrollButton(!isNearBottom);
  }, [scrollContainerRef, threshold]);

  const scrollToBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });
  }, [scrollContainerRef]);

  // Function to trigger check from outside (for when content changes)
  const triggerCheck = useCallback(() => {
    // Small delay to ensure DOM has updated
    setTimeout(checkScrollPosition, 10);
  }, [checkScrollPosition]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', checkScrollPosition, { passive: true });
    
    // Create a ResizeObserver to detect content changes
    const resizeObserver = new ResizeObserver(() => {
      triggerCheck();
    });
    
    resizeObserver.observe(container);

    // Check initial position
    triggerCheck();

    return () => {
      container.removeEventListener('scroll', checkScrollPosition);
      resizeObserver.disconnect();
    };
  }, [checkScrollPosition, triggerCheck]);

  return {
    showScrollButton,
    scrollToBottom,
    triggerCheck
  };
};