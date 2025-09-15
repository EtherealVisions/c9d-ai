import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  initializeAppConfig, 
  getAppConfig, 
  getAppConfigSync, 
  isConfigInitialized, 
  resetConfigInitialization 
} from '../init';
import type { CentralizedConfigManager } from '../manager';

// Mock the manager module
vi.mock('../manager', () => ({
  initializeGlobalConfig: vi.fn(),
  getConfig: vi.fn(),
  resetConfigManager: vi.fn()
}));

import { initializeGlobalConfig, getConfig } from '../manager';

const mockInitializeGlobalConfig = vi.mocked(initializeGlobalConfig);
const mockGetConfig = vi.mocked(getConfig);

describe('Configuration Initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetConfigInitialization();
    
    // Clear environment variables
    delete process.env.TEST_VAR;
    delete process.env.FALLBACK_VAR;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initializeAppConfig', () => {
    it('should initialize configuration successfully', async () => {
      mockInitializeGlobalConfig.mockResolvedValue({} as any);

      await initializeAppConfig();

      expect(mockInitializeGlobalConfig).toHaveBeenCalledTimes(1);
      expect(isConfigInitialized()).toBe(true);
    });

    it('should not initialize twice', async () => {
      mockInitializeGlobalConfig.mockResolvedValue({} as any);

      await initializeAppConfig();
      await initializeAppConfig();

      expect(mockInitializeGlobalConfig).toHaveBeenCalledTimes(1);
      expect(isConfigInitialized()).toBe(true);
    });

    it('should handle initialization errors gracefully', async () => {
      mockInitializeGlobalConfig.mockRejectedValue(new Error('Phase.dev error'));

      // Should not throw
      await expect(initializeAppConfig()).resolves.toBeUndefined();
      
      expect(isConfigInitialized()).toBe(true); // Should still be marked as initialized
    });

    it('should allow retry after failed initialization', async () => {
      mockInitializeGlobalConfig
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce({} as any);

      // First call fails
      await initializeAppConfig();
      expect(isConfigInitialized()).toBe(true);

      // Reset and try again
      resetConfigInitialization();
      
      // Second call succeeds
      await initializeAppConfig();
      expect(mockInitializeGlobalConfig).toHaveBeenCalledTimes(2);
      expect(isConfigInitialized()).toBe(true);
    });

    it('should handle concurrent initialization calls', async () => {
      let resolveInit: () => void;
      const initPromise = new Promise<CentralizedConfigManager>((resolve) => {
        resolveInit = () => resolve(mockConfigManager);
      });

      mockInitializeGlobalConfig.mockImplementation(() => initPromise);

      // Start multiple concurrent initializations
      const promises = [
        initializeAppConfig(),
        initializeAppConfig(),
        initializeAppConfig()
      ];

      // Resolve the initialization
      resolveInit!();
      await Promise.all(promises);

      // Should only call the actual initialization once
      expect(mockInitializeGlobalConfig).toHaveBeenCalledTimes(1);
      expect(isConfigInitialized()).toBe(true);
    });
  });

  describe('getAppConfig', () => {
    it('should initialize and return config value', async () => {
      mockInitializeGlobalConfig.mockResolvedValue({} as any);
      mockGetConfig.mockReturnValue('test-value');

      const result = await getAppConfig('TEST_VAR');

      expect(mockInitializeGlobalConfig).toHaveBeenCalledTimes(1);
      expect(mockGetConfig).toHaveBeenCalledWith('TEST_VAR');
      expect(result).toBe('test-value');
    });

    it('should use existing initialization', async () => {
      mockInitializeGlobalConfig.mockResolvedValue({} as any);
      mockGetConfig.mockReturnValue('test-value');

      // Initialize first
      await initializeAppConfig();
      
      // Then get config
      const result = await getAppConfig('TEST_VAR');

      expect(mockInitializeGlobalConfig).toHaveBeenCalledTimes(1); // Only called once
      expect(result).toBe('test-value');
    });
  });

  describe('getAppConfigSync', () => {
    it('should return config value when initialized', async () => {
      mockInitializeGlobalConfig.mockResolvedValue({} as any);
      mockGetConfig.mockReturnValue('test-value');

      await initializeAppConfig();
      const result = getAppConfigSync('TEST_VAR');

      expect(result).toBe('test-value');
    });

    it('should fallback to process.env when not initialized', () => {
      process.env.FALLBACK_VAR = 'fallback-value';

      const result = getAppConfigSync('FALLBACK_VAR');

      expect(result).toBe('fallback-value');
    });

    it('should fallback to process.env when config manager throws', async () => {
      process.env.ERROR_VAR = 'env-value';
      
      mockInitializeGlobalConfig.mockResolvedValue({} as any);
      mockGetConfig.mockImplementation(() => {
        throw new Error('Config manager error');
      });

      await initializeAppConfig();
      const result = getAppConfigSync('ERROR_VAR');

      expect(result).toBe('env-value');
    });

    it('should warn when accessing config before initialization', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      process.env.WARN_VAR = 'warn-value';

      const result = getAppConfigSync('WARN_VAR');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Attempting to get config 'WARN_VAR' before initialization")
      );
      expect(result).toBe('warn-value');

      consoleSpy.mockRestore();
    });
  });

  describe('isConfigInitialized', () => {
    it('should return false initially', () => {
      expect(isConfigInitialized()).toBe(false);
    });

    it('should return true after initialization', async () => {
      mockInitializeGlobalConfig.mockResolvedValue({} as any);

      await initializeAppConfig();

      expect(isConfigInitialized()).toBe(true);
    });

    it('should return false after reset', async () => {
      mockInitializeGlobalConfig.mockResolvedValue({} as any);

      await initializeAppConfig();
      expect(isConfigInitialized()).toBe(true);

      resetConfigInitialization();
      expect(isConfigInitialized()).toBe(false);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle Phase.dev timeout gracefully', async () => {
      const timeoutError = new Error('Request timeout');
      mockInitializeGlobalConfig.mockRejectedValue(timeoutError);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await initializeAppConfig();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize application configuration'),
        timeoutError
      );
      expect(isConfigInitialized()).toBe(true); // Should still be marked as initialized

      consoleSpy.mockRestore();
    });

    it('should handle network errors during initialization', async () => {
      const networkError = new Error('ENOTFOUND console.phase.dev');
      mockInitializeGlobalConfig.mockRejectedValue(networkError);

      await initializeAppConfig();

      expect(isConfigInitialized()).toBe(true);
    });

    it('should handle authentication errors during initialization', async () => {
      const authError = new Error('Authentication failed: Invalid token');
      mockInitializeGlobalConfig.mockRejectedValue(authError);

      await initializeAppConfig();

      expect(isConfigInitialized()).toBe(true);
    });

    it('should allow multiple retry attempts after failures', async () => {
      // First attempt fails
      mockInitializeGlobalConfig.mockRejectedValueOnce(new Error('First failure'));
      await initializeAppConfig();
      expect(isConfigInitialized()).toBe(true);

      // Reset and second attempt fails
      resetConfigInitialization();
      mockInitializeGlobalConfig.mockRejectedValueOnce(new Error('Second failure'));
      await initializeAppConfig();
      expect(isConfigInitialized()).toBe(true);

      // Reset and third attempt succeeds
      resetConfigInitialization();
      mockInitializeGlobalConfig.mockResolvedValueOnce({} as any);
      await initializeAppConfig();
      expect(isConfigInitialized()).toBe(true);

      expect(mockInitializeGlobalConfig).toHaveBeenCalledTimes(3);
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle rapid successive calls efficiently', async () => {
      mockInitializeGlobalConfig.mockResolvedValue({} as any);

      const promises = Array.from({ length: 10 }, () => initializeAppConfig());
      await Promise.all(promises);

      expect(mockInitializeGlobalConfig).toHaveBeenCalledTimes(1);
      expect(isConfigInitialized()).toBe(true);
    });

    it('should handle mixed getAppConfig and initializeAppConfig calls', async () => {
      mockInitializeGlobalConfig.mockResolvedValue({} as any);
      mockGetConfig.mockReturnValue('test-value');

      const promises = [
        initializeAppConfig(),
        getAppConfig('TEST_VAR'),
        initializeAppConfig(),
        getAppConfig('TEST_VAR2')
      ];

      const results = await Promise.all(promises);

      expect(mockInitializeGlobalConfig).toHaveBeenCalledTimes(1);
      expect(results[1]).toBe('test-value');
      expect(results[3]).toBe('test-value');
    });

    it('should handle initialization timeout scenarios', async () => {
      let resolveInit: () => void;
      const longRunningInit = new Promise<any>((resolve) => {
        resolveInit = () => resolve({} as any);
      });

      mockInitializeGlobalConfig.mockImplementation(() => longRunningInit);

      // Start initialization
      const initPromise = initializeAppConfig();

      // Try to get config while initialization is pending
      const configPromise = getAppConfig('PENDING_VAR');

      // Resolve initialization after a delay
      setTimeout(() => resolveInit!(), 100);

      await Promise.all([initPromise, configPromise]);

      expect(mockInitializeGlobalConfig).toHaveBeenCalledTimes(1);
      expect(isConfigInitialized()).toBe(true);
    });
  });

  describe('Environment Variable Fallback Behavior', () => {
    it('should provide environment fallback for sync access', () => {
      process.env.SYNC_FALLBACK_VAR = 'sync-fallback-value';

      const result = getAppConfigSync('SYNC_FALLBACK_VAR');

      expect(result).toBe('sync-fallback-value');
    });

    it('should prefer config manager over environment when initialized', async () => {
      process.env.PREFERENCE_VAR = 'env-value';
      
      mockInitializeGlobalConfig.mockResolvedValue({} as any);
      mockGetConfig.mockReturnValue('config-value');

      await initializeAppConfig();
      const result = getAppConfigSync('PREFERENCE_VAR');

      expect(result).toBe('config-value');
    });

    it('should handle undefined environment variables gracefully', () => {
      const result = getAppConfigSync('UNDEFINED_VAR');
      expect(result).toBeUndefined();
    });
  });
});