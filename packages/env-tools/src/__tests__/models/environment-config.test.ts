import { z } from 'zod';

// Environment configuration validation schemas
const EnvironmentVariableSchema = z.object({
  key: z.string().min(1).regex(/^[A-Z][A-Z0-9_]*$/), // Environment variable naming convention
  value: z.string(),
  required: z.boolean().default(false),
  sensitive: z.boolean().default(false),
  description: z.string().optional(),
  defaultValue: z.string().optional(),
  validation: z.object({
    type: z.enum(['string', 'number', 'boolean', 'url', 'email', 'json']).optional(),
    pattern: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    enum: z.array(z.string()).optional()
  }).optional()
});

const EnvironmentConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  variables: z.array(EnvironmentVariableSchema),
  extends: z.string().optional(), // Base environment to extend from
  metadata: z.object({
    version: z.string().optional(),
    lastUpdated: z.date().optional(),
    updatedBy: z.string().optional(),
    tags: z.array(z.string()).optional()
  }).optional()
});

const EnvironmentValidationResultSchema = z.object({
  isValid: z.boolean(),
  environment: z.string(),
  errors: z.array(z.object({
    variable: z.string(),
    error: z.string(),
    severity: z.enum(['error', 'warning', 'info']).default('error')
  })),
  warnings: z.array(z.object({
    variable: z.string(),
    message: z.string(),
    suggestion: z.string().optional()
  })),
  summary: z.object({
    total: z.number().int().min(0),
    required: z.number().int().min(0),
    missing: z.number().int().min(0),
    invalid: z.number().int().min(0),
    sensitive: z.number().int().min(0)
  })
});

const PhaseConfigSchema = z.object({
  projectId: z.string().min(1),
  environment: z.string().min(1),
  apiKey: z.string().min(1),
  endpoint: z.string().url().default('https://api.phase.dev'),
  timeout: z.number().int().min(1000).max(60000).default(10000), // milliseconds
  retries: z.number().int().min(0).max(5).default(3),
  cache: z.object({
    enabled: z.boolean().default(true),
    ttl: z.number().int().min(60).max(3600).default(300) // seconds
  }).optional()
});

type EnvironmentVariable = z.infer<typeof EnvironmentVariableSchema>;
type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;
type EnvironmentValidationResult = z.infer<typeof EnvironmentValidationResultSchema>;
type PhaseConfig = z.infer<typeof PhaseConfigSchema>;

describe('Environment Configuration Model Validation', () => {
  describe('EnvironmentVariableSchema', () => {
    const baseVariable: EnvironmentVariable = {
      key: 'DATABASE_URL',
      value: 'postgresql://user:pass@localhost:5432/db',
      required: true,
      sensitive: true
    };

    it('should validate basic environment variable', () => {
      expect(() => EnvironmentVariableSchema.parse(baseVariable)).not.toThrow();
    });

    it('should validate variable with all optional fields', () => {
      const completeVariable: EnvironmentVariable = {
        ...baseVariable,
        description: 'Database connection URL for the application',
        defaultValue: 'postgresql://localhost:5432/default',
        validation: {
          type: 'url',
          pattern: '^postgresql://',
        }
      };

      expect(() => EnvironmentVariableSchema.parse(completeVariable)).not.toThrow();
    });

    it('should validate environment variable naming convention', () => {
      const validKeys = [
        'DATABASE_URL',
        'API_KEY',
        'MAX_CONNECTIONS',
        'ENABLE_FEATURE_X',
        'PORT',
        'NODE_ENV'
      ];

      validKeys.forEach(key => {
        const variable = { ...baseVariable, key };
        expect(() => EnvironmentVariableSchema.parse(variable)).not.toThrow();
      });
    });

    it('should reject invalid environment variable names', () => {
      const invalidKeys = [
        'database_url', // lowercase
        'Database-URL', // mixed case with dash
        '123_PORT', // starts with number
        'API KEY', // contains space
        'api.key', // contains dot
        '', // empty
        'a' // too short pattern
      ];

      invalidKeys.forEach(key => {
        const variable = { ...baseVariable, key };
        expect(() => EnvironmentVariableSchema.parse(variable)).toThrow();
      });
    });

    it('should validate all validation types', () => {
      const validationTypes = ['string', 'number', 'boolean', 'url', 'email', 'json'] as const;
      
      validationTypes.forEach(type => {
        const variable = {
          ...baseVariable,
          validation: { type }
        };
        expect(() => EnvironmentVariableSchema.parse(variable)).not.toThrow();
      });
    });

    it('should validate numeric validation constraints', () => {
      const variable = {
        ...baseVariable,
        key: 'MAX_CONNECTIONS',
        validation: {
          type: 'number' as const,
          min: 1,
          max: 1000
        }
      };

      expect(() => EnvironmentVariableSchema.parse(variable)).not.toThrow();
    });

    it('should validate enum validation constraints', () => {
      const variable = {
        ...baseVariable,
        key: 'LOG_LEVEL',
        validation: {
          type: 'string' as const,
          enum: ['debug', 'info', 'warn', 'error']
        }
      };

      expect(() => EnvironmentVariableSchema.parse(variable)).not.toThrow();
    });

    it('should handle boolean defaults', () => {
      const variable = {
        key: 'FEATURE_FLAG',
        value: 'true'
      };

      const parsed = EnvironmentVariableSchema.parse(variable);
      expect(parsed.required).toBe(false);
      expect(parsed.sensitive).toBe(false);
    });
  });

  describe('EnvironmentConfigSchema', () => {
    const baseConfig: EnvironmentConfig = {
      name: 'production',
      variables: [
        {
          key: 'DATABASE_URL',
          value: 'postgresql://user:pass@localhost:5432/db',
          required: true,
          sensitive: true
        }
      ]
    };

    it('should validate basic environment config', () => {
      expect(() => EnvironmentConfigSchema.parse(baseConfig)).not.toThrow();
    });

    it('should validate config with all optional fields', () => {
      const completeConfig: EnvironmentConfig = {
        ...baseConfig,
        description: 'Production environment configuration',
        extends: 'base',
        metadata: {
          version: '1.2.0',
          lastUpdated: new Date('2024-01-01T00:00:00Z'),
          updatedBy: 'admin@example.com',
          tags: ['production', 'critical', 'monitored']
        }
      };

      expect(() => EnvironmentConfigSchema.parse(completeConfig)).not.toThrow();
    });

    it('should validate multiple environment variables', () => {
      const config: EnvironmentConfig = {
        name: 'development',
        variables: [
          {
            key: 'DATABASE_URL',
            value: 'postgresql://localhost:5432/dev',
            required: true,
            sensitive: true
          },
          {
            key: 'API_KEY',
            value: 'dev_api_key_123',
            required: true,
            sensitive: true
          },
          {
            key: 'DEBUG_MODE',
            value: 'true',
            required: false,
            sensitive: false,
            defaultValue: 'false'
          }
        ]
      };

      expect(() => EnvironmentConfigSchema.parse(config)).not.toThrow();
    });

    it('should handle empty variables array', () => {
      const config = {
        ...baseConfig,
        variables: []
      };

      expect(() => EnvironmentConfigSchema.parse(config)).not.toThrow();
    });

    it('should require name field', () => {
      const config = {
        variables: baseConfig.variables
      };

      expect(() => EnvironmentConfigSchema.parse(config)).toThrow();
    });

    it('should validate metadata tags', () => {
      const config = {
        ...baseConfig,
        metadata: {
          tags: ['env:production', 'team:backend', 'priority:high']
        }
      };

      expect(() => EnvironmentConfigSchema.parse(config)).not.toThrow();
    });
  });

  describe('EnvironmentValidationResultSchema', () => {
    const baseResult: EnvironmentValidationResult = {
      isValid: true,
      environment: 'production',
      errors: [],
      warnings: [],
      summary: {
        total: 5,
        required: 3,
        missing: 0,
        invalid: 0,
        sensitive: 2
      }
    };

    it('should validate successful validation result', () => {
      expect(() => EnvironmentValidationResultSchema.parse(baseResult)).not.toThrow();
    });

    it('should validate validation result with errors', () => {
      const resultWithErrors: EnvironmentValidationResult = {
        ...baseResult,
        isValid: false,
        errors: [
          {
            variable: 'DATABASE_URL',
            error: 'Invalid URL format',
            severity: 'error'
          },
          {
            variable: 'API_KEY',
            error: 'Missing required variable',
            severity: 'error'
          }
        ],
        summary: {
          ...baseResult.summary,
          missing: 1,
          invalid: 1
        }
      };

      expect(() => EnvironmentValidationResultSchema.parse(resultWithErrors)).not.toThrow();
    });

    it('should validate validation result with warnings', () => {
      const resultWithWarnings: EnvironmentValidationResult = {
        ...baseResult,
        warnings: [
          {
            variable: 'LOG_LEVEL',
            message: 'Using default value',
            suggestion: 'Consider setting explicit log level for production'
          },
          {
            variable: 'CACHE_TTL',
            message: 'Value seems low for production environment'
          }
        ]
      };

      expect(() => EnvironmentValidationResultSchema.parse(resultWithWarnings)).not.toThrow();
    });

    it('should validate error severity levels', () => {
      const severities = ['error', 'warning', 'info'] as const;
      
      severities.forEach(severity => {
        const result = {
          ...baseResult,
          errors: [{
            variable: 'TEST_VAR',
            error: 'Test error',
            severity
          }]
        };
        expect(() => EnvironmentValidationResultSchema.parse(result)).not.toThrow();
      });
    });

    it('should validate summary counts are non-negative', () => {
      const invalidSummaries = [
        { total: -1, required: 0, missing: 0, invalid: 0, sensitive: 0 },
        { total: 0, required: -1, missing: 0, invalid: 0, sensitive: 0 },
        { total: 0, required: 0, missing: -1, invalid: 0, sensitive: 0 }
      ];

      invalidSummaries.forEach(summary => {
        const result = { ...baseResult, summary };
        expect(() => EnvironmentValidationResultSchema.parse(result)).toThrow();
      });
    });

    it('should handle empty errors and warnings arrays', () => {
      const result = {
        ...baseResult,
        errors: [],
        warnings: []
      };

      expect(() => EnvironmentValidationResultSchema.parse(result)).not.toThrow();
    });
  });

  describe('PhaseConfigSchema', () => {
    const basePhaseConfig: PhaseConfig = {
      projectId: 'proj_123456789',
      environment: 'production',
      apiKey: 'phase_api_key_abcdef123456',
      endpoint: 'https://api.phase.dev',
      timeout: 10000,
      retries: 3
    };

    it('should validate basic Phase config', () => {
      expect(() => PhaseConfigSchema.parse(basePhaseConfig)).not.toThrow();
    });

    it('should validate Phase config with all optional fields', () => {
      const completePhaseConfig: PhaseConfig = {
        ...basePhaseConfig,
        endpoint: 'https://custom.phase.dev',
        timeout: 15000,
        retries: 2,
        cache: {
          enabled: true,
          ttl: 600
        }
      };

      expect(() => PhaseConfigSchema.parse(completePhaseConfig)).not.toThrow();
    });

    it('should apply default values', () => {
      const parsed = PhaseConfigSchema.parse(basePhaseConfig);
      expect(parsed.endpoint).toBe('https://api.phase.dev');
      expect(parsed.timeout).toBe(10000);
      expect(parsed.retries).toBe(3);
    });

    it('should validate timeout boundaries', () => {
      const testCases = [
        { timeout: 1000, shouldPass: true },
        { timeout: 30000, shouldPass: true },
        { timeout: 60000, shouldPass: true },
        { timeout: 999, shouldPass: false },
        { timeout: 60001, shouldPass: false }
      ];

      testCases.forEach(({ timeout, shouldPass }) => {
        const config = { ...basePhaseConfig, timeout };

        if (shouldPass) {
          expect(() => PhaseConfigSchema.parse(config)).not.toThrow();
        } else {
          expect(() => PhaseConfigSchema.parse(config)).toThrow();
        }
      });
    });

    it('should validate retries boundaries', () => {
      const testCases = [
        { retries: 0, shouldPass: true },
        { retries: 3, shouldPass: true },
        { retries: 5, shouldPass: true },
        { retries: -1, shouldPass: false },
        { retries: 6, shouldPass: false }
      ];

      testCases.forEach(({ retries, shouldPass }) => {
        const config = { ...basePhaseConfig, retries };

        if (shouldPass) {
          expect(() => PhaseConfigSchema.parse(config)).not.toThrow();
        } else {
          expect(() => PhaseConfigSchema.parse(config)).toThrow();
        }
      });
    });

    it('should validate cache TTL boundaries', () => {
      const testCases = [
        { ttl: 60, shouldPass: true },
        { ttl: 300, shouldPass: true },
        { ttl: 3600, shouldPass: true },
        { ttl: 59, shouldPass: false },
        { ttl: 3601, shouldPass: false }
      ];

      testCases.forEach(({ ttl, shouldPass }) => {
        const config = {
          ...basePhaseConfig,
          cache: { enabled: true, ttl }
        };

        if (shouldPass) {
          expect(() => PhaseConfigSchema.parse(config)).not.toThrow();
        } else {
          expect(() => PhaseConfigSchema.parse(config)).toThrow();
        }
      });
    });

    it('should validate endpoint URL format', () => {
      const validEndpoints = [
        'https://api.phase.dev',
        'https://custom.phase.dev',
        'http://localhost:3000'
      ];

      validEndpoints.forEach(endpoint => {
        const config = { ...basePhaseConfig, endpoint };
        expect(() => PhaseConfigSchema.parse(config)).not.toThrow();
      });
    });

    it('should reject invalid endpoint URLs', () => {
      const invalidEndpoints = [
        ''  // empty endpoint
      ];

      invalidEndpoints.forEach(endpoint => {
        const config = { ...basePhaseConfig, endpoint };
        expect(() => PhaseConfigSchema.parse(config)).toThrow();
      });
    });

    it('should require all mandatory fields', () => {
      const requiredFields = ['projectId', 'environment', 'apiKey'];
      
      requiredFields.forEach(field => {
        const incompleteConfig = { ...basePhaseConfig };
        delete (incompleteConfig as any)[field];
        
        expect(() => PhaseConfigSchema.parse(incompleteConfig)).toThrow();
      });
    });
  });

  describe('Model Integration and Complex Scenarios', () => {
    it('should validate complete environment setup', () => {
      const completeSetup = {
        config: {
          name: 'production',
          description: 'Production environment with Phase.dev integration',
          variables: [
            {
              key: 'DATABASE_URL',
              value: 'postgresql://user:pass@prod-db:5432/app',
              required: true,
              sensitive: true,
              description: 'Primary database connection',
              validation: {
                type: 'url' as const,
                pattern: '^postgresql://'
              }
            },
            {
              key: 'REDIS_URL',
              value: 'redis://prod-redis:6379',
              required: true,
              sensitive: false,
              validation: {
                type: 'url' as const
              }
            }
          ],
          metadata: {
            version: '2.1.0',
            lastUpdated: new Date('2024-01-01T00:00:00Z'),
            tags: ['production', 'critical']
          }
        },
        phaseConfig: {
          projectId: 'proj_production_123',
          environment: 'production',
          apiKey: 'phase_prod_key_secure',
          timeout: 15000,
          retries: 2,
          cache: {
            enabled: true,
            ttl: 600
          }
        },
        validationResult: {
          isValid: true,
          environment: 'production',
          errors: [],
          warnings: [
            {
              variable: 'LOG_LEVEL',
              message: 'Using default log level',
              suggestion: 'Consider setting explicit log level for production'
            }
          ],
          summary: {
            total: 2,
            required: 2,
            missing: 0,
            invalid: 0,
            sensitive: 1
          }
        }
      };

      expect(() => EnvironmentConfigSchema.parse(completeSetup.config)).not.toThrow();
      expect(() => PhaseConfigSchema.parse(completeSetup.phaseConfig)).not.toThrow();
      expect(() => EnvironmentValidationResultSchema.parse(completeSetup.validationResult)).not.toThrow();
    });

    it('should handle environment inheritance scenarios', () => {
      const baseConfig = {
        name: 'base',
        variables: [
          {
            key: 'NODE_ENV',
            value: 'production',
            required: true,
            sensitive: false
          }
        ]
      };

      const extendedConfig = {
        name: 'production',
        extends: 'base',
        variables: [
          {
            key: 'DATABASE_URL',
            value: 'postgresql://prod-db:5432/app',
            required: true,
            sensitive: true
          }
        ]
      };

      expect(() => EnvironmentConfigSchema.parse(baseConfig)).not.toThrow();
      expect(() => EnvironmentConfigSchema.parse(extendedConfig)).not.toThrow();
    });

    it('should validate environment variable transformations', () => {
      const transformationCases = [
        {
          key: 'PORT',
          value: '3000',
          validation: { type: 'number' as const, min: 1000, max: 65535 }
        },
        {
          key: 'ENABLE_FEATURE',
          value: 'true',
          validation: { type: 'boolean' as const }
        },
        {
          key: 'CONFIG_JSON',
          value: '{"key": "value"}',
          validation: { type: 'json' as const }
        },
        {
          key: 'ADMIN_EMAIL',
          value: 'admin@example.com',
          validation: { type: 'email' as const }
        }
      ];

      transformationCases.forEach(variable => {
        expect(() => EnvironmentVariableSchema.parse(variable)).not.toThrow();
      });
    });
  });
});