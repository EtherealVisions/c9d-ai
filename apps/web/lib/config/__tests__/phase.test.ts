import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  PhaseEnvironmentLoader, 
  PhaseError,
  PhaseErrorType,
  loadEnvironmentWithFallback, 
  validatePhaseConfig, 
  createPhaseConfigFromEnv 
} from '../phase';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Phase.dev Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear environment variables
    delete process.env.PHASE_SERVICE_TOKEN;
    // Use Reflect.deleteProperty to avoid TypeScript read-only error
    Reflect.deleteProperty(process.env, 'NODE_ENV');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('PhaseEnvironmentLoader', () => {
    it('should load environment variables from Phase.dev API', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          secrets: [
            { key: 'DATABASE_URL', value: 'postgres://test' },
            { key: 'API_KEY', value: 'secret-key' }
          ]
        })
      };
      
      mockFetch.mockResolvedValueOnce(mockResponse);

      const loader = new PhaseEnvironmentLoader();
      const config = {
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web',
        environment: 'test'
      };

      const result = await loader.loadEnvironment(config);

      expect(result).toEqual({
        DATABASE_URL: 'postgres://test',
        API_KEY: 'secret-key'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://console.phase.dev/api/v1/secrets',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
            'X-App-Name': 'AI.C9d.Web',
            'X-Environment': 'test'
          })
        })
      );
    });

    it('should use cached environment variables when cache is valid', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          secrets: [{ key: 'TEST_VAR', value: 'test-value' }]
        })
      };
      
      mockFetch.mockResolvedValueOnce(mockResponse);

      const loader = new PhaseEnvironmentLoader();
      const config = {
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      };

      // First call should fetch from API
      await loader.loadEnvironment(config);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result = await loader.loadEnvironment(config);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still only called once
      expect(result).toEqual({ TEST_VAR: 'test-value' });
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      const loader = new PhaseEnvironmentLoader();
      const config = {
        serviceToken: 'invalid-token',
        appName: 'AI.C9d.Web'
      };

      await expect(loader.loadEnvironment(config)).rejects.toThrow(
        'Authentication failed: Unauthorized'
      );
    });

    it('should return cached data when API fails and cache exists', async () => {
      const mockSuccessResponse = {
        ok: true,
        json: async () => ({
          secrets: [{ key: 'CACHED_VAR', value: 'cached-value' }]
        })
      };

      const loader = new PhaseEnvironmentLoader();
      const config = {
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      };

      // First successful call to populate cache
      mockFetch.mockResolvedValueOnce(mockSuccessResponse);
      await loader.loadEnvironment(config);

      // Clear cache timestamp to force API call
      loader.clearCache();
      
      // Populate cache again
      mockFetch.mockResolvedValueOnce(mockSuccessResponse);
      await loader.loadEnvironment(config);

      // Now simulate API failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const result = await loader.loadEnvironment(config);
      expect(result).toEqual({ CACHED_VAR: 'cached-value' });
    });
  });

  describe('loadEnvironmentWithFallback', () => {
    it('should fallback to local environment when Phase.dev fails', async () => {
      const originalEnv = { ...process.env };
      process.env.FALLBACK_VAR = 'fallback-value';

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const config = {
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      };

      const result = await loadEnvironmentWithFallback(config);

      expect(result.FALLBACK_VAR).toBe('fallback-value');
      
      // Restore environment
      process.env = originalEnv;
    });
  });

  describe('validatePhaseConfig', () => {
    it('should validate correct configuration', () => {
      const config = {
        serviceToken: 'valid-token-123',
        appName: 'AI.C9d.Web'
      };

      expect(() => validatePhaseConfig(config)).not.toThrow();
    });

    it('should throw error for missing service token', () => {
      const config = {
        appName: 'AI.C9d.Web'
      };

      expect(() => validatePhaseConfig(config)).toThrow(
        'Phase.dev service token is required (PHASE_SERVICE_TOKEN)'
      );
    });

    it('should throw error for missing app name', () => {
      const config = {
        serviceToken: 'valid-token-123'
      };

      expect(() => validatePhaseConfig(config)).toThrow(
        'Phase.dev app name is required'
      );
    });

    it('should throw error for invalid service token', () => {
      const config = {
        serviceToken: 'short',
        appName: 'AI.C9d.Web'
      };

      expect(() => validatePhaseConfig(config)).toThrow(
        'Phase.dev service token appears to be invalid (too short)'
      );
    });
  });

  describe('createPhaseConfigFromEnv', () => {
    it('should create config from environment variables', () => {
      process.env.PHASE_SERVICE_TOKEN = 'env-token-123';
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true
      });

      const config = createPhaseConfigFromEnv();

      expect(config).toEqual({
        serviceToken: 'env-token-123',
        appName: 'AI.C9d.Web',
        environment: 'production'
      });
    });

    it('should return null when service token is missing', () => {
      const config = createPhaseConfigFromEnv();
      expect(config).toBeNull();
    });

    it('should default to development environment', () => {
      process.env.PHASE_SERVICE_TOKEN = 'env-token-123';
      Reflect.deleteProperty(process.env, 'NODE_ENV');

      const config = createPhaseConfigFromEnv();

      expect(config?.environment).toBe('development');
    });
  });

  describe('Error Handling and Retry Logic', () => {
    it('should retry on retryable errors with exponential backoff', async () => {
      const loader = new PhaseEnvironmentLoader();
      const config = {
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      };

      // Mock consecutive failures followed by success
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' })
        .mockResolvedValueOnce({ ok: false, status: 502, statusText: 'Bad Gateway' })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ secrets: [{ key: 'RETRY_VAR', value: 'retry-success' }] })
        });

      const result = await loader.loadEnvironment(config);

      expect(result).toEqual({ RETRY_VAR: 'retry-success' });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    }, 30000); // Increase timeout for retry test

    it('should not retry on non-retryable errors', async () => {
      const loader = new PhaseEnvironmentLoader();
      const config = {
        serviceToken: 'invalid-token',
        appName: 'AI.C9d.Web'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      await expect(loader.loadEnvironment(config)).rejects.toThrow('Authentication failed');
      expect(mockFetch).toHaveBeenCalledTimes(1); // No retries
    });

    it('should handle timeout errors', async () => {
      const loader = new PhaseEnvironmentLoader();
      const config = {
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      };

      // Mock AbortError for timeout
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      await expect(loader.loadEnvironment(config)).rejects.toThrow('Request timeout');
    }, 15000);

    it('should handle network errors', async () => {
      const loader = new PhaseEnvironmentLoader();
      const config = {
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      };

      mockFetch.mockRejectedValue(new Error('ENOTFOUND console.phase.dev'));

      await expect(loader.loadEnvironment(config)).rejects.toThrow('Network error');
    }, 15000);

    it('should handle rate limiting', async () => {
      const loader = new PhaseEnvironmentLoader();
      const config = {
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      });

      await expect(loader.loadEnvironment(config)).rejects.toThrow('Rate limit exceeded');
    }, 15000);
  });

  describe('Caching Behavior', () => {
    it('should cache environment variables with TTL', async () => {
      const loader = new PhaseEnvironmentLoader();
      const config = {
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      };

      const mockResponse = {
        ok: true,
        json: async () => ({
          secrets: [{ key: 'CACHED_VAR', value: 'cached-value' }]
        })
      };

      mockFetch.mockResolvedValue(mockResponse);

      // First call
      const result1 = await loader.loadEnvironment(config);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call within cache TTL
      const result2 = await loader.loadEnvironment(config);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still only called once
      expect(result1).toEqual(result2);
    });

    it('should provide cached environment variables', async () => {
      const loader = new PhaseEnvironmentLoader();
      const config = {
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          secrets: [{ key: 'CACHE_TEST', value: 'cache-test-value' }]
        })
      });

      await loader.loadEnvironment(config);
      const cached = loader.getCachedEnvironment();

      expect(cached).toEqual({ CACHE_TEST: 'cache-test-value' });
    });

    it('should clear cache when requested', async () => {
      const loader = new PhaseEnvironmentLoader();
      const config = {
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          secrets: [{ key: 'CLEAR_TEST', value: 'clear-test-value' }]
        })
      });

      // Load and cache
      await loader.loadEnvironment(config);
      expect(loader.getCachedEnvironment()).toEqual({ CLEAR_TEST: 'clear-test-value' });

      // Clear cache
      loader.clearCache();
      expect(loader.getCachedEnvironment()).toEqual({});

      // Next call should fetch again
      await loader.loadEnvironment(config);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Health Status and Monitoring', () => {
    it('should provide health status information', async () => {
      const loader = new PhaseEnvironmentLoader();
      const config = {
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      };

      // Initial health status
      let health = loader.getHealthStatus();
      expect(health.healthy).toBe(true);
      expect(health.lastError).toBeNull();
      expect(health.cacheValid).toBe(false);
      expect(health.lastSuccessfulFetch).toBeNull();

      // After successful load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ secrets: [{ key: 'HEALTH_VAR', value: 'healthy' }] })
      });

      await loader.loadEnvironment(config);
      health = loader.getHealthStatus();
      expect(health.healthy).toBe(true);
      expect(health.cacheValid).toBe(true);
      expect(health.lastSuccessfulFetch).toBeInstanceOf(Date);
    });

    it('should track last error in health status', async () => {
      const loader = new PhaseEnvironmentLoader();
      const config = {
        serviceToken: 'invalid-token',
        appName: 'AI.C9d.Web'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      try {
        await loader.loadEnvironment(config);
      } catch (error) {
        // Expected to throw
      }

      const health = loader.getHealthStatus();
      expect(health.healthy).toBe(false);
      expect(health.lastError).toBeInstanceOf(PhaseError);
      expect(health.lastError?.type).toBe(PhaseErrorType.AUTHENTICATION);
    });
  });

  describe('Fallback Logic Integration', () => {
    it('should merge Phase.dev and local environment variables', async () => {
      const originalEnv = { ...process.env };
      process.env.LOCAL_VAR = 'local-value';
      process.env.SHARED_VAR = 'local-shared-value';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          secrets: [
            { key: 'PHASE_VAR', value: 'phase-value' },
            { key: 'SHARED_VAR', value: 'phase-shared-value' }
          ]
        })
      });

      const config = {
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      };

      const result = await loadEnvironmentWithFallback(config, true);

      // Local env should take precedence for shared variables
      expect(result.LOCAL_VAR).toBe('local-value');
      expect(result.PHASE_VAR).toBe('phase-value');
      expect(result.SHARED_VAR).toBe('local-shared-value');

      // Restore environment
      process.env = originalEnv;
    });

    it('should handle Phase.dev failure with fallback disabled', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const config = {
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      };

      await expect(loadEnvironmentWithFallback(config, false)).rejects.toThrow();
    });
  });
});