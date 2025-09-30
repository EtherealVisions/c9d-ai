import { PhaseClient } from './client';
import Phase from '@phase.dev/phase-node';
import { SecretCache } from './cache';
import { validateSecrets } from './validator';
import { resolveEnvironment } from './resolver';
import { getPhaseAppName } from './config-reader';

// Mock all dependencies
jest.mock('@phase.dev/phase-node');
jest.mock('./cache');
jest.mock('./validator');
jest.mock('./resolver');
jest.mock('./config-reader');

describe('PhaseClient', () => {
  const MockPhase = Phase as jest.MockedClass<typeof Phase>;
  const MockSecretCache = SecretCache as jest.MockedClass<typeof SecretCache>;
  const mockResolveEnvironment = resolveEnvironment as jest.MockedFunction<typeof resolveEnvironment>;
  const mockValidateSecrets = validateSecrets as jest.MockedFunction<typeof validateSecrets>;
  const mockGetPhaseAppName = getPhaseAppName as jest.MockedFunction<typeof getPhaseAppName>;

  let client: PhaseClient;
  let mockPhaseInstance: any;
  let mockCacheInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock instances
    mockPhaseInstance = {
      init: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      apps: []
    };
    MockPhase.mockImplementation(() => mockPhaseInstance);

    mockCacheInstance = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      getStale: jest.fn(),
      getStats: jest.fn().mockReturnValue({
        maxMemoryMB: 50,
        percentUsed: 10,
        healthStatus: 'healthy'
      })
    };
    MockSecretCache.mockImplementation(() => mockCacheInstance);

    // Setup default mock behaviors
    mockResolveEnvironment.mockReturnValue('production');
    mockGetPhaseAppName.mockReturnValue('test-app');
    mockValidateSecrets.mockReturnValue({
      valid: true,
      errors: [],
      warnings: []
    });
  });

  describe('constructor', () => {
    it('should initialize with required config', () => {
      client = new PhaseClient({
        appNamespace: 'test-app',
        token: 'test-token'
      });

      expect(MockPhase).toHaveBeenCalledWith('test-token');
      expect(MockSecretCache).toHaveBeenCalledWith({ enabled: true, ttl: 300 });
    });

    it('should use custom cache config', () => {
      client = new PhaseClient({
        appNamespace: 'test-app',
        token: 'test-token',
        cache: { enabled: false }
      });

      expect(MockSecretCache).toHaveBeenCalledWith({ enabled: false });
    });

    it('should handle all config options', () => {
      const config = {
        appNamespace: 'test-app',
        token: 'test-token',
        phaseEnv: 'staging' as const,
        strict: true,
        stripPrefix: false,
        cache: { enabled: true, ttl: 600 },
        apiUrl: 'https://custom-api.phase.dev',
        timeout: 10000,
        debug: false
      };

      client = new PhaseClient(config);

      expect(MockPhase).toHaveBeenCalledWith('test-token');
      expect(MockSecretCache).toHaveBeenCalledWith({ enabled: true, ttl: 600 });
    });
  });

  describe('getSecrets', () => {
    beforeEach(() => {
      client = new PhaseClient({
        appNamespace: 'test-app',
        token: 'test-token'
      });
    });

    it('should fetch secrets successfully', async () => {
      // Setup mocks
      mockPhaseInstance.apps = [
        {
          id: 'app-123',
          name: 'test-app',
          environments: [
            { id: 'env-123', name: 'production' }
          ]
        }
      ];
      
      mockPhaseInstance.get.mockResolvedValue([
        { key: 'API_KEY', value: 'secret123' },
        { key: 'DATABASE_URL', value: 'postgres://localhost' }
      ]);
      
      mockCacheInstance.get.mockResolvedValue(null);

      const result = await client.getSecrets();

      expect(mockPhaseInstance.init).toHaveBeenCalled();
      expect(mockPhaseInstance.get).toHaveBeenCalledWith({
        appId: 'app-123',
        envName: 'production'
      });
      expect(result).toEqual({
        API_KEY: 'secret123',
        DATABASE_URL: 'postgres://localhost'
      });
      expect(mockCacheInstance.set).toHaveBeenCalledWith('production', result);
    });

    it('should return cached secrets', async () => {
      const cachedSecrets = {
        API_KEY: 'cached-secret',
        DATABASE_URL: 'cached-db'
      };
      mockCacheInstance.get.mockResolvedValue(cachedSecrets);

      const result = await client.getSecrets();

      expect(result).toEqual(cachedSecrets);
      expect(mockPhaseInstance.get).not.toHaveBeenCalled();
    });

    it('should strip prefixes when enabled', async () => {
      client = new PhaseClient({
        appNamespace: 'test-app',
        token: 'test-token',
        stripPrefix: true
      });

      mockPhaseInstance.apps = [
        {
          id: 'app-123',
          name: 'test-app',
          environments: [{ id: 'env-123', name: 'production' }]
        }
      ];
      
      mockPhaseInstance.get.mockResolvedValue([
        { key: 'test-app__API_KEY', value: 'secret123' },
        { key: 'SHARED__DATABASE_URL', value: 'postgres://localhost' },
        { key: 'OTHER_KEY', value: 'other-value' }
      ]);
      
      mockCacheInstance.get.mockResolvedValue(null);

      const result = await client.getSecrets();

      expect(result).toEqual({
        API_KEY: 'secret123',
        DATABASE_URL: 'postgres://localhost',
        OTHER_KEY: 'other-value'
      });
    });

    it('should validate secrets in strict mode', async () => {
      client = new PhaseClient({
        appNamespace: 'test-app',
        token: 'test-token',
        strict: true
      });

      mockPhaseInstance.apps = [
        {
          id: 'app-123',
          name: 'test-app',
          environments: [{ id: 'env-123', name: 'production' }]
        }
      ];
      
      mockPhaseInstance.get.mockResolvedValue([
        { key: 'API_KEY', value: '' }
      ]);
      
      mockCacheInstance.get.mockResolvedValue(null);
      
      mockValidateSecrets.mockReturnValue({
        valid: false,
        errors: [{ key: 'API_KEY', message: 'Empty value', required: false }],
        warnings: []
      });

      await expect(client.getSecrets()).rejects.toThrow('Secret validation failed');
    });

    it('should handle app not found', async () => {
      mockPhaseInstance.apps = [];
      mockCacheInstance.get.mockResolvedValue(null);

      await expect(client.getSecrets()).rejects.toThrow("App 'test-app' not found");
    });

    it('should handle environment not found', async () => {
      mockPhaseInstance.apps = [
        {
          id: 'app-123',
          name: 'test-app',
          environments: [{ id: 'env-123', name: 'development' }]
        }
      ];
      mockCacheInstance.get.mockResolvedValue(null);

      await expect(client.getSecrets()).rejects.toThrow("Environment 'production' not found");
    });

    it('should return stale cache on error', async () => {
      mockPhaseInstance.apps = [
        {
          id: 'app-123',
          name: 'test-app',
          environments: [{ id: 'env-123', name: 'production' }]
        }
      ];
      mockPhaseInstance.get.mockRejectedValue(new Error('Network error'));
      mockCacheInstance.get.mockResolvedValue(null);
      mockCacheInstance.getStale.mockResolvedValue({
        API_KEY: 'stale-secret'
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = await client.getSecrets();

      expect(result).toEqual({ API_KEY: 'stale-secret' });
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Using stale cache'));
      consoleSpy.mockRestore();
    });

    it('should handle object-style secrets response', async () => {
      mockPhaseInstance.apps = [
        {
          id: 'app-123',
          name: 'test-app',
          environments: [{ id: 'env-123', name: 'production' }]
        }
      ];
      
      // Return object instead of array
      mockPhaseInstance.get.mockResolvedValue({
        API_KEY: 'secret123',
        DATABASE_URL: 'postgres://localhost'
      });
      
      mockCacheInstance.get.mockResolvedValue(null);

      const result = await client.getSecrets();

      expect(result).toEqual({
        API_KEY: 'secret123',
        DATABASE_URL: 'postgres://localhost'
      });
    });

    it('should handle empty values in secrets', async () => {
      mockPhaseInstance.apps = [
        {
          id: 'app-123',
          name: 'test-app',
          environments: [{ id: 'env-123', name: 'production' }]
        }
      ];
      
      mockPhaseInstance.get.mockResolvedValue([
        { key: 'API_KEY', value: 'secret123' },
        { key: 'EMPTY_KEY', value: null },
        { key: 'UNDEFINED_KEY' }
      ]);
      
      mockCacheInstance.get.mockResolvedValue(null);

      const result = await client.getSecrets();

      expect(result).toEqual({
        API_KEY: 'secret123',
        EMPTY_KEY: '',
        UNDEFINED_KEY: ''
      });
    });
  });

  describe('getSecret', () => {
    beforeEach(() => {
      client = new PhaseClient({
        appNamespace: 'test-app',
        token: 'test-token'
      });
    });

    it('should return single secret value', async () => {
      mockCacheInstance.get.mockResolvedValue({
        API_KEY: 'secret123',
        DATABASE_URL: 'postgres://localhost'
      });

      const result = await client.getSecret('API_KEY');
      expect(result).toBe('secret123');
    });

    it('should return undefined for non-existent key', async () => {
      mockCacheInstance.get.mockResolvedValue({
        API_KEY: 'secret123'
      });

      const result = await client.getSecret('NON_EXISTENT');
      expect(result).toBeUndefined();
    });
  });

  describe('refresh', () => {
    beforeEach(() => {
      client = new PhaseClient({
        appNamespace: 'test-app',
        token: 'test-token'
      });
    });

    it('should clear cache and fetch fresh secrets', async () => {
      mockPhaseInstance.apps = [
        {
          id: 'app-123',
          name: 'test-app',
          environments: [{ id: 'env-123', name: 'production' }]
        }
      ];
      
      mockPhaseInstance.get.mockResolvedValue([
        { key: 'API_KEY', value: 'fresh-secret' }
      ]);

      await client.refresh();

      expect(mockCacheInstance.delete).toHaveBeenCalledWith('production');
      expect(mockPhaseInstance.get).toHaveBeenCalled();
    });
  });

  describe('inject', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      client = new PhaseClient({
        appNamespace: 'test-app',
        token: 'test-token'
      });
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should inject secrets into process.env', async () => {
      mockCacheInstance.get.mockResolvedValue({
        NEW_KEY: 'new-value',
        ANOTHER_KEY: 'another-value'
      });

      await client.inject();

      expect(process.env.NEW_KEY).toBe('new-value');
      expect(process.env.ANOTHER_KEY).toBe('another-value');
    });
  });

  describe('getEnvironment', () => {
    it('should return resolved environment', () => {
      client = new PhaseClient({
        appNamespace: 'test-app',
        token: 'test-token'
      });

      mockResolveEnvironment.mockReturnValue('staging');

      expect(client.getEnvironment()).toBe('staging');
    });
  });

  describe('clearCache', () => {
    it('should clear cache', async () => {
      client = new PhaseClient({
        appNamespace: 'test-app',
        token: 'test-token'
      });

      await client.clearCache();

      expect(mockCacheInstance.clear).toHaveBeenCalled();
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      client = new PhaseClient({
        appNamespace: 'test-app',
        token: 'test-token'
      });

      const stats = { entries: 5, memoryUsageMB: 1.2 };
      mockCacheInstance.getStats.mockReturnValue(stats);

      expect(client.getCacheStats()).toEqual(stats);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      client = new PhaseClient({
        appNamespace: 'test-app',
        token: 'test-token'
      });
    });

    it('should handle Phase SDK init errors', async () => {
      mockPhaseInstance.init.mockRejectedValue(new Error('Init failed'));
      mockCacheInstance.get.mockResolvedValue(null);

      await expect(client.getSecrets()).rejects.toThrow('Init failed');
    });

    it('should handle getPhaseAppName errors with fallback', async () => {
      mockGetPhaseAppName.mockImplementation((fallback) => {
        if (fallback) return fallback;
        throw new Error('Phase app name not found');
      });
      
      // Client uses appNamespace as fallback
      client = new PhaseClient({
        appNamespace: 'fallback-app',
        token: 'test-token'
      });
      
      mockPhaseInstance.apps = [
        {
          id: 'app-123',
          name: 'fallback-app',
          environments: [{ id: 'env-123', name: 'production' }]
        }
      ];
      
      mockPhaseInstance.get.mockResolvedValue([
        { key: 'API_KEY', value: 'secret' }
      ]);
      
      mockCacheInstance.get.mockResolvedValue(null);

      const result = await client.getSecrets();
      expect(result).toEqual({ API_KEY: 'secret' });
    });
  });

  describe('debug mode', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log initialization in debug mode', () => {
      new PhaseClient({
        appNamespace: 'test-app',
        token: 'test-token',
        debug: true
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PhaseClient] Initialized with config:'),
        expect.objectContaining({
          token: '***'
        })
      );
    });

    it('should log SDK initialization', async () => {
      const client = new PhaseClient({
        appNamespace: 'test-app',
        token: 'test-token',
        debug: true
      });

      mockPhaseInstance.apps = [{ name: 'app1' }, { name: 'app2' }];
      mockPhaseInstance.get.mockResolvedValue([]);
      mockCacheInstance.get.mockResolvedValue(null);

      await client.getSecrets();

      expect(consoleSpy).toHaveBeenCalledWith('[PhaseClient] SDK initialized, 2 apps available');
    });

    it('should log cache hit', async () => {
      const client = new PhaseClient({
        appNamespace: 'test-app',
        token: 'test-token',
        debug: true
      });

      mockCacheInstance.get.mockResolvedValue({ KEY: 'cached' });

      await client.getSecrets();

      expect(consoleSpy).toHaveBeenCalledWith('[PhaseClient] Cache hit for production');
    });

    it('should log fetch from Phase.dev', async () => {
      const client = new PhaseClient({
        appNamespace: 'test-app',
        token: 'test-token',
        debug: true
      });

      mockPhaseInstance.apps = [{
        id: 'app-123',
        name: 'test-app',
        environments: [{ id: 'env-123', name: 'production' }]
      }];
      
      mockPhaseInstance.get.mockResolvedValue([{ key: 'KEY1', value: 'value1' }]);
      mockCacheInstance.get.mockResolvedValue(null);

      await client.getSecrets();

      expect(consoleSpy).toHaveBeenCalledWith('[PhaseClient] Fetching from Phase.dev...');
      expect(consoleSpy).toHaveBeenCalledWith('[PhaseClient] Fetched 1 secrets');
    });

    it('should log environment resolution', async () => {
      const client = new PhaseClient({
        appNamespace: 'test-app',
        token: 'test-token',
        debug: true
      });

      mockPhaseInstance.apps = [{
        id: 'app-123',
        name: 'test-app',
        environments: [{ id: 'env-123', name: 'production' }]
      }];
      
      mockPhaseInstance.get.mockResolvedValue([]);
      mockCacheInstance.get.mockResolvedValue(null);

      await client.getSecrets();

      expect(consoleSpy).toHaveBeenCalledWith('[PhaseClient] Resolved environment: production');
    });

    it('should log injection count', async () => {
      const client = new PhaseClient({
        appNamespace: 'test-app',
        token: 'test-token',
        debug: true
      });

      mockCacheInstance.get.mockResolvedValue({
        KEY1: 'value1',
        KEY2: 'value2'
      });

      await client.inject();

      expect(consoleSpy).toHaveBeenCalledWith('[PhaseClient] Injected 2 secrets into process.env');
    });
  });

  describe('error handling', () => {
    it('should handle errors and use stale cache', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      const client = new PhaseClient({
        appNamespace: 'test-app',
        token: 'test-token',
        debug: true
      });

      mockPhaseInstance.apps = [{
        id: 'app-123',
        name: 'test-app',
        environments: [{ id: 'env-123', name: 'production' }]
      }];
      
      mockPhaseInstance.get.mockRejectedValue(new Error('API error'));
      mockCacheInstance.get.mockResolvedValue(null);
      mockCacheInstance.getStale.mockResolvedValue({ KEY: 'stale-value' });

      const result = await client.getSecrets();

      expect(result).toEqual({ KEY: 'stale-value' });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Using stale cache due to error'));
      
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe('metrics logging', () => {
    it('should log metrics when PHASE_METRICS is enabled', async () => {
      const originalEnv = process.env.PHASE_METRICS;
      process.env.PHASE_METRICS = 'true';
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const client = new PhaseClient({
        appNamespace: 'test-app',
        token: 'test-token'
      });

      mockCacheInstance.get.mockResolvedValue({ KEY: 'cached' });

      await client.getSecrets();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"type":"phase_metrics"')
      );

      consoleSpy.mockRestore();
      process.env.PHASE_METRICS = originalEnv;
    });
  });

  describe('health monitoring', () => {
    it('should set up health monitoring for debug mode with cache', () => {
      jest.useFakeTimers();
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      
      new PhaseClient({
        appNamespace: 'test-app',
        token: 'test-token',
        debug: true,
        cache: { enabled: true }
      });

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000);
      
      setIntervalSpy.mockRestore();
      jest.useRealTimers();
    });
  });

  describe('getPhaseAppName fallback', () => {
    it('should use appNamespace when config reader throws', async () => {
      const { getPhaseAppName } = require('./config-reader');
      getPhaseAppName.mockImplementation(() => {
        throw new Error('Config not found');
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const client = new PhaseClient({
        appNamespace: 'fallback-app',
        token: 'test-token',
        debug: true
      });

      mockPhaseInstance.apps = [{
        id: 'app-123',
        name: 'fallback-app',
        environments: [{ id: 'env-123', name: 'production' }]
      }];
      
      mockPhaseInstance.get.mockResolvedValue([]);
      mockCacheInstance.get.mockResolvedValue(null);

      await client.getSecrets();

      expect(consoleSpy).toHaveBeenCalledWith('[PhaseClient] Using provided app name: fallback-app');
      
      consoleSpy.mockRestore();
    });
  });

  describe('configuration validation', () => {
    it('should handle missing token', () => {
      // Empty token should still create client, token validation happens during API calls
      const client = new PhaseClient({
        appNamespace: 'test-app',
        token: ''
      });
      
      expect(client).toBeDefined();
    });

    it('should use getProjectName as fallback when no appNamespace', async () => {
      const { getPhaseAppName } = require('./config-reader');
      getPhaseAppName.mockImplementation(() => 'config-app');

      const client = new PhaseClient({
        appNamespace: '',
        token: 'test-token'
      });

      mockPhaseInstance.apps = [{
        id: 'app-123',
        name: 'config-app',
        environments: [{ id: 'env-123', name: 'production' }]
      }];
      
      mockPhaseInstance.get.mockResolvedValue([]);
      mockCacheInstance.get.mockResolvedValue(null);

      await client.getSecrets();

      expect(getPhaseAppName).toHaveBeenCalled();
    });

    it('should handle environments not as array', async () => {
      const client = new PhaseClient({
        appNamespace: 'test-app',
        token: 'test-token'
      });

      mockPhaseInstance.apps = [{
        id: 'app-123',
        name: 'test-app',
        environments: null // Not an array
      }];
      
      await expect(client.getSecrets()).rejects.toThrow("Environment 'production' not found");
    });
  });

  describe('health monitoring interval', () => {
    it('should log health status periodically', () => {
      jest.useFakeTimers();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      mockCacheInstance.getStats.mockReturnValue({
        maxMemoryMB: 50,
        percentUsed: 80,
        healthStatus: 'warning'
      });

      new PhaseClient({
        appNamespace: 'test-app',
        token: 'test-token',
        debug: true,
        cache: { enabled: true }
      });

      // Advance timers to trigger health check
      jest.advanceTimersByTime(30000);

      expect(consoleSpy).toHaveBeenCalledWith('[PhaseClient] Cache health: warning - 80% memory used');
      
      consoleSpy.mockRestore();
      jest.useRealTimers();
    });
  });
});