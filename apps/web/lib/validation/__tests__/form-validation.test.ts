import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  emailSchema,
  passwordSchema,
  nameSchema,
  organizationNameSchema,
  slugSchema,
  userProfileSchema,
  createOrganizationSchema,
  inviteUserSchema,
  signInSchema,
  signUpSchema,
  changePasswordSchema,
  validateData,
  validateOrThrow,
  validateAsync,
  validateField,
} from '../form-validation';
import { ValidationError, ErrorCode } from '../../errors/custom-errors';

describe('Form Validation', () => {
  describe('Basic Schemas', () => {
    describe('emailSchema', () => {
      it('should validate correct email addresses', () => {
        const validEmails = [
          'test@example.com',
          'user.name@domain.co.uk',
          'user+tag@example.org',
        ];

        validEmails.forEach(email => {
          const result = emailSchema.safeParse(email);
          expect(result.success).toBe(true);
        });
      });

      it('should reject invalid email addresses', () => {
        const invalidEmails = [
          '',
          'invalid-email',
          '@example.com',
          'user@',
          'user@.com',
        ];

        invalidEmails.forEach(email => {
          const result = emailSchema.safeParse(email);
          expect(result.success).toBe(false);
        });
      });
    });

    describe('passwordSchema', () => {
      it('should validate strong passwords', () => {
        const validPasswords = [
          'Password123',
          'MyStr0ngP@ss',
          'ComplexPass1',
        ];

        validPasswords.forEach(password => {
          const result = passwordSchema.safeParse(password);
          expect(result.success).toBe(true);
        });
      });

      it('should reject weak passwords', () => {
        const invalidPasswords = [
          'short',
          'nouppercase123',
          'NOLOWERCASE123',
          'NoNumbers',
          'password',
        ];

        invalidPasswords.forEach(password => {
          const result = passwordSchema.safeParse(password);
          expect(result.success).toBe(false);
        });
      });
    });

    describe('nameSchema', () => {
      it('should validate correct names', () => {
        const validNames = [
          'John',
          'Mary Jane',
          "O'Connor",
          'Jean-Pierre',
          'Smith Jr.',
        ];

        validNames.forEach(name => {
          const result = nameSchema.safeParse(name);
          expect(result.success).toBe(true);
        });
      });

      it('should reject invalid names', () => {
        const invalidNames = [
          '',
          'John123',
          'Name@domain',
          'A'.repeat(101), // Too long
        ];

        invalidNames.forEach(name => {
          const result = nameSchema.safeParse(name);
          expect(result.success).toBe(false);
        });
      });
    });

    describe('organizationNameSchema', () => {
      it('should validate correct organization names', () => {
        const validNames = [
          'Acme Corp',
          'Tech-Company',
          'Company_123',
          'My Organization',
        ];

        validNames.forEach(name => {
          const result = organizationNameSchema.safeParse(name);
          expect(result.success).toBe(true);
        });
      });

      it('should reject invalid organization names', () => {
        const invalidNames = [
          '',
          'Org@domain',
          'Company!',
          'A'.repeat(101), // Too long
        ];

        invalidNames.forEach(name => {
          const result = organizationNameSchema.safeParse(name);
          expect(result.success).toBe(false);
        });
      });
    });

    describe('slugSchema', () => {
      it('should validate correct slugs', () => {
        const validSlugs = [
          'my-org',
          'company123',
          'tech-startup',
          'org-2024',
        ];

        validSlugs.forEach(slug => {
          const result = slugSchema.safeParse(slug);
          expect(result.success).toBe(true);
        });
      });

      it('should reject invalid slugs', () => {
        const invalidSlugs = [
          '',
          'My-Org', // Uppercase
          'org_name', // Underscore
          '-invalid', // Starts with hyphen
          'invalid-', // Ends with hyphen
          'org@domain', // Special characters
          'A'.repeat(51), // Too long
        ];

        invalidSlugs.forEach(slug => {
          const result = slugSchema.safeParse(slug);
          expect(result.success).toBe(false);
        });
      });
    });
  });

  describe('Complex Schemas', () => {
    describe('userProfileSchema', () => {
      it('should validate complete user profile', () => {
        const validProfile = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
        };

        const result = userProfileSchema.safeParse(validProfile);
        expect(result.success).toBe(true);
      });

      it('should validate profile with optional fields missing', () => {
        const validProfile = {
          email: 'john.doe@example.com',
        };

        const result = userProfileSchema.safeParse(validProfile);
        expect(result.success).toBe(true);
      });

      it('should reject profile with invalid email', () => {
        const invalidProfile = {
          firstName: 'John',
          email: 'invalid-email',
        };

        const result = userProfileSchema.safeParse(invalidProfile);
        expect(result.success).toBe(false);
      });
    });

    describe('createOrganizationSchema', () => {
      it('should validate organization creation data', () => {
        const validData = {
          name: 'My Organization',
          description: 'A great organization',
        };

        const result = createOrganizationSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should validate with optional description missing', () => {
        const validData = {
          name: 'My Organization',
        };

        const result = createOrganizationSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should reject with missing name', () => {
        const invalidData = {
          description: 'A great organization',
        };

        const result = createOrganizationSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });
    });

    describe('inviteUserSchema', () => {
      it('should validate invitation data', () => {
        const validData = {
          email: 'user@example.com',
          roleId: 'role-123',
          message: 'Welcome to our organization!',
        };

        const result = inviteUserSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should validate without optional message', () => {
        const validData = {
          email: 'user@example.com',
          roleId: 'role-123',
        };

        const result = inviteUserSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should reject with missing required fields', () => {
        const invalidData = {
          message: 'Welcome!',
        };

        const result = inviteUserSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });
    });

    describe('changePasswordSchema', () => {
      it('should validate matching passwords', () => {
        const validData = {
          currentPassword: 'oldPassword123',
          newPassword: 'NewPassword123',
          confirmPassword: 'NewPassword123',
        };

        const result = changePasswordSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should reject non-matching passwords', () => {
        const invalidData = {
          currentPassword: 'oldPassword123',
          newPassword: 'NewPassword123',
          confirmPassword: 'DifferentPassword123',
        };

        const result = changePasswordSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].path).toEqual(['confirmPassword']);
          expect(result.error.errors[0].message).toBe("Passwords don't match");
        }
      });
    });
  });

  describe('Validation Functions', () => {
    describe('validateData', () => {
      it('should return success result for valid data', () => {
        const schema = z.object({ name: z.string() });
        const data = { name: 'test' };

        const result = validateData(schema, data);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(data);
        }
      });

      it('should return error result for invalid data', () => {
        const schema = z.object({ 
          name: z.string().min(1),
          email: z.string().email(),
        });
        const data = { name: '', email: 'invalid' };

        const result = validateData(schema, data);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors).toHaveProperty('name');
          expect(result.errors).toHaveProperty('email');
        }
      });

      it('should handle nested field errors', () => {
        const schema = z.object({
          user: z.object({
            name: z.string().min(1),
          }),
        });
        const data = { user: { name: '' } };

        const result = validateData(schema, data);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors).toHaveProperty('user.name');
        }
      });
    });

    describe('validateOrThrow', () => {
      it('should return data for valid input', () => {
        const schema = z.object({ name: z.string() });
        const data = { name: 'test' };

        const result = validateOrThrow(schema, data, 'test-request-id');

        expect(result).toEqual(data);
      });

      it('should throw ValidationError for invalid input', () => {
        const schema = z.object({ name: z.string().min(1) });
        const data = { name: '' };

        expect(() => validateOrThrow(schema, data, 'test-request-id')).toThrow(ValidationError);
        
        try {
          validateOrThrow(schema, data, 'test-request-id');
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
          if (error instanceof ValidationError) {
            expect(error.code).toBe(ErrorCode.INVALID_INPUT_FORMAT);
            expect(error.requestId).toBe('test-request-id');
            expect(error.fieldErrors).toHaveProperty('name');
          }
        }
      });
    });

    describe('validateAsync', () => {
      it('should return success result for valid data', async () => {
        const schema = z.object({ name: z.string() });
        const data = { name: 'test' };

        const result = await validateAsync(schema, data);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(data);
        }
      });

      it('should return error result for invalid data', async () => {
        const schema = z.object({ name: z.string().min(1) });
        const data = { name: '' };

        const result = await validateAsync(schema, data);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors).toHaveProperty('name');
        }
      });

      it('should throw non-validation errors', async () => {
        const schema = z.object({ name: z.string() }).refine(() => {
          throw new Error('Custom error');
        });
        const data = { name: 'test' };

        await expect(validateAsync(schema, data)).rejects.toThrow('Custom error');
      });
    });

    describe('validateField', () => {
      it('should return empty array for valid field', () => {
        const schema = z.string().min(1);
        const value = 'valid';

        const errors = validateField(value, schema, 'name');

        expect(errors).toEqual([]);
      });

      it('should return error messages for invalid field', () => {
        const schema = z.string().min(5);
        const value = 'abc';

        const errors = validateField(value, schema, 'name');

        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('at least 5');
      });

      it('should filter errors by field name for object schemas', () => {
        const schema = z.object({
          name: z.string().min(1),
          email: z.string().email(),
        });
        const value = { name: '', email: 'invalid' };

        const nameErrors = validateField(value, schema, 'name');
        const emailErrors = validateField(value, schema, 'email');

        expect(nameErrors).toHaveLength(1);
        expect(emailErrors).toHaveLength(1);
      });
    });
  });
});