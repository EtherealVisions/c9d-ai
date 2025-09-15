import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  generateRequestId,
  getRequestId,
  formatApiError,
  createErrorResponse,
  handleApiError,
  withErrorHandler,
  errorHandlerMiddleware,
  createValidationErrorResponse,
  createSuccessResponse,
} from '../api-error-handler';
import { RateLimitError } from '../custom-errors';
import {
  createInvalidCredentialsError,
  createInvalidEmailError,
  createAuthenticationError,
} from '../error-utils';
import { ErrorCode } from '../custom-errors';

// Mock NextResponse
vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: vi.fn((data, options) => ({
      data,
      status: options?.status || 200,
      headers: options?.headers || {},
    })),
  },
}));

describe('API Error Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateRequestId', () => {
    it('should generate unique request IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      
      expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('getRequestId', () => {
    it('should extract request ID from headers', () => {
      const mockRequest = {
        headers: {
          get: vi.fn().mockReturnValue('existing-request-id'),
        },
      } as unknown as NextRequest;
      
      const requestId = getRequestId(mockRequest);
      
      expect(requestId).toBe('existing-request-id');
      expect(mockRequest.headers.get).toHaveBeenCalledWith('x-request-id');
    });

    it('should generate new request ID when header is missing', () => {
      const mockRequest = {
        headers: {
          get: vi.fn().mockReturnValue(null),
        },
      } as unknown as NextRequest;
      
      const requestId = getRequestId(mockRequest);
      
      expect(requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
    });

    it('should generate new request ID when no request provided', () => {
      const requestId = getRequestId();
      
      expect(requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
    });
  });

  describe('formatApiError', () => {
    it('should format basic error correctly', () => {
      const error = createInvalidCredentialsError('test-request-id');
      const formatted = formatApiError(error, 'test-request-id');
      
      expect(formatted).toEqual({
        error: {
          code: error.code,
          message: error.message,
          timestamp: error.timestamp.toISOString(),
          requestId: 'test-request-id',
        },
      });
    });

    it('should include details when present', () => {
      const error = createAuthenticationError(
        ErrorCode.INVALID_CREDENTIALS,
        'Invalid credentials',
        { test: 'details' },
        'test-request-id'
      );
      const formatted = formatApiError(error, 'test-request-id');
      
      expect(formatted.error.details).toEqual({ test: 'details' });
    });

    it('should include field errors for validation errors', () => {
      const error = createInvalidEmailError('invalid@');
      const formatted = formatApiError(error, 'test-request-id');
      
      expect(formatted.error.fieldErrors).toEqual({
        email: ['Must be a valid email address'],
      });
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response with correct status and headers', () => {
      const error = createInvalidCredentialsError();
      const requestId = 'test-request-id';
      
      const response = createErrorResponse(error, requestId);
      
      expect(NextResponse.json).toHaveBeenCalledWith(
        formatApiError(error, requestId),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
          },
        }
      );
    });

    it('should include retry-after header for rate limit errors', () => {
      const error = new RateLimitError('Rate limited', 60);
      const requestId = 'test-request-id';
      
      const response = createErrorResponse(error, requestId);
      
      expect(NextResponse.json).toHaveBeenCalledWith(
        formatApiError(error, requestId),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
            'Retry-After': '60',
          },
        }
      );
    });

    it('should merge custom headers', () => {
      const error = createInvalidCredentialsError();
      const requestId = 'test-request-id';
      const customHeaders = { 'Custom-Header': 'value' };
      
      const response = createErrorResponse(error, requestId, customHeaders);
      
      expect(NextResponse.json).toHaveBeenCalledWith(
        formatApiError(error, requestId),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
            'Custom-Header': 'value',
          },
        }
      );
    });
  });

  describe('handleApiError', () => {
    it('should handle BaseError instances', () => {
      const error = createInvalidCredentialsError();
      const mockRequest = {
        url: 'https://example.com/api/test',
        method: 'POST',
        headers: {
          get: vi.fn().mockImplementation((header) => {
            if (header === 'x-request-id') return 'test-request-id';
            if (header === 'user-agent') return 'test-agent';
            if (header === 'x-forwarded-for') return '127.0.0.1';
            return null;
          }),
        },
      } as unknown as NextRequest;
      
      const response = handleApiError(error, mockRequest, { userId: '123' });
      
      expect(NextResponse.json).toHaveBeenCalled();
    });

    it('should handle regular Error instances', () => {
      const error = new Error('Regular error');
      const response = handleApiError(error);
      
      expect(NextResponse.json).toHaveBeenCalled();
    });

    it('should handle string errors', () => {
      const error = 'String error';
      const response = handleApiError(error);
      
      expect(NextResponse.json).toHaveBeenCalled();
    });
  });

  describe('withErrorHandler', () => {
    it('should return result when handler succeeds', async () => {
      const handler = vi.fn().mockResolvedValue('success');
      const wrappedHandler = withErrorHandler(handler);
      
      const result = await wrappedHandler('arg1', 'arg2');
      
      expect(result).toBe('success');
      expect(handler).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should handle errors when handler throws', async () => {
      const error = createInvalidCredentialsError();
      const handler = vi.fn().mockRejectedValue(error);
      const wrappedHandler = withErrorHandler(handler);
      
      const result = await wrappedHandler('arg1', 'arg2');
      
      expect(NextResponse.json).toHaveBeenCalled();
    });

    it('should extract NextRequest from arguments', async () => {
      const error = createInvalidCredentialsError();
      const handler = vi.fn().mockRejectedValue(error);
      const wrappedHandler = withErrorHandler(handler);
      const mockRequest = {
        headers: { get: vi.fn() },
      } as unknown as NextRequest;
      
      const result = await wrappedHandler(mockRequest, 'other-arg');
      
      expect(NextResponse.json).toHaveBeenCalled();
    });
  });

  describe('errorHandlerMiddleware', () => {
    it('should return result when handler succeeds', async () => {
      const mockResponse = { status: 200 } as NextResponse;
      const handler = vi.fn().mockResolvedValue(mockResponse);
      const middleware = errorHandlerMiddleware(handler);
      const mockRequest = {} as NextRequest;
      
      const result = await middleware(mockRequest, { test: 'context' });
      
      expect(result).toBe(mockResponse);
      expect(handler).toHaveBeenCalledWith(mockRequest, { test: 'context' });
    });

    it('should handle errors when handler throws', async () => {
      const error = createInvalidCredentialsError();
      const handler = vi.fn().mockRejectedValue(error);
      const middleware = errorHandlerMiddleware(handler);
      const mockRequest = {
        headers: { get: vi.fn() },
      } as unknown as NextRequest;
      
      const result = await middleware(mockRequest, { test: 'context' });
      
      expect(NextResponse.json).toHaveBeenCalled();
    });
  });

  describe('createValidationErrorResponse', () => {
    it('should create validation error response', () => {
      const fieldErrors = {
        email: ['Invalid format'],
        password: ['Too weak'],
      };
      
      const response = createValidationErrorResponse(fieldErrors, 'Validation failed', 'test-id');
      
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            fieldErrors,
            requestId: 'test-id',
          }),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'X-Request-ID': 'test-id' } }
      );
    });

    it('should use default message when not provided', () => {
      const fieldErrors = { email: ['Invalid'] };
      
      const response = createValidationErrorResponse(fieldErrors);
      
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Validation failed',
          }),
        }),
        expect.any(Object)
      );
    });
  });

  describe('createSuccessResponse', () => {
    it('should create success response with default status', () => {
      const data = { test: 'data' };
      
      const response = createSuccessResponse(data);
      
      expect(NextResponse.json).toHaveBeenCalledWith(
        { data, success: true },
        { status: 200, headers: undefined }
      );
    });

    it('should create success response with custom status and headers', () => {
      const data = { test: 'data' };
      const headers = { 'Custom-Header': 'value' };
      
      const response = createSuccessResponse(data, 201, headers);
      
      expect(NextResponse.json).toHaveBeenCalledWith(
        { data, success: true },
        { status: 201, headers }
      );
    });
  });
});