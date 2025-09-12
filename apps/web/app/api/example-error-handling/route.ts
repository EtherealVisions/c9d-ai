import { NextRequest } from 'next/server';
import { withErrorHandler, createSuccessResponse } from '@/lib/errors/api-error-handler';
import { validateOrThrow, userProfileSchema } from '@/lib/validation/form-validation';
import { 
  createInvalidCredentialsError, 
  createOrganizationNotFoundError,
  createValidationError 
} from '@/lib/errors/error-utils';
import { ErrorCode } from '@/lib/errors/custom-errors';

/**
 * Example API route demonstrating comprehensive error handling
 */
async function handlePost(request: NextRequest) {
  const body = await request.json();
  const { action, data } = body;

  switch (action) {
    case 'validate':
      // Demonstrate validation error handling
      const validatedData = validateOrThrow(userProfileSchema, data);
      return createSuccessResponse({ message: 'Validation successful', data: validatedData });

    case 'auth-error':
      // Demonstrate authentication error
      throw createInvalidCredentialsError();

    case 'not-found':
      // Demonstrate not found error
      throw createOrganizationNotFoundError('org-123');

    case 'business-logic-error':
      // Demonstrate business logic validation error
      if (data?.email === 'existing@example.com') {
        throw createValidationError(
          ErrorCode.DUPLICATE_USER,
          'User already exists',
          { email: ['A user with this email already exists'] }
        );
      }
      return createSuccessResponse({ message: 'User can be created' });

    case 'success':
      // Demonstrate successful response
      return createSuccessResponse({ 
        message: 'Operation completed successfully',
        timestamp: new Date().toISOString()
      });

    default:
      throw createValidationError(
        ErrorCode.INVALID_INPUT_FORMAT,
        'Invalid action specified',
        { action: ['Action must be one of: validate, auth-error, not-found, business-logic-error, success'] }
      );
  }
}

// Export the wrapped handler
export const POST = withErrorHandler(handlePost);