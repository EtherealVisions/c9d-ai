import { validateSecrets } from './validator';

describe('validateSecrets', () => {
  describe('basic validation', () => {
    it('should return valid for non-empty secrets', () => {
      const secrets = {
        API_KEY: 'secret123',
        DATABASE_URL: 'postgres://localhost'
      };
      
      const result = validateSecrets(secrets);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid for empty object when no required secrets', () => {
      const result = validateSecrets({});
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should check for required secrets based on app namespace', () => {
      const secrets = {
        SOME_KEY: 'value'
      };
      
      // API namespace requires DATABASE_URL and CLERK_PUBLISHABLE_KEY
      const result = validateSecrets(secrets, 'API');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.key === 'DATABASE_URL')).toBe(true);
    });
  });

  describe('with app namespace', () => {
    it('should validate required secrets for api namespace', () => {
      const secrets = {
        DATABASE_URL: 'postgres://localhost',
        DIRECT_URL: 'postgres://localhost',
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_123',
        CLERK_SECRET_KEY: 'sk_test_123',
        JWT_SECRET: 'jwt_secret_123'
      };
      
      const result = validateSecrets(secrets, 'API');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate required secrets for trendgate namespace', () => {
      const secrets = {
        DATABASE_URL: 'postgres://localhost',
        CLERK_SECRET_KEY: 'sk_test_123',
        GITHUB_APP_CLIENT_ID: 'client123',
        GITHUB_APP_PRIVATE_KEY: 'private_key'
      };
      
      // TRENDGATE is not in REQUIRED_SECRETS, so it won't require any specific secrets
      const result = validateSecrets(secrets, 'TRENDGATE');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should report missing required secrets', () => {
      const secrets = {
        DATABASE_URL: 'postgres://localhost'
      };
      
      const result = validateSecrets(secrets, 'API');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.key === 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY')).toBe(true);
      expect(result.errors.some(e => e.key === 'CLERK_SECRET_KEY')).toBe(true);
    });
  });

  describe('value validation', () => {
    it('should warn about empty string values', () => {
      const secrets = {
        API_KEY: '',
        DATABASE_URL: 'postgres://localhost'
      };
      
      const result = validateSecrets(secrets);
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].key).toBe('API_KEY');
      expect(result.warnings[0].message).toContain('empty value');
    });

    it('should warn about invalid DATABASE_URL format', () => {
      const secrets = {
        DATABASE_URL: 'mysql://localhost'
      };
      
      const result = validateSecrets(secrets);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => 
        w.key === 'DATABASE_URL' && w.message.includes('postgres')
      )).toBe(true);
    });

    it('should warn about invalid URL formats', () => {
      const secrets = {
        NEXT_PUBLIC_API_URL: 'not-a-url',
        PUBLIC_API_URL: 'also-not-a-url'
      };
      
      const result = validateSecrets(secrets);
      expect(result.valid).toBe(true);
      expect(result.warnings.filter(w => w.message.includes('valid URL')).length).toBe(2);
    });

    it('should warn about localhost URLs in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const secrets = {
        API_URL: 'http://localhost:3000'
      };
      
      const result = validateSecrets(secrets);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.message.includes('localhost'))).toBe(true);
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('common issues', () => {
    it('should check DATABASE_URL format', () => {
      const secrets = {
        DATABASE_URL: 'not-postgres://example.com'
      };
      
      const result = validateSecrets(secrets);
      expect(result.warnings.some(w => 
        w.key === 'DATABASE_URL' && w.message.includes('postgres')
      )).toBe(true);
    });

    it('should validate URL formats for URL-like keys', () => {
      const secrets = {
        API_URL: 'invalid-url',
        WEBHOOK_URL: 'also-invalid'
      };
      
      const result = validateSecrets(secrets);
      expect(result.warnings.filter(w => w.message.includes('URL')).length).toBe(2);
    });

    it('should check for test/dev keys in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const secrets = {
        API_KEY: 'test_key_123',
        SECRET_KEY: 'dev_secret_456'
      };
      
      const result = validateSecrets(secrets);
      expect(result.warnings.filter(w => w.message.includes('test/dev key')).length).toBe(2);
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should accept valid secrets', () => {
      const secrets = {
        DATABASE_URL: 'postgres://user:pass@db.example.com:5432/mydb',
        API_URL: 'https://api.example.com',
        API_KEY: 'sk_live_abc123',
        SECRET_KEY: 'a1b2c3d4e5f6'
      };
      
      const result = validateSecrets(secrets);
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in values', () => {
      const secrets = {
        JSON_CONFIG: '{"key": "value"}',
        SQL_QUERY: "SELECT * FROM users WHERE id = $1",
        REGEX_PATTERN: '^[a-zA-Z0-9]+$',
        MULTILINE: 'line1\nline2\nline3'
      };
      
      const result = validateSecrets(secrets);
      expect(result.valid).toBe(true);
    });

    it('should handle numeric values', () => {
      const secrets = {
        PORT: '3000',
        MAX_CONNECTIONS: '100',
        TIMEOUT_MS: '5000'
      };
      
      const result = validateSecrets(secrets);
      expect(result.valid).toBe(true);
    });

    it('should handle boolean-like values', () => {
      const secrets = {
        ENABLED: 'true',
        DEBUG: 'false',
        FEATURE_FLAG: '1',
        DISABLED: '0'
      };
      
      const result = validateSecrets(secrets);
      expect(result.valid).toBe(true);
    });

    it('should handle missing required secrets for unknown namespace', () => {
      const secrets = {
        SOME_KEY: 'value'
      };
      
      // Unknown namespace should not have required secrets
      const result = validateSecrets(secrets, 'unknown-namespace');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});