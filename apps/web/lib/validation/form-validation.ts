import { z } from 'zod';
import { ValidationError, ErrorCode } from '@/lib/errors/custom-errors';

/**
 * Common validation schemas
 */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s'.-]+$/, 'Name can only contain letters, spaces, hyphens, apostrophes, and periods');

export const organizationNameSchema = z
  .string()
  .min(1, 'Organization name is required')
  .max(100, 'Organization name must be less than 100 characters')
  .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Organization name can only contain letters, numbers, spaces, hyphens, and underscores');

export const slugSchema = z
  .string()
  .min(1, 'Slug is required')
  .max(50, 'Slug must be less than 50 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
  .regex(/^[a-z0-9]/, 'Slug must start with a letter or number')
  .regex(/[a-z0-9]$/, 'Slug must end with a letter or number');

/**
 * User validation schemas
 */
export const userProfileSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  email: emailSchema,
});

export const userPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    marketing: z.boolean().optional(),
  }).optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
});

/**
 * Organization validation schemas
 */
export const createOrganizationSchema = z.object({
  name: organizationNameSchema,
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
});

export const updateOrganizationSchema = z.object({
  name: organizationNameSchema.optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
});

export const organizationSettingsSchema = z.object({
  allowPublicSignup: z.boolean().optional(),
  requireEmailVerification: z.boolean().optional(),
  defaultRole: z.string().optional(),
  maxMembers: z.number().min(1).max(10000).optional(),
});

/**
 * Membership validation schemas
 */
export const inviteUserSchema = z.object({
  email: emailSchema,
  roleId: z.string().min(1, 'Role is required'),
  message: z.string().max(500, 'Message must be less than 500 characters').optional(),
});

export const updateMembershipSchema = z.object({
  roleId: z.string().min(1, 'Role is required'),
});

/**
 * Authentication validation schemas
 */
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
});

export const resetPasswordSchema = z.object({
  email: emailSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

/**
 * Validation result type
 */
export type ValidationResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  errors: Record<string, string[]>;
};

/**
 * Validate data against a Zod schema
 */
export const validateData = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> => {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  const errors: Record<string, string[]> = {};
  
  result.error.errors.forEach((error) => {
    const path = error.path.join('.');
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(error.message);
  });

  return {
    success: false,
    errors,
  };
};

/**
 * Validate and throw ValidationError if invalid
 */
export const validateOrThrow = <T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  requestId?: string
): T => {
  const result = validateData(schema, data);
  
  if (!result.success) {
    throw new ValidationError(
      ErrorCode.INVALID_INPUT_FORMAT,
      'Validation failed',
      result.errors,
      { validationErrors: result.errors },
      requestId
    );
  }
  
  return result.data;
};

/**
 * Async validation wrapper
 */
export const validateAsync = async <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<ValidationResult<T>> => {
  try {
    const validatedData = await schema.parseAsync(data);
    return {
      success: true,
      data: validatedData,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });

      return {
        success: false,
        errors,
      };
    }
    
    throw error;
  }
};

/**
 * Form field validation helpers
 */
export const validateField = (
  value: unknown,
  schema: z.ZodSchema,
  fieldName: string
): string[] => {
  const result = schema.safeParse(value);
  
  if (result.success) {
    return [];
  }
  
  return result.error.errors
    .filter(error => error.path.length === 0 || error.path[0] === fieldName)
    .map(error => error.message);
};

/**
 * Real-time validation hook for forms
 */
export const useFieldValidation = (
  schema: z.ZodSchema,
  debounceMs: number = 300
) => {
  const [errors, setErrors] = React.useState<string[]>([]);
  const [isValidating, setIsValidating] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const validate = React.useCallback((value: unknown, fieldName: string) => {
    setIsValidating(true);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      const fieldErrors = validateField(value, schema, fieldName);
      setErrors(fieldErrors);
      setIsValidating(false);
    }, debounceMs);
  }, [schema, debounceMs]);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { errors, isValidating, validate };
};

// Import React for the hook
import React from 'react';