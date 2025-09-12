import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  CentralizedConfigManager, 
  getConfigManager, 
  initializeGlobalConfig, 
  getConfig, 
  getAllConfig,
  DEFAULT_VALIDATION_RULES,
  ValidationRule,
  resetConfigManager
} from '../manager';

// Mock the phase module
vi.mock('../phase', () => ({
  PhaseEnvironmentLoader: vi.fn().mockImplementation(() => ({
    loadEnvironment: vi.fn(),
    getCachedEnvironment: vi.fn(),
    getLastError: vi.fn().mockReturnValue(null),
    getHealthStatus: vi.fn().mockReturnValue({
      healthy: true,
      lastError: null,
      cacheValid: true,
      lastSuccessfulFetch: new Date()
    }),
    clearCache: vi.fn()
  })),
  loadEnvironmentWithFallback: vi.fn(),
  validatePhaseConfig: vi.fn(),
  createPhaseConfigFromEnv: vi.fn(),
  PhaseError: vi.fn(),
  PhaseErrorType: {
    AUTHENTICATION: 'AUTHENTICATION',
    NETWORK: 'NETWORK',
    TIMEOUT: 'TIMEOUT',
    RATE_LIMIT: 'RATE_LIMIT',
    SERVER_ERROR: 'SERVER_ERROR',
    VALIDATION: 'VALIDATION',
    UNKNOWN: 'UNKNOWN'
  }
}));

import { loadEnvironmentWithFallback, createPhaseConfigFromEnv } from '../phase';

const mockLoadEnvironmentWithFallback = vi.mocked(loadEnvironmentWithFallback);
const mockCreatePhaseConfigFromEnv = vi.mocked(createPhaseConfigFromEnv);

describe('Configuration Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetConfigManager();
    
    // Clear environment variables
    delete process.env.DATABASE_URL;
    delete process.env.PHASE_SERVICE_TOKEN;
    delete process.env.GLOBAL_VAR;
    delete process.env.LOCAL_VAR;
    delete process.env.FALLBACK_VAR;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('CentralizedConfigManager', () => {
    it('should initialize with Phase.dev configuration', async () => {
      const mockPhaseConfig = {
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      };

      const mockEnvVars = {
        DATABASE_URL: 'postgresql://test',
        API_KEY: 'secret-key'
      };

      mockCreatePhaseConfigFromEnv.mockReturnValue(mockPhaseConfig);
      mockLoadEnvironmentWithFallback.mockResolvedValue(mockEnvVars);

      const manager = new CentralizedConfigManager();
      await manager.initialize();

      expect(manager.isInitialized()).toBe(true);
      expect(manager.get('DATABASE_URL')).toBe('postgresql://test');
      expect(manager.get('API_KEY')).toBe('secret-key');
    });

    it('should fallback to local environment when Phase.dev is not configured', async () => {
      process.env.LOCAL_VAR = 'local-value';
      
      mockCreatePhaseConfigFromEnv.mockReturnValue(null);

      const manager = new CentralizedConfigManager();
      await manager.initialize();

      expect(manager.isInitialized()).toBe(true);
      expect(manager.get('LOCAL_VAR')).toBe('local-value');
    });

    it('should validate configuration against rules', async () => {
      const validationRules: ValidationRule[] = [
        {
          key: 'REQUIRED_VAR',
          required: true
        },
        {
          key: 'URL_VAR',
          required: false,
          validator: (value: string) => value.startsWith('https://'),
          errorMessage: 'URL_VAR must be HTTPS'
        }
      ];

      mockCreatePhaseConfigFromEnv.mockReturnValue(null);

      const manager = new CentralizedConfigManager({
        validationRules,
        fallbackToEnv: false
      });

      await expect(manager.initialize()).rejects.toThrow(
        'Required configuration variable \'REQUIRED_VAR\' is missing'
      );
    });

    it('should handle validation errors gracefully with fallback', async () => {
      process.env.FALLBACK_VAR = 'fallback-value';
      
      const validationRules: ValidationRule[] = [
        {
          key: 'REQUIRED_VAR',
          required: true
        }
      ];

      mockCreatePhaseConfigFromEnv.mockReturnValue({
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      });
      
      mockLoadEnvironmentWithFallback.mockRejectedValue(new Error('Phase.dev error'));

      const manager = new CentralizedConfigManager({
        validationRules,
        fallbackToEnv: true
      });

      await manager.initialize();

      expect(manager.isInitialized()).toBe(true);
      expect(manager.get('FALLBACK_VAR')).toBe('fallback-value');
    });

    it('should refresh configuration', async () => {
      const mockPhaseConfig = {
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      };

      mockCreatePhaseConfigFromEnv.mockReturnValue(mockPhaseConfig);
      mockLoadEnvironmentWithFallback
        .mockResolvedValueOnce({ INITIAL_VAR: 'initial-value' })
        .mockResolvedValueOnce({ UPDATED_VAR: 'updated-value' });

      const manager = new CentralizedConfigManager();
      await manager.initialize();

      expect(manager.get('INITIAL_VAR')).toBe('initial-value');
      expect(manager.get('UPDATED_VAR')).toBeUndefined();

      await manager.refresh();

      expect(manager.get('UPDATED_VAR')).toBe('updated-value');
    });

    it('should throw error when accessing uninitialized manager', () => {
      const manager = new CentralizedConfigManager();

      expect(() => manager.get('TEST_VAR')).toThrow(
        'Configuration manager not initialized. Call initialize() first.'
      );

      expect(() => manager.getAll()).toThrow(
        'Configuration manager not initialized. Call initialize() first.'
      );
    });

    it('should provide configuration statistics', async () => {
      mockCreatePhaseConfigFromEnv.mockReturnValue({
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      });
      
      mockLoadEnvironmentWithFallback.mockResolvedValue({
        VAR1: 'value1',
        VAR2: 'value2'
      });

      const manager = new CentralizedConfigManager();
      await manager.initialize();

      const stats = manager.getStats();

      expect(stats.initialized).toBe(true);
      expect(stats.configCount).toBe(2);
      expect(stats.phaseConfigured).toBe(true);
      expect(stats.cacheEnabled).toBe(true);
      expect(stats.lastRefresh).toBeInstanceOf(Date);
    });
  });

  describe('Global Configuration Manager', () => {
    it('should create singleton instance', () => {
      const manager1 = getConfigManager();
      const manager2 = getConfigManager();

      expect(manager1).toBe(manager2);
    });

    it('should initialize global configuration', async () => {
      mockCreatePhaseConfigFromEnv.mockReturnValue(null);
      process.env.GLOBAL_VAR = 'global-value';

      const manager = await initializeGlobalConfig();

      expect(manager.isInitialized()).toBe(true);
      expect(getConfig('GLOBAL_VAR')).toBe('global-value');
    });

    it('should throw error when accessing uninitialized global config', () => {
      expect(() => getConfig('TEST_VAR')).toThrow(
        'Global configuration manager not initialized. Call initializeGlobalConfig() first.'
      );

      expect(() => getAllConfig()).toThrow(
        'Global configuration manager not initialized. Call initializeGlobalConfig() first.'
      );
    });
  });

  describe('Default Validation Rules', () => {
    it('should include common configuration variables', () => {
      const ruleKeys = DEFAULT_VALIDATION_RULES.map(rule => rule.key);

      expect(ruleKeys).toContain('DATABASE_URL');
      expect(ruleKeys).toContain('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
      expect(ruleKeys).toContain('CLERK_SECRET_KEY');
      expect(ruleKeys).toContain('NEXT_PUBLIC_SUPABASE_URL');
      expect(ruleKeys).toContain('SUPABASE_SERVICE_ROLE_KEY');
    });

    it('should validate DATABASE_URL format', () => {
      const rule = DEFAULT_VALIDATION_RULES.find(r => r.key === 'DATABASE_URL');
      
      expect(rule?.validator?.('postgresql://user:pass@host:5432/db')).toBe(true);
      expect(rule?.validator?.('postgres://user:pass@host:5432/db')).toBe(true);
      expect(rule?.validator?.('mysql://user:pass@host:3306/db')).toBe(false);
    });

    it('should validate Clerk keys format', () => {
      const pubKeyRule = DEFAULT_VALIDATION_RULES.find(r => r.key === 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
      const secretKeyRule = DEFAULT_VALIDATION_RULES.find(r => r.key === 'CLERK_SECRET_KEY');
      
      expect(pubKeyRule?.validator?.('pk_test_1234567890')).toBe(true);
      expect(pubKeyRule?.validator?.('invalid_key')).toBe(false);
      
      expect(secretKeyRule?.validator?.('sk_test_1234567890')).toBe(true);
      expect(secretKeyRule?.validator?.('invalid_key')).toBe(false);
    });
  });

  describe('Advanced Error Handling', () => {
    it('should handle Phase.dev authentication errors', async () => {
      const mockPhaseConfig = {
        serviceToken: 'invalid-token',
        appName: 'AI.C9d.Web'
      };

      mockCreatePhaseConfigFromEnv.mockReturnValue(mockPhaseConfig);
      mockLoadEnvironmentWithFallback.mockRejectedValue(
        new Error('Authentication failed: Invalid token')
      );

      const manager = new CentralizedConfigManager({ fallbackToEnv: false });

      await expect(manager.initialize()).rejects.toThrow('Authentication failed');
    });

    it('should handle network connectivity issues', async () => {
      const mockPhaseConfig = {
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      };

      mockCreatePhaseConfigFromEnv.mockReturnValue(mockPhaseConfig);
      mockLoadEnvironmentWithFallback.mockRejectedValue(
        new Error('Network error: ENOTFOUND')
      );

      process.env.NETWORK_FALLBACK = 'fallback-value';

      const manager = new CentralizedConfigManager({ fallbackToEnv: true });
      await manager.initialize();

      expect(manager.isInitialized()).toBe(true);
      expect(manager.get('NETWORK_FALLBACK')).toBe('fallback-value');
    });

    it('should handle validation errors with detailed messages', async () => {
      const validationRules: ValidationRule[] = [
        {
          key: 'CUSTOM_URL',
          required: true,
          validator: (value: string) => value.startsWith('https://'),
          errorMessage: 'CUSTOM_URL must be a secure HTTPS URL'
        },
        {
          key: 'CUSTOM_KEY',
          required: true,
          validator: (value: string) => value.length >= 32,
          errorMessage: 'CUSTOM_KEY must be at least 32 characters long'
        }
      ];

      mockCreatePhaseConfigFromEnv.mockReturnValue(null);
      mockLoadEnvironmentWithFallback.mockResolvedValue({
        CUSTOM_URL: 'http://insecure.com',
        CUSTOM_KEY: 'short'
      });

      const manager = new CentralizedConfigManager({
        validationRules,
        fallbackToEnv: false
      });

      await expect(manager.initialize()).rejects.toThrow(
        expect.stringContaining('CUSTOM_URL must be a secure HTTPS URL')
      );
    });

    it('should perform health checks and report status', async () => {
      mockCreatePhaseConfigFromEnv.mockReturnValue(null);

      const manager = new CentralizedConfigManager();
      await manager.initialize();

      const healthStatus = manager.getHealthStatus();
      expect(healthStatus).toBeDefined();
      expect(healthStatus.initialized).toBe(true);
    });

    it('should handle refresh failures gracefully', async () => {
      const mockPhaseConfig = {
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      };

      mockCreatePhaseConfigFromEnv.mockReturnValue(mockPhaseConfig);
      mockLoadEnvironmentWithFallback
        .mockResolvedValueOnce({ INITIAL_VAR: 'initial' })
        .mockRejectedValueOnce(new Error('Refresh failed'));

      const manager = new CentralizedConfigManager();
      await manager.initialize();

      // Refresh should not throw for retryable errors
      await expect(manager.refresh()).rejects.toThrow('Refresh failed');
      
      // But manager should still be functional
      expect(manager.get('INITIAL_VAR')).toBe('initial');
    });
  });

  describe('Cache Management', () => {
    it('should respect cache TTL settings', async () => {
      const shortCacheTTL = 100; // 100ms
      
      mockCreatePhaseConfigFromEnv.mockReturnValue({
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      });
      
      mockLoadEnvironmentWithFallback
        .mockResolvedValueOnce({ CACHE_VAR: 'initial' })
        .mockResolvedValueOnce({ CACHE_VAR: 'updated' });

      const manager = new CentralizedConfigManager({
        cacheTTL: shortCacheTTL
      });
      
      await manager.initialize();
      expect(manager.get('CACHE_VAR')).toBe('initial');

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, shortCacheTTL + 50));

      // Access should trigger background refresh
      manager.get('CACHE_VAR');
      
      // Give time for background refresh
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockLoadEnvironmentWithFallback).toHaveBeenCalledTimes(2);
    });

    it('should disable caching when configured', async () => {
      mockCreatePhaseConfigFromEnv.mockReturnValue({
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      });
      
      mockLoadEnvironmentWithFallback.mockResolvedValue({ NO_CACHE_VAR: 'value' });

      const manager = new CentralizedConfigManager({
        enableCaching: false
      });
      
      await manager.initialize();
      
      const stats = manager.getStats();
      expect(stats.cacheEnabled).toBe(false);
    });
  });

  describe('Configuration Statistics and Monitoring', () => {
    it('should provide comprehensive statistics', async () => {
      mockCreatePhaseConfigFromEnv.mockReturnValue({
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      });
      
      mockLoadEnvironmentWithFallback.mockResolvedValue({
        STAT_VAR1: 'value1',
        STAT_VAR2: 'value2',
        STAT_VAR3: 'value3'
      });

      const manager = new CentralizedConfigManager();
      await manager.initialize();

      const stats = manager.getStats();
      
      expect(stats.initialized).toBe(true);
      expect(stats.configCount).toBe(3);
      expect(stats.lastRefresh).toBeInstanceOf(Date);
      expect(stats.cacheEnabled).toBe(true);
      expect(stats.phaseConfigured).toBe(true);
      expect(stats.lastError).toBeNull();
      expect(stats.healthy).toBe(true);
    });

    it('should track errors in statistics', async () => {
      mockCreatePhaseConfigFromEnv.mockReturnValue({
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      });
      
      const testError = new Error('Test error');
      mockLoadEnvironmentWithFallback.mockRejectedValue(testError);

      const manager = new CentralizedConfigManager({ fallbackToEnv: true });
      await manager.initialize();

      const stats = manager.getStats();
      expect(stats.lastError).toBe(testError);
      expect(stats.healthy).toBe(false);
    });
  });
});