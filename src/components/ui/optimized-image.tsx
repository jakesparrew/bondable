/**
 * OptimizedImage Component
 * 
 * A performance-optimized image component that implements:
 * - Progressive loading with placeholder
 * - Lazy loading with intersection observer
 * - Responsive image sizing
 * - Error handling with fallbacks
 * - Automatic format optimization
 * 
 * @example
 * ```tsx
 * <OptimizedImage
 *   src="/path/to/image.jpg"
 *   alt="Description"
 *   width={400}
 *   height={300}
 *   placeholder="/path/to/placeholder.jpg"
 *   priority={false}
 * />
 * ```
 */

import { useState, useRef, useEffect, memo } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps {
  /** Image source URL */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** Image width */
  width?: number;
  /** Image height */
  height?: number;
  /** Placeholder image or base64 blur */
  placeholder?: string;
  /** CSS classes */
  className?: string;
  /** Priority loading (skip lazy loading) */
  priority?: boolean;
  /** Sizes attribute for responsive images */
  sizes?: string;
  /** Callback when image loads */
  onLoad?: () => void;
  /** Callback when image fails to load */
  onError?: () => void;
}

/**
 * Optimized image component with progressive loading
 */
const OptimizedImage = memo(({
  src,
  alt,
  width,
  height,
  placeholder,
  className,
  priority = false,
  sizes,
  onLoad,
  onError,
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "50px", // Start loading 50px before image enters viewport
        threshold: 0.1,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority, isInView]);

  // Handle image load
  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.();
  };

  // Handle image error
  const handleError = () => {
    setHasError(true);
    setIsLoaded(false);
    onError?.();
  };

  // Generate responsive srcset if width is provided
  const generateSrcSet = (baseSrc: string, baseWidth: number) => {
    const scales = [1, 1.5, 2];
    return scales
      .map(scale => {
        const scaledWidth = Math.round(baseWidth * scale);
        return `${baseSrc}?w=${scaledWidth}&q=80 ${scale}x`;
      })
      .join(", ");
  };

  const imageStyles = {
    width: width ? `${width}px` : '100%',
    height: height ? `${height}px` : 'auto',
    aspectRatio: width && height ? `${width}/${height}` : undefined,
  };

  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-hidden bg-muted", className)}
      style={imageStyles}
    >
      {/* Placeholder */}
      {!isLoaded && placeholder && (
        <img
          src={placeholder}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-sm scale-110 transition-opacity duration-300"
          style={{ opacity: hasError ? 0 : 1 }}
        />
      )}

      {/* Loading skeleton */}
      {!isLoaded && !placeholder && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted-foreground/10 to-muted animate-pulse" />
      )}

      {/* Main image */}
      {isInView && !hasError && (
        <img
          ref={imgRef}
          src={src}
          srcSet={width ? generateSrcSet(src, width) : undefined}
          sizes={sizes || (width ? `${width}px` : "100vw")}
          alt={alt}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
        />
      )}

      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-2 opacity-50">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
              </svg>
            </div>
            <p className="text-xs">Image not available</p>
          </div>
        </div>
      )}
    </div>
  );
});

OptimizedImage.displayName = "OptimizedImage";

export default OptimizedImage;