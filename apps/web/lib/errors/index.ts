// Custom error classes (excluding AuthenticationError to avoid conflict)
export {
  ErrorCode,
  BaseError,
  BasicAuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  InternalServerError,
  BadRequestError,
  ForbiddenError,
  UnprocessableEntityError,
  TooManyRequestsError,
  ServiceUnavailableError,
  UnauthorizedError,
  DatabaseError,
  ExternalServiceError,
  ConfigurationError,
  NetworkError,
  TimeoutError,
  CacheError,
  QueueError,
  FileSystemError,
  PermissionError,
  ResourceExhaustedError,
  DependencyError,
  CorruptionError,
  SecurityError,
  ComplianceError,
  BusinessRuleError,
  WorkflowError,
  IntegrationError,
  MigrationError,
  CompatibilityError,
  LicenseError,
  QuotaExceededError,
  MaintenanceError,
  DeprecationError
} from './custom-errors';

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

// Authentication error handling system (primary AuthenticationError)
export * from './authentication-errors';
export * from './clerk-error-mapper';
export * from './auth-error-logger';

// Re-export commonly used types and functions
export type { ApiErrorResponse } from './api-error-handler';
export type { ValidationResult } from '../validation/form-validation';