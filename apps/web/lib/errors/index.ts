// Custom error classes
export * from './custom-errors';

// Error utilities and helpers
export { 
  handleApiError, 
  createErrorResponse, 
  logError,
  formatErrorForClient,
  getErrorCode,
  getErrorMessage
} from './error-utils';

// API error handling
export * from './api-error-handler';

// Authentication error handling system
export * from './authentication-errors';
export * from './clerk-error-mapper';
export * from './auth-error-logger';

// Re-export commonly used types and functions
export type { ApiErrorResponse } from './api-error-handler';
export type { ValidationResult } from '../validation/form-validation';