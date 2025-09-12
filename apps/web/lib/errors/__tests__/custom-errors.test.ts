import { describe, it, expect, beforeEach } from 'vitest';
import {
  ErrorCode,
  BaseError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalServerError,
  DatabaseError,
  ExternalServiceError,
} from '../custom-errors';

describe('Custom Error Classes', () => {
  const mockRequestId = 'test-request-id';
  const mockDetails = { test: 'details' };

  describe('BaseError', () => {
    class TestError extends BaseError {
      readonly code = ErrorCode.INTERNAL_SERVER_ERROR;
      readonly statusCode = 500;
    }

    it('should create error with required properties', () => {
      const error = new TestError('Test message');
      
      expect(error.message).toBe('Test message');
      expect(error.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.timestamp).toBeDefined();
      expect(error.name).toBe('TestError');
    });

    it('should include optional properties when provided', () => {
      const error = new TestError('Test message', mockDetails, mockRequestId);
      
      expect(error.details).toEqual(mockDetails);
      expect(error.requestId).toBe(mockRequestId);
    });

    it('should serialize to JSON correctly', () => {
      const error = new TestError('Test message', mockDetails, mockRequestId);
      const json = error.toJSON();
      
      expect(json).toEqual({
        name: 'TestError',
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Test message',
        statusCode: 500,
        timestamp: error.timestamp,
        requestId: mockRequestId,
        details: mockDetails,
      });
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error with correct status code', () => {
      const error = new AuthenticationError(
        ErrorCode.INVALID_CREDENTIALS,
        'Invalid credentials'
      );
      
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe(ErrorCode.INVALID_CREDENTIALS);
      expect(error.message).toBe('Invalid credentials');
    });
  });

  describe('AuthorizationError', () => {
    it('should create authorization error with correct status code', () => {
      const error = new AuthorizationError(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        'Insufficient permissions'
      );
      
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe(ErrorCode.INSUFFICIENT_PERMISSIONS);
      expect(error.message).toBe('Insufficient permissions');
    });
  });

  describe('ValidationError', () => {
    const fieldErrors = {
      email: ['Invalid email format'],
      password: ['Password too weak'],
    };

    it('should create validation error with field errors', () => {
      const error = new ValidationError(
        ErrorCode.INVALID_INPUT_FORMAT,
        'Validation failed',
        fieldErrors
      );
      
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(ErrorCode.INVALID_INPUT_FORMAT);
      expect(error.fieldErrors).toEqual(fieldErrors);
    });

    it('should serialize field errors in JSON', () => {
      const error = new ValidationError(
        ErrorCode.INVALID_INPUT_FORMAT,
        'Validation failed',
        fieldErrors
      );
      
      const json = error.toJSON();
      expect(json.fieldErrors).toEqual(fieldErrors);
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error with correct status code', () => {
      const error = new NotFoundError(
        ErrorCode.ORGANIZATION_NOT_FOUND,
        'Organization not found'
      );
      
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe(ErrorCode.ORGANIZATION_NOT_FOUND);
    });
  });

  describe('ConflictError', () => {
    it('should create conflict error with correct status code', () => {
      const error = new ConflictError(
        ErrorCode.DUPLICATE_ORGANIZATION,
        'Organization already exists'
      );
      
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe(ErrorCode.DUPLICATE_ORGANIZATION);
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error with retry after', () => {
      const retryAfter = 60;
      const error = new RateLimitError('Rate limit exceeded', retryAfter);
      
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe(ErrorCode.RATE_LIMIT_EXCEEDED);
      expect(error.retryAfter).toBe(retryAfter);
    });

    it('should include retry after in JSON', () => {
      const retryAfter = 60;
      const error = new RateLimitError('Rate limit exceeded', retryAfter);
      
      const json = error.toJSON();
      expect(json.retryAfter).toBe(retryAfter);
    });
  });

  describe('InternalServerError', () => {
    it('should create internal server error with default message', () => {
      const error = new InternalServerError();
      
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
      expect(error.message).toBe('Internal server error');
    });
  });

  describe('DatabaseError', () => {
    it('should create database error with operation', () => {
      const operation = 'SELECT';
      const error = new DatabaseError('Database query failed', operation);
      
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe(ErrorCode.DATABASE_ERROR);
      expect(error.operation).toBe(operation);
    });

    it('should include operation in JSON', () => {
      const operation = 'INSERT';
      const error = new DatabaseError('Insert failed', operation);
      
      const json = error.toJSON();
      expect(json.operation).toBe(operation);
    });
  });

  describe('ExternalServiceError', () => {
    it('should create external service error with service name', () => {
      const service = 'Clerk';
      const error = new ExternalServiceError('Service unavailable', service);
      
      expect(error.statusCode).toBe(502);
      expect(error.code).toBe(ErrorCode.EXTERNAL_SERVICE_ERROR);
      expect(error.service).toBe(service);
    });

    it('should include service in JSON', () => {
      const service = 'Supabase';
      const error = new ExternalServiceError('Connection failed', service);
      
      const json = error.toJSON();
      expect(json.service).toBe(service);
    });
  });
});