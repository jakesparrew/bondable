/**
 * Avatar Component with Optimization
 * 
 * An optimized avatar component that provides:
 * - Automatic image optimization
 * - Fallback to initials
 * - Multiple size variants
 * - Loading states
 * - Caching support
 * 
 * @example
 * ```tsx
 * <OptimizedAvatar
 *   src="/path/to/avatar.jpg"
 *   name="John Doe"
 *   size="md"
 *   className="ring-2 ring-primary"
 * />
 * ```
 */

import { useState, useMemo, memo } from "react";
import { cn } from "@/lib/utils";

interface OptimizedAvatarProps {
  /** Avatar image URL */
  src?: string | null;
  /** User's name for fallback initials */
  name?: string;
  /** Avatar size variant */
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  /** CSS classes */
  className?: string;
  /** Alt text override */
  alt?: string;
}

/**
 * Size configuration for avatar variants
 */
const AVATAR_SIZES = {
  xs: { size: "h-6 w-6", text: "text-xs", px: 16 },
  sm: { size: "h-8 w-8", text: "text-sm", px: 24 },
  md: { size: "h-10 w-10", text: "text-base", px: 32 },
  lg: { size: "h-12 w-12", text: "text-lg", px: 40 },
  xl: { size: "h-16 w-16", text: "text-xl", px: 56 },
  "2xl": { size: "h-20 w-20", text: "text-2xl", px: 72 },
} as const;

/**
 * Optimized avatar component
 */
const OptimizedAvatar = memo(({
  src,
  name = "",
  size = "md",
  className,
  alt,
}: OptimizedAvatarProps) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(!!src);

  const sizeConfig = AVATAR_SIZES[size];

  // Generate initials from name
  const initials = useMemo(() => {
    if (!name) return "?";
    
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  }, [name]);

  // Generate optimized image URL
  const optimizedSrc = useMemo(() => {
    if (!src) return null;
    
    // Add optimization parameters
    const url = new URL(src, window.location.origin);
    url.searchParams.set('w', sizeConfig.px.toString());
    url.searchParams.set('h', sizeConfig.px.toString());
    url.searchParams.set('q', '80');
    url.searchParams.set('f', 'webp');
    
    return url.toString();
  }, [src, sizeConfig.px]);

  // Generate background color from name
  const backgroundColor = useMemo(() => {
    if (!name) return 'hsl(var(--muted))';
    
    // Generate a consistent color based on the name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Convert to HSL for consistent lightness
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 45%)`;
  }, [name]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const shouldShowImage = optimizedSrc && !hasError && !isLoading;
  const shouldShowPlaceholder = !shouldShowImage;

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0",
        sizeConfig.size,
        className
      )}
      style={{
        backgroundColor: shouldShowPlaceholder ? backgroundColor : 'transparent',
      }}
    >
      {/* Image */}
      {optimizedSrc && (
        <img
          src={optimizedSrc}
          alt={alt || `${name}'s avatar`}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-200",
            shouldShowImage ? "opacity-100" : "opacity-0"
          )}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          decoding="async"
        />
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}

      {/* Initials fallback */}
      {shouldShowPlaceholder && (
        <span
          className={cn(
            "font-medium text-white select-none",
            sizeConfig.text
          )}
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
        >
          {initials}
        </span>
      )}
    </div>
  );
});

OptimizedAvatar.displayName = "OptimizedAvatar";

export default OptimizedAvatar;