/**
 * Utility Functions
 * 
 * Core utility functions used throughout the application for common operations
 * like class name merging, styling, and data manipulation.
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines and merges class names using clsx and tailwind-merge
 * 
 * This utility function combines multiple class values and resolves
 * conflicting Tailwind CSS classes, ensuring the most specific class wins.
 * 
 * @param inputs - Variable number of class values (strings, objects, arrays)
 * @returns Merged and optimized class string
 * 
 * @example
 * ```tsx
 * // Basic usage
 * cn("px-4 py-2", "bg-blue-500")
 * // Returns: "px-4 py-2 bg-blue-500"
 * 
 * // Conditional classes
 * cn("px-4 py-2", { "bg-red-500": isError, "bg-green-500": isSuccess })
 * 
 * // Resolving conflicts (twMerge)
 * cn("px-4 py-2", "px-6") 
 * // Returns: "py-2 px-6" (px-6 overrides px-4)
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
