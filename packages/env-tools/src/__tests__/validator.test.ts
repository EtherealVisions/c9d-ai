import { validateEnvironment, printValidationSummary } from '../validator';
import { AppEnvConfig } from '../types';
import * as chalk from 'chalk';

jest.mock('chalk', () => ({
  red: jest.fn((str) => str),
  green: jest.fn((str) => str),
  yellow: jest.fn((str) => str),
  blue: jest.fn((str) => str),
  cyan: jest.fn((str) => str),
  gray: jest.fn((str) => str),
  white: jest.fn((str) => str),
  bold: jest.fn((str) => str)
}));

describe('validator', () => {
  beforeEach(() => {
    // Clear environment
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('TEST_')) {
        delete process.env[key];
      }
    });
  });

  describe('validateEnvironment', () => {
    test('validates required variables correctly', async () => {
      const config: AppEnvConfig = {
        appName: 'test-app',
        displayName: 'Test App',
        envVars: {
          required: [{
            name: 'TEST_REQUIRED_VAR',
            required: true,
            description: 'A required test variable',
            example: 'test-value'
          }],
          optional: []
        }
      };

      const result = await validateEnvironment(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe('Missing required: TEST_REQUIRED_VAR');
    });

    test('validates optional variables without errors', async () => {
      const config: AppEnvConfig = {
        appName: 'test-app',
        displayName: 'Test App',
        envVars: {
          required: [],
          optional: [{
            name: 'TEST_OPTIONAL_VAR',
            required: false,
            description: 'An optional test variable',
            example: 'test-value'
          }]
        }
      };

      const result = await validateEnvironment(config);
      
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toBe('Optional not set: TEST_OPTIONAL_VAR');
    });

    test('passes validation when all required vars are set', async () => {
      process.env.TEST_REQUIRED_VAR = 'value';
      process.env.TEST_ANOTHER_REQUIRED = 'another-value';
      
      const config: AppEnvConfig = {
        appName: 'test-app',
        displayName: 'Test App',
        envVars: {
          required: [{
            name: 'TEST_REQUIRED_VAR',
            required: true,
            description: 'Required var 1',
            example: 'value'
          }, {
            name: 'TEST_ANOTHER_REQUIRED',
            required: true,
            description: 'Required var 2',
            example: 'value'
          }],
          optional: []
        }
      };

      const result = await validateEnvironment(config);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('validates with custom validation functions', async () => {
      process.env.TEST_URL = 'not-a-url';
      
      const config: AppEnvConfig = {
        appName: 'test-app',
        displayName: 'Test App',
        customValidation: (env) => {
          try {
            new URL(env.TEST_URL || '');
            return { valid: true, errors: [] };
          } catch {
            return { valid: false, errors: ['TEST_URL must be a valid URL'] };
          }
        },
        envVars: {
          required: [{
            name: 'TEST_URL',
            required: true,
            description: 'A URL variable',
            example: 'https://example.com'
          }],
          optional: []
        }
      };

      const result = await validateEnvironment(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe('TEST_URL must be a valid URL');
    });

    test('handles empty config gracefully', async () => {
      const config: AppEnvConfig = {
        appName: 'test-app',
        displayName: 'Test App',
        envVars: {
          required: [],
          optional: []
        }
      };

      const result = await validateEnvironment(config);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    test('validates enum values correctly', async () => {
      process.env.TEST_ENV = 'invalid';
      
      const config: AppEnvConfig = {
        appName: 'test-app',
        displayName: 'Test App',
        customValidation: (env) => {
          const valid = ['development', 'staging', 'production'];
          if (!valid.includes(env.TEST_ENV || '')) {
            return { valid: false, errors: [`TEST_ENV must be one of: ${valid.join(', ')}`] };
          }
          return { valid: true, errors: [] };
        },
        envVars: {
          required: [{
            name: 'TEST_ENV',
            required: true,
            description: 'Environment type',
            example: 'development'
          }],
          optional: []
        }
      };

      const result = await validateEnvironment(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toBe('TEST_ENV must be one of: development, staging, production');
    });

    test('collects multiple validation errors', async () => {
      const config: AppEnvConfig = {
        appName: 'test-app',
        displayName: 'Test App',
        envVars: {
          required: [
            { name: 'TEST_VAR_1', required: true, description: 'Var 1', example: 'value1' },
            { name: 'TEST_VAR_2', required: true, description: 'Var 2', example: 'value2' },
            { name: 'TEST_VAR_3', required: true, description: 'Var 3', example: 'value3' }
          ],
          optional: []
        }
      };

      const result = await validateEnvironment(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });

    test('hides sensitive values in output', async () => {
      process.env.TEST_SECRET_KEY = 'very-secret-value-that-should-be-hidden';
      
      const config: AppEnvConfig = {
        appName: 'test-app',
        displayName: 'Test App',
        envVars: {
          required: [{
            name: 'TEST_SECRET_KEY',
            required: true,
            description: 'Secret key',
            sensitive: true
          }],
          optional: []
        }
      };

      const result = await validateEnvironment(config);
      
      expect(result.valid).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('TEST_SECRET_KEY: very-secre...')
      );
    });

    test('runs before and after validation hooks', async () => {
      const beforeHook = jest.fn();
      const afterHook = jest.fn();
      
      const config: AppEnvConfig = {
        appName: 'test-app',
        displayName: 'Test App',
        beforeValidation: beforeHook,
        afterValidation: afterHook,
        envVars: {
          required: [],
          optional: []
        }
      };

      const result = await validateEnvironment(config);
      
      expect(beforeHook).toHaveBeenCalled();
      expect(afterHook).toHaveBeenCalledWith(true);
    });
  });

  describe('printValidationSummary', () => {
    const mockConsole = {
      log: jest.spyOn(console, 'log').mockImplementation()
    };

    afterEach(() => {
      mockConsole.log.mockClear();
    });

    test('prints validation header with app name', () => {
      const config: AppEnvConfig = {
        appName: 'test-app',
        displayName: 'Test Application',
        envVars: {
          required: [],
          optional: []
        }
      };
      
      const result = { valid: true, errors: [], warnings: [] };
      printValidationSummary(result, config);
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('All required environment variables are set!')
      );
    });

    test('prints errors for missing required variables', () => {
      const result = {
        valid: false,
        errors: ['Missing required: DATABASE_URL'],
        warnings: []
      };
      
      const config: AppEnvConfig = {
        appName: 'test-app',
        displayName: 'Test App',
        envVars: {
          required: [{
            name: 'DATABASE_URL',
            required: true,
            description: 'PostgreSQL connection string',
            example: 'postgresql://user:pass@host:5432/db'
          }],
          optional: []
        }
      };
      
      printValidationSummary(result, config);
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Environment validation failed!')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Missing required: DATABASE_URL')
      );
    });

    test('prints warnings for missing optional variables', () => {
      const result = {
        valid: true,
        errors: [],
        warnings: ['Optional not set: REDIS_URL']
      };
      
      const config: AppEnvConfig = {
        appName: 'test-app',
        displayName: 'Test App',
        envVars: {
          required: [],
          optional: [{
            name: 'REDIS_URL',
            required: false,
            description: 'Redis connection string',
            example: 'redis://localhost:6379'
          }]
        }
      };
      
      printValidationSummary(result, config);
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Some optional variables are not configured')
      );
    });

    test('prints validation failure summary', () => {
      const result = {
        valid: false,
        errors: ['Missing required: VAR1', 'Invalid values: VAR2'],
        warnings: []
      };
      
      const config: AppEnvConfig = {
        appName: 'test-app',
        displayName: 'Test App',
        envVars: {
          required: [],
          optional: []
        }
      };
      
      printValidationSummary(result, config);
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Environment validation failed!')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Missing required: VAR1')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Invalid values: VAR2')
      );
    });

    test('prints setup instructions when validation fails', () => {
      const result = {
        valid: false,
        errors: ['Missing required: TEST_VAR'],
        warnings: []
      };
      
      const config: AppEnvConfig = {
        appName: 'test-app',
        displayName: 'Test App',
        envVars: {
          required: [],
          optional: []
        }
      };
      
      printValidationSummary(result, config);
      
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Setup Instructions:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Copy env.example'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Phase.dev dashboard'));
    });
  });
});