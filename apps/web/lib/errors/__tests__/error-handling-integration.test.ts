import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ErrorCode } from '../custom-errors';
import {
  createInvalidCredentialsError,
  createValidationError,
  createOrganizationNotFoundError,
} from '../error-utils';
import {
  handleApiError,
  withErrorHandler,
  createSuccessResponse,
} from '../api-error-handler';
import {
  validateOrThrow,
  userProfileSchema,
} from '../../validation/form-validation';

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

describe('Error Handling Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('API Error Handling Flow', () => {
    it('should handle authentication errors in API routes', async () => {
      const mockHandler = vi.fn().mockImplementation(() => {
        throw createInvalidCredentialsError('test-request-id');
      });

      const wrappedHandler = withErrorHandler(mockHandler);
      const mockRequest = {
        url: 'https://example.com/api/auth/signin',
        method: 'POST',
        headers: {
          get: vi.fn().mockImplementation((header) => {
            if (header === 'x-request-id') return 'test-request-id';
            if (header === 'user-agent') return 'test-agent';
            return null;
          }),
        },
      } as unknown as NextRequest;

      const response = await wrappedHandler(mockRequest);

      expect(response).toEqual({
        data: {
          error: {
            code: ErrorCode.INVALID_CREDENTIALS,
            message: 'Invalid email or password provided',
            timestamp: expect.any(String),
            requestId: 'test-request-id',
          },
        },
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': 'test-request-id',
        },
      });
    });

    it('should handle validation errors with field details', async () => {
      const mockHandler = vi.fn().mockImplementation(() => {
        const invalidData = {
          email: 'invalid-email',
          firstName: '',
        };
        
        // This will throw a ValidationError
        validateOrThrow(userProfileSchema, invalidData, 'test-request-id');
      });

      const wrappedHandler = withErrorHandler(mockHandler);
      const response = await wrappedHandler();

      expect(response.status).toBe(400);
      expect(response.data.error.code).toBe(ErrorCode.INVALID_INPUT_FORMAT);
      expect(response.data.error.fieldErrors).toBeDefined();
      expect(response.data.error.fieldErrors.email).toContain('Please enter a valid email address');
    });

    it('should handle not found errors', async () => {
      const mockHandler = vi.fn().mockImplementation(() => {
        throw createOrganizationNotFoundError('org-123', 'test-request-id');
      });

      const wrappedHandler = withErrorHandler(mockHandler);
      const response = await wrappedHandler();

      expect(response.status).toBe(404);
      expect(response.data.error.code).toBe(ErrorCode.ORGANIZATION_NOT_FOUND);
      expect(response.data.error.details).toEqual({ organizationId: 'org-123' });
    });

    it('should handle successful responses', async () => {
      const mockData = { user: { id: '123', email: 'test@example.com' } };
      const mockHandler = vi.fn().mockResolvedValue(
        createSuccessResponse(mockData, 201)
      );

      const wrappedHandler = withErrorHandler(mockHandler);
      const response = await wrappedHandler();

      expect(response.status).toBe(201);
      expect(response.data).toEqual({ data: mockData, success: true });
    });
  });

  describe('Service Layer Error Handling', () => {
    // Mock service that demonstrates error handling patterns
    class MockUserService {
      async getUserById(id: string) {
        if (!id) {
          throw createValidationError(
            ErrorCode.REQUIRED_FIELD_MISSING,
            'User ID is required',
            { id: ['User ID is required'] }
          );
        }

        if (id === 'invalid') {
          throw createOrganizationNotFoundError(id);
        }

        if (id === 'auth-error') {
          throw createInvalidCredentialsError();
        }

        return { id, email: 'user@example.com', name: 'Test User' };
      }

      async updateUser(id: string, data: any) {
        // Validate input data
        const validatedData = validateOrThrow(userProfileSchema, data);
        
        // Simulate user not found
        if (id === 'not-found') {
          throw createOrganizationNotFoundError(id);
        }

        return { id, ...validatedData };
      }
    }

    const userService = new MockUserService();

    it('should handle validation errors in service methods', async () => {
      await expect(userService.getUserById('')).rejects.toThrow();
      
      try {
        await userService.getUserById('');
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.REQUIRED_FIELD_MISSING);
        expect(error.fieldErrors).toEqual({ id: ['User ID is required'] });
      }
    });

    it('should handle not found errors in service methods', async () => {
      await expect(userService.getUserById('invalid')).rejects.toThrow();
      
      try {
        await userService.getUserById('invalid');
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.ORGANIZATION_NOT_FOUND);
        expect(error.statusCode).toBe(404);
      }
    });

    it('should handle authentication errors in service methods', async () => {
      await expect(userService.getUserById('auth-error')).rejects.toThrow();
      
      try {
        await userService.getUserById('auth-error');
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.INVALID_CREDENTIALS);
        expect(error.statusCode).toBe(401);
      }
    });

    it('should validate and update user successfully', async () => {
      const validData = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = await userService.updateUser('123', validData);
      
      expect(result).toEqual({
        id: '123',
        ...validData,
      });
    });

    it('should handle validation errors in update method', async () => {
      const invalidData = {
        email: 'invalid-email',
        firstName: '',
      };

      await expect(userService.updateUser('123', invalidData)).rejects.toThrow();
      
      try {
        await userService.updateUser('123', invalidData);
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.INVALID_INPUT_FORMAT);
        expect(error.fieldErrors).toBeDefined();
      }
    });
  });

  describe('End-to-End Error Flow', () => {
    it('should demonstrate complete error handling flow', async () => {
      // Simulate an API route handler that uses services
      const apiHandler = async (request: NextRequest) => {
        const body = await request.json();
        
        // Validate request body
        const validatedData = validateOrThrow(userProfileSchema, body);
        
        // Simulate service call that might fail
        if (validatedData.email === 'existing@example.com') {
          throw createValidationError(
            ErrorCode.DUPLICATE_USER,
            'User already exists',
            { email: ['A user with this email already exists'] }
          );
        }
        
        // Simulate successful creation
        const user = {
          id: 'user-123',
          ...validatedData,
          createdAt: new Date().toISOString(),
        };
        
        return createSuccessResponse(user, 201);
      };

      const wrappedHandler = withErrorHandler(apiHandler);

      // Test successful case
      const validRequest = {
        json: vi.fn().mockResolvedValue({
          email: 'new@example.com',
          firstName: 'John',
          lastName: 'Doe',
        }),
        headers: { get: vi.fn() },
      } as unknown as NextRequest;

      const successResponse = await wrappedHandler(validRequest);
      expect(successResponse.status).toBe(201);
      expect(successResponse.data.success).toBe(true);

      // Test validation error case
      const invalidRequest = {
        json: vi.fn().mockResolvedValue({
          email: 'invalid-email',
          firstName: '',
        }),
        headers: { get: vi.fn() },
      } as unknown as NextRequest;

      const validationErrorResponse = await wrappedHandler(invalidRequest);
      expect(validationErrorResponse.status).toBe(400);
      expect(validationErrorResponse.data.error.code).toBe(ErrorCode.INVALID_INPUT_FORMAT);

      // Test business logic error case
      const duplicateRequest = {
        json: vi.fn().mockResolvedValue({
          email: 'existing@example.com',
          firstName: 'John',
          lastName: 'Doe',
        }),
        headers: { get: vi.fn() },
      } as unknown as NextRequest;

      const duplicateErrorResponse = await wrappedHandler(duplicateRequest);
      expect(duplicateErrorResponse.status).toBe(400);
      expect(duplicateErrorResponse.data.error.code).toBe(ErrorCode.DUPLICATE_USER);
      expect(duplicateErrorResponse.data.error.fieldErrors).toEqual({
        email: ['A user with this email already exists'],
      });
    });
  });
});