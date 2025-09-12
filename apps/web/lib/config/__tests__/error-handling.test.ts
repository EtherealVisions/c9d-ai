import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  PhaseEnvironmentLoader, 
  PhaseError,
  PhaseErrorType,
  loadEnvironmentWithFallback,
  validatePhaseConfig
} from '../phase';
import { CentralizedConfigManager } from '../manager';

// Mock node-fetch
vi.mock('node-fetch', () => ({
  default: vi.fn()
}));

import fetch from 'node-fetch';
const mockFetch = vi.mocked(fetch);

describe('Configuration Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear environment variables
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('TEST_') || key.startsWith('ERROR_')) {
        delete process.env[key];
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('PhaseError Class', () => {
    it('should create PhaseError with all properties', () => {
      const error = new PhaseError(
        'Test error message',
        PhaseErrorType.AUTHENTICATION,
        401,
        false
      );

      expect(error.message).toBe('Test error message');
      expect(error.type).toBe(PhaseErrorType.AUTHENTICATION);
      expect(error.statusCode).toBe(401);
      expect(error.retryable).toBe(false);
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.name).toBe('PhaseError');
    });

    it('should create PhaseError with minimal properties', () => {
      const error = new PhaseError('Minimal error', PhaseErrorType.UNKNOWN);

      expect(error.message).toBe('Minimal error');
      expect(error.type).toBe(PhaseErrorType.UNKNOWN);
      expect(error.statusCode).toBeUndefined();
      expect(error.retryable).toBe(false);
    });
  });

  describe('Network Error Scenarios', () => {
    it('should handle DNS resolution failures', async () => {
      const loader = new PhaseEnvironmentLoader();
      const config = {
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      };

      mockFetch.mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND console.phase.dev'));

      await expect(loader.loadEnvironment(config)).rejects.toThrow(
        expect.objectContaining({
          type: PhaseErrorType.NETWORK,
          retryable: true
        })
      );
    });

    it('should handle connection refused errors', async () => {
      const loader = new PhaseEnvironmentLoader();
      const config = {
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      };

      mockFetch.mockRejectedValueOnce(new Error('connect ECONNREFUSED 127.0.0.1:443'));

      await expect(loader.loadEnvironment(config)).rejects.toThrow(
        expect.objectContaining({
          type: PhaseErrorType.NETWORK,
          retryable: true
        })
      );
    });

    it('should handle SSL/TLS errors', async () => {
      const loader = new PhaseEnvironmentLoader();
      const config = {
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      };

      mockFetch.mockRejectedValueOnce(new Error('certificate verify failed'));

      await expect(loader.loadEnvironment(config)).rejects.toThrow(
        expect.objectContaining({
          type: PhaseErrorType.UNKNOWN,
          retryable: false
        })
      );
    });
  });

  describe('HTTP Error Scenarios', () => {
    it('should handle 400 Bad Request errors', async () => {
      const loader = new PhaseEnvironmentLoader();
      const config = {
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      });

      await expect(loader.loadEnvironment(config)).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          retryable: false
        })
      );
    });

    it('should handle 403 Forbidden errors', async () => {
      const loader = new PhaseEnvironmentLoader();
      const config = {
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      });

      await expect(loader.loadEnvironment(config)).rejects.toThrow(
        expect.objectContaining({
          statusCode: 403,
          retryable: false
        })
      );
    });

    it('should handle 404 Not Found errors', async () => {
      const loader = new PhaseEnvironmentLoader();
      const config = {
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(loader.loadEnvironment(config)).rejects.toThrow(
        expect.objectContaining({
          statusCode: 404,
          retryable: false
        })
      );
    });

    it('should handle 503 Service Unavailable errors', async () => {
      const loader = new PhaseEnvironmentLoader();
      const config = {
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      });

      await expect(loader.loadEnvironment(config)).rejects.toThrow(
        expect.objectContaining({
          type: PhaseErrorType.SERVER_ERROR,
          statusCode: 503,
          retryable: true
        })
      );
    });

    it('should handle 504 Gateway Timeout errors', async () => {
      const loader = new PhaseEnvironmentLoader();
      const config = {
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 504,
        statusText: 'Gateway Timeout'
      });

      await expect(loader.loadEnvironment(config)).rejects.toThrow(
        expect.objectContaining({
          type: PhaseErrorType.SERVER_ERROR,
          statusCode: 504,
          retryable: true
        })
      );
    });
  });

  describe('Malformed Response Handling', () => {
    it('should handle invalid JSON responses', async () => {
      const loader = new PhaseEnvironmentLoader();
      const config = {
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Unexpected token in JSON');
        }
      });

      await expect(loader.loadEnvironment(config)).rejects.toThrow();
    });

    it('should handle missing secrets array in response', async () => {
      const loader = new PhaseEnvironmentLoader();
      const config = {
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          // Missing secrets array
          message: 'Success'
        })
      });

      const result = await loader.loadEnvironment(config);
      expect(result).toEqual({});
    });

    it('should handle malformed secrets in response', async () => {
      const loader = new PhaseEnvironmentLoader();
      const config = {
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          secrets: [
            { key: 'VALID_SECRET', value: 'valid-value' },
            { key: null, value: 'invalid-key' }, // Invalid key
            { key: 'MISSING_VALUE' }, // Missing value
            { value: 'missing-key' }, // Missing key
            'invalid-secret-format' // Wrong format
          ]
        })
      });

      const result = await loader.loadEnvironment(config);
      expect(result).toEqual({
        VALID_SECRET: 'valid-value'
      });
    });
  });

  describe('Configuration Validation Error Handling', () => {
    it('should handle empty service token', () => {
      const config = {
        serviceToken: '',
        appName: 'AI.C9d.Web'
      };

      expect(() => validatePhaseConfig(config)).toThrow(
        'Phase.dev service token is required (PHASE_SERVICE_TOKEN)'
      );
    });

    it('should handle whitespace-only service token', () => {
      const config = {
        serviceToken: '   ',
        appName: 'AI.C9d.Web'
      };

      expect(() => validatePhaseConfig(config)).toThrow(
        'Phase.dev service token appears to be invalid (too short)'
      );
    });

    it('should handle empty app name', () => {
      const config = {
        serviceToken: 'valid-token-123',
        appName: ''
      };

      expect(() => validatePhaseConfig(config)).toThrow(
        'Phase.dev app name is required'
      );
    });

    it('should handle whitespace-only app name', () => {
      const config = {
        serviceToken: 'valid-token-123',
        appName: '   '
      };

      expect(() => validatePhaseConfig(config)).toThrow(
        'Phase.dev app name is required'
      );
    });
  });

  describe('Fallback Error Scenarios', () => {
    it('should handle fallback when Phase.dev returns empty response', async () => {
      process.env.ERROR_FALLBACK_VAR = 'fallback-value';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ secrets: [] })
      });

      const config = {
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      };

      const result = await loadEnvironmentWithFallback(config, true);
      expect(result.ERROR_FALLBACK_VAR).toBe('fallback-value');
    });

    it('should handle fallback when Phase.dev is completely unreachable', async () => {
      process.env.ERROR_UNREACHABLE_VAR = 'unreachable-fallback';

      mockFetch.mockRejectedValueOnce(new Error('Network unreachable'));

      const config = {
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      };

      const result = await loadEnvironmentWithFallback(config, true);
      expect(result.ERROR_UNREACHABLE_VAR).toBe('unreachable-fallback');
    });
  });

  describe('Configuration Manager Error Recovery', () => {
    it('should recover from validation errors with fallback', async () => {
      process.env.ERROR_RECOVERY_VAR = 'recovery-value';

      // Mock the phase module functions
      vi.doMock('../phase', () => ({
        ...vi.importActual('../phase'),
        createPhaseConfigFromEnv: vi.fn().mockReturnValue({
          serviceToken: 'test-token',
          appName: 'AI.C9d.Web'
        }),
        loadEnvironmentWithFallback: vi.fn().mockRejectedValue(
          new Error('Phase.dev validation failed')
        )
      }));

      const { CentralizedConfigManager } = await import('../manager');

      const manager = new CentralizedConfigManager({
        validationRules: [
          {
            key: 'REQUIRED_VAR',
            required: true
          }
        ],
        fallbackToEnv: true
      });

      await manager.initialize();

      expect(manager.isInitialized()).toBe(true);
      expect(manager.get('ERROR_RECOVERY_VAR')).toBe('recovery-value');
    });

    it('should handle refresh errors without breaking existing config', async () => {
      // Mock the phase module functions
      vi.doMock('../phase', () => ({
        ...vi.importActual('../phase'),
        createPhaseConfigFromEnv: vi.fn().mockReturnValue({
          serviceToken: 'test-token',
          appName: 'AI.C9d.Web'
        }),
        loadEnvironmentWithFallback: vi.fn()
          .mockResolvedValueOnce({ INITIAL_VAR: 'initial-value' })
          .mockRejectedValueOnce(new Error('Refresh network error'))
      }));

      const { CentralizedConfigManager } = await import('../manager');
      const manager = new CentralizedConfigManager();

      await manager.initialize();
      expect(manager.get('INITIAL_VAR')).toBe('initial-value');

      // Refresh should fail but not break existing config
      await expect(manager.refresh()).rejects.toThrow('Refresh network error');
      expect(manager.get('INITIAL_VAR')).toBe('initial-value');
    });
  });

  describe('Memory and Resource Management', () => {
    it('should handle memory pressure during large config loads', async () => {
      const loader = new PhaseEnvironmentLoader();
      const config = {
        serviceToken: 'test-token',
        appName: 'AI.C9d.Web'
      };

      // Mock a large response
      const largeSecrets = Array.from({ length: 1000 }, (_, i) => ({
        key: `LARGE_VAR_${i}`,
        value: `large-value-${i}`.repeat(100) // Large values
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ secrets: largeSecrets })
      });

      const result = await loader.loadEnvironment(config);
      expect(Object.keys(result)).toHaveLength(1000);
      expect(result.LARGE_VAR_0).toContain('large-value-0');
    });

    it('should handle cleanup on manager destruction', async () => {
      const manager = new CentralizedConfigManager();

      vi.mocked(require('../phase').createPhaseConfigFromEnv).mockReturnValue(null);
      await manager.initialize();

      expect(manager.isInitialized()).toBe(true);

      manager.destroy();
      expect(manager.isInitialized()).toBe(false);
    });
  });
});