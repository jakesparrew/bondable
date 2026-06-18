/**
 * PERFORMANCE-OPTIMIZED COMPONENT HOOKS
 * 
 * Drop-in replacements for standard React hooks with performance optimizations
 */

import { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo,
  useRef,
  type DependencyList,
  type SetStateAction
} from 'react';

// Shallow equality check optimized for performance
const shallowEqual = (a: readonly unknown[], b: readonly unknown[]): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
};

/**
 * Optimized useState that prevents unnecessary re-renders
 */
export const useOptimizedState = <T>(
  initialState: T | (() => T)
): [T, (value: SetStateAction<T>) => void] => {
  const [state, setState] = useState(initialState);
  
  const optimizedSetState = useCallback((value: SetStateAction<T>) => {
    setState(prev => {
      const newValue = typeof value === 'function' 
        ? (value as (prev: T) => T)(prev) 
        : value;
      
      // Prevent re-render if value hasn't changed
      if (Object.is(prev, newValue)) return prev;
      
      // For objects/arrays, do shallow comparison
      if (typeof prev === 'object' && typeof newValue === 'object' && 
          prev !== null && newValue !== null) {
        if (Array.isArray(prev) && Array.isArray(newValue)) {
          if (prev.length === newValue.length && 
              prev.every((item, index) => Object.is(item, newValue[index]))) {
            return prev;
          }
        }
      }
      
      return newValue;
    });
  }, []);
  
  return [state, optimizedSetState];
};

/**
 * Optimized useCallback with better dependency checking
 */
export const useOptimizedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: DependencyList = []
): T => {
  const ref = useRef<{ deps: DependencyList; callback: T }>();
  
  if (!ref.current || !shallowEqual(deps, ref.current.deps)) {
    ref.current = { deps, callback };
  }
  
  return ref.current.callback;
};

/**
 * Optimized useMemo with enhanced dependency checking
 */
export const useOptimizedMemo = <T>(
  factory: () => T,
  deps: DependencyList = []
): T => {
  const ref = useRef<{ deps: DependencyList; value: T }>();
  
  if (!ref.current || !shallowEqual(deps, ref.current.deps)) {
    ref.current = { deps, value: factory() };
  }
  
  return ref.current.value;
};

/**
 * Optimized useEffect with debouncing and conditional execution
 */
export const useOptimizedEffect = (
  effect: React.EffectCallback,
  deps?: DependencyList,
  options?: {
    skipFirstRun?: boolean;
    debounce?: number;
    condition?: () => boolean;
  }
) => {
  const { skipFirstRun = false, debounce = 0, condition } = options || {};
  const isFirstRun = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const prevDepsRef = useRef<DependencyList>();
  
  useEffect(() => {
    // Skip if condition is not met
    if (condition && !condition()) return;
    
    // Skip first run if requested
    if (skipFirstRun && isFirstRun.current) {
      isFirstRun.current = false;
      prevDepsRef.current = deps;
      return;
    }
    
    // Skip if dependencies haven't changed
    if (prevDepsRef.current && deps && shallowEqual(deps, prevDepsRef.current)) {
      return;
    }
    
    prevDepsRef.current = deps;
    
    // Apply debouncing if requested
    if (debounce > 0) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        return effect();
      }, debounce);
      
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
    
    return effect();
  }, deps);
};
