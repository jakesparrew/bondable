/**
 * Centralized error handling and retry mechanisms
 * Provides consistent error handling patterns across all services
 */

// Enhanced error types for better type safety
export type AppError = Error | string | { message: string; code?: string | number; status?: number };

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBase: number;
  retryCondition?: (error: AppError) => boolean;
}

export interface ErrorContext {
  operation: string;
  service: string;
  userAgent?: string;
  userId?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export class ServiceError extends Error {
  public readonly code: string;
  public readonly context: ErrorContext;
  public readonly originalError?: Error;
  public readonly retryable: boolean;

  constructor(
    message: string,
    code: string,
    context: ErrorContext,
    originalError?: Error,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.context = context;
    this.originalError = originalError;
    this.retryable = retryable;
  }
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: ServiceError[] = [];
  private readonly maxLogSize = 1000;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle and log errors with proper context
   */
  handleError(
    error: AppError,
    context: ErrorContext,
    shouldThrow: boolean = true
  ): ServiceError {
    const serviceError = this.createServiceError(error, context);
    
    // Log error
    this.logError(serviceError);
    
    // Send to monitoring service (if configured)
    this.reportError(serviceError);
    
    if (shouldThrow) {
      throw serviceError;
    }
    
    return serviceError;
  }

  /**
   * Retry mechanism with exponential backoff
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const retryConfig: RetryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      exponentialBase: 2,
      retryCondition: (error) => this.isRetryableError(error),
      ...config
    };

    let lastError: AppError;
    
    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        console.log(`🔄 ${context.service}.${context.operation}: Attempt ${attempt + 1}/${retryConfig.maxRetries + 1}`);
        
        const result = await operation();
        
        if (attempt > 0) {
          console.log(`✅ ${context.service}.${context.operation}: Succeeded after ${attempt + 1} attempts`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        // Don't retry on the last attempt
        if (attempt === retryConfig.maxRetries) {
          break;
        }

        // Check if error is retryable
        if (!retryConfig.retryCondition!(error)) {
          console.log(`❌ ${context.service}.${context.operation}: Error not retryable, aborting`);
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(retryConfig.exponentialBase, attempt),
          retryConfig.maxDelay
        );

        console.log(`⏳ ${context.service}.${context.operation}: Retrying in ${delay}ms`);
        await this.sleep(delay);
      }
    }

    // All retries failed
    throw this.handleError(lastError, {
      ...context,
      metadata: {
        ...context.metadata,
        attempts: retryConfig.maxRetries + 1,
        failed: true
      }
    });
  }

  /**
   * Handle network timeouts with automatic retry
   */
  async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    context: ErrorContext
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([operation(), timeoutPromise]);
    } catch (error) {
      throw this.handleError(error, {
        ...context,
        metadata: {
          ...context.metadata,
          timeout: timeoutMs,
          timedOut: true
        }
      });
    }
  }

  /**
   * Circuit breaker pattern for failing services
   */
  createCircuitBreaker<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    config: {
      failureThreshold: number;
      resetTimeout: number;
      monitoringPeriod: number;
    } = {
      failureThreshold: 5,
      resetTimeout: 60000,
      monitoringPeriod: 10000
    }
  ) {
    let failures = 0;
    let lastFailureTime = 0;
    let state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

    return async (): Promise<T> => {
      const now = Date.now();

      // Reset failures after monitoring period
      if (now - lastFailureTime > config.monitoringPeriod) {
        failures = 0;
      }

      // Check if circuit should be half-open
      if (state === 'OPEN' && now - lastFailureTime > config.resetTimeout) {
        state = 'HALF_OPEN';
        console.log(`🔄 Circuit breaker HALF_OPEN for ${context.service}.${context.operation}`);
      }

      // Reject immediately if circuit is open
      if (state === 'OPEN') {
        throw this.handleError(
          new Error('Circuit breaker is OPEN'),
          {
            ...context,
            metadata: {
              ...context.metadata,
              circuitBreakerState: state,
              failures
            }
          }
        );
      }

      try {
        const result = await operation();
        
        // Reset on success
        if (state === 'HALF_OPEN') {
          state = 'CLOSED';
          failures = 0;
          console.log(`✅ Circuit breaker CLOSED for ${context.service}.${context.operation}`);
        }
        
        return result;
      } catch (error) {
        failures++;
        lastFailureTime = now;

        // Open circuit if threshold exceeded
        if (failures >= config.failureThreshold) {
          state = 'OPEN';
          console.log(`🚨 Circuit breaker OPEN for ${context.service}.${context.operation} (${failures} failures)`);
        }

        throw error;
      }
    };
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByService: Record<string, number>;
    errorsByCode: Record<string, number>;
    recentErrors: ServiceError[];
  } {
    const errorsByService: Record<string, number> = {};
    const errorsByCode: Record<string, number> = {};

    this.errorLog.forEach(error => {
      errorsByService[error.context.service] = (errorsByService[error.context.service] || 0) + 1;
      errorsByCode[error.code] = (errorsByCode[error.code] || 0) + 1;
    });

    return {
      totalErrors: this.errorLog.length,
      errorsByService,
      errorsByCode,
      recentErrors: this.errorLog.slice(-10)
    };
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
    console.log('🧹 ErrorHandler: Cleared error log');
  }

  /**
   * Create a standardized service error
   */
  private createServiceError(error: AppError, context: ErrorContext): ServiceError {
    let message: string;
    let code: string;
    let retryable = false;

    if (error instanceof ServiceError) {
      return error;
    }

    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      message = error.message;
    } else {
      message = 'An unknown error occurred';
    }

    // Determine error code and retryability
    if (error && typeof error === 'object' && 'code' in error && error.code === 'PGRST116') {
      code = 'NOT_FOUND';
      retryable = false;
    } else if (message.includes('network')) {
      code = 'NETWORK_ERROR';
      retryable = true;
    } else if (message.includes('timeout')) {
      code = 'TIMEOUT';
      retryable = true;
    } else if (error && typeof error === 'object' && 'status' in error && typeof error.status === 'number' && error.status >= 500) {
      code = 'SERVER_ERROR';
      retryable = true;
    } else if (error && typeof error === 'object' && 'status' in error && typeof error.status === 'number' && error.status >= 400) {
      code = 'CLIENT_ERROR';
      retryable = false;
    } else {
      code = 'UNKNOWN_ERROR';
      retryable = false;
    }

    return new ServiceError(message, code, context, error instanceof Error ? error : undefined, retryable);
  }

  /**
   * Log error to internal log
   */
  private logError(error: ServiceError): void {
    // Add to internal log
    this.errorLog.push(error);
    
    // Maintain log size
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }

    // Console logging
    console.error(`❌ ${error.context.service}.${error.context.operation}:`, {
      message: error.message,
      code: error.code,
      retryable: error.retryable,
      context: error.context,
      originalError: error.originalError
    });
  }

  /**
   * Report error to monitoring service
   */
  private reportError(error: ServiceError): void {
    // Here you would integrate with your monitoring service
    // For now, we'll just log critical errors
    if (['SERVER_ERROR', 'TIMEOUT', 'NETWORK_ERROR'].includes(error.code)) {
      console.warn('🚨 Critical error reported:', {
        service: error.context.service,
        operation: error.context.operation,
        code: error.code,
        message: error.message,
        timestamp: new Date(error.context.timestamp).toISOString()
      });
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: AppError): boolean {
    let message = '';
    
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      message = error.message;
    }

    // Network errors
    if (message.includes('network') || message.includes('fetch')) {
      return true;
    }

    // Timeout errors
    if (message.includes('timeout')) {
      return true;
    }

    // Server errors (5xx)
    if (error && typeof error === 'object' && 'status' in error && typeof error.status === 'number' && error.status >= 500) {
      return true;
    }

    // Specific database errors that might be temporary
    if (error && typeof error === 'object' && 'code' in error && (error.code === 'PGRST301' || error.code === 'PGRST204')) {
      return true;
    }

    return false;
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Convenience functions
export const withRetry = <T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  config?: Partial<RetryConfig>
) => errorHandler.withRetry(operation, context, config);

export const withTimeout = <T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  context: ErrorContext
) => errorHandler.withTimeout(operation, timeoutMs, context);

export const handleServiceError = (
  error: AppError,
  context: ErrorContext,
  shouldThrow?: boolean
) => errorHandler.handleError(error, context, shouldThrow);