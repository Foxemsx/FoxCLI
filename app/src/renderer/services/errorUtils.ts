/**
 * Error handling utilities for user-friendly error messages
 */

export interface ParsedError {
  title: string;
  message: string;
  suggestion?: string;
  retryable: boolean;
}

/**
 * Parse an error into a user-friendly format
 */
export function parseError(error: unknown): ParsedError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Authentication errors
  if (lowerMessage.includes('401') || lowerMessage.includes('unauthorized') || lowerMessage.includes('authentication')) {
    return {
      title: 'Session Expired',
      message: 'Your MAL session has expired.',
      suggestion: 'Please reconnect your account to continue.',
      retryable: false,
    };
  }

  // Rate limiting
  if (lowerMessage.includes('429') || lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
    return {
      title: 'Rate Limited',
      message: 'Too many requests. The API is temporarily limiting access.',
      suggestion: 'Please wait a moment and try again.',
      retryable: true,
    };
  }

  // Network errors
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('failed to fetch') || lowerMessage.includes('econnrefused')) {
    return {
      title: 'Connection Error',
      message: 'Unable to connect to the server.',
      suggestion: 'Check your internet connection and try again.',
      retryable: true,
    };
  }

  // Timeout
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out') || lowerMessage.includes('aborted')) {
    return {
      title: 'Request Timeout',
      message: 'The request took too long to complete.',
      suggestion: 'The server might be busy. Please try again.',
      retryable: true,
    };
  }

  // Server errors
  if (lowerMessage.includes('500') || lowerMessage.includes('502') || lowerMessage.includes('503') || lowerMessage.includes('504') || lowerMessage.includes('server error')) {
    return {
      title: 'Server Error',
      message: 'The server encountered an error.',
      suggestion: 'This is usually temporary. Please try again later.',
      retryable: true,
    };
  }

  // MAL-specific errors
  if (lowerMessage.includes('mal') || lowerMessage.includes('myanimelist')) {
    return {
      title: 'MAL Error',
      message: 'MyAnimeList returned an error.',
      suggestion: 'MAL might be experiencing issues. Try again later.',
      retryable: true,
    };
  }

  // Jikan-specific errors
  if (lowerMessage.includes('jikan')) {
    return {
      title: 'Anime Data Error',
      message: 'Unable to fetch anime information.',
      suggestion: 'The anime database might be temporarily unavailable.',
      retryable: true,
    };
  }

  // Discord RPC errors
  if (lowerMessage.includes('discord') || lowerMessage.includes('rpc')) {
    return {
      title: 'Discord Error',
      message: 'Unable to connect to Discord.',
      suggestion: 'Make sure Discord is running and try again.',
      retryable: true,
    };
  }

  // OAuth errors
  if (lowerMessage.includes('oauth') || lowerMessage.includes('token')) {
    return {
      title: 'Authentication Error',
      message: 'There was a problem with authentication.',
      suggestion: 'Please try logging in again.',
      retryable: false,
    };
  }

  // Generic fallback
  return {
    title: 'Something Went Wrong',
    message: errorMessage || 'An unexpected error occurred.',
    suggestion: 'Please try again. If the problem persists, restart the app.',
    retryable: true,
  };
}

/**
 * Get a short error message for inline display
 */
export function getShortErrorMessage(error: unknown): string {
  const parsed = parseError(error);
  return parsed.message;
}

/**
 * Log error with context for debugging
 */
export function logError(context: string, error: unknown): void {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  
  console.error(`[${timestamp}] [${context}] Error:`, errorMessage);
  if (stack) {
    console.error('Stack trace:', stack);
  }
}

/**
 * Create a delayed retry function with exponential backoff
 */
export function createRetryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): () => Promise<T> {
  return async () => {
    let lastError: unknown;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const parsed = parseError(error);
        
        if (!parsed.retryable || attempt === maxRetries - 1) {
          throw error;
        }
        
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  };
}
