import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  CentralizedConfigManager,
  ValidationRule,
  getConfigManager,
  resetConfigManager
} from '../manager';

// Mock the @c9d/config module
vi.mock('@c9d/config', () => ({
  EnvironmentFallbackManager: vi.fn().mockImplementation(() => ({
    loadEnvironment: vi.fn()
  })),
  PhaseSDKError: vi.fn(),
  PhaseSDKErrorCode: {
    TOKEN_NOT_FOUND: 'TOKEN_NOT_FOUND',
    AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
    NETWORK_ERROR: 'NETWORK_ERROR'
  }
}));

import { EnvironmentFallbackManager } from '@c9d/config';

const mockEnvironmentFallbackManager = vi.mocked(EnvironmentFallbackManager);

describe('Updated Configuration Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetConfigManager();
    
    // Clear environment variables
    delete process.env.DATABASE_URL;
    delete process.env.PHASE_SERVICE_TOKEN;
    delete process.env.TEST_VAR;
  });

  describe('initialization', () => {
    it('should initialize successfully with Phase.dev integration', async () => {
      const mockEnvVars = {
        DATABASE_URL: 'postgresql://test',
        API_KEY: 'secret-key'
      };

      const mockFallbackManager = {
        loadEnvironment: vi.fn().mockResolvedValue({
          success: true,
          variables: mockEnvVars,
          source: 'phase-sdk',
          tokenSource: { source: 'process.env', token: 'test-token' }
        })
      };

      mockEnvironmentFallbackManager.mockImplementation(() => mockFallbackManager);

      const manager = new CentralizedConfigManager();
      await manager.initialize();

      expect(manager.isInitialized()).toBe(true);
      expect(manager.get('DATABASE_URL')).toBe('postgresql://test');
      expect(manager.get('API_KEY')).toBe('secret-key');
      expect(mockFallbackManager.loadEnvironment).toHaveBeenCalledWith(
        'AI.C9d.Web',
        'development',
        expect.objectContaining({
          fallbackToLocal: true,
          forceReload: true
        })
      );
    });

    it('should fallback to local environment when Phase.dev fails', async () => {
      process.env.LOCAL_VAR = 'local-value';
      
      const mockFallbackManager = {
        loadEnvironment: vi.fn().mockResolvedValue({
          success: false,
          variables: { LOCAL_VAR: 'local-value' },
          source: 'local',
          error: 'Phase.dev connection failed'
        })
      };

      mockEnvironmentFallbackManager.mockImplementation(() => mockFallbackManager);

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
        }
      ];

      const mockFallbackManager = {
        loadEnvironment: vi.fn().mockResolvedValue({
          success: true,
          variables: {},
          source: 'local'
        })
      };

      mockEnvironmentFallbackManager.mockImplementation(() => mockFallbackManager);

      const manager = new CentralizedConfigManager({
        validationRules,
        fallbackToEnv: false
      });

      await expect(manager.initialize()).rejects.toThrow('Required configuration variable \'REQUIRED_VAR\' is missing');
    });
  });

  describe('configuration access', () => {
    it('should get configuration values', async () => {
      const mockFallbackManager = {
        loadEnvironment: vi.fn().mockResolvedValue({
          success: true,
          variables: { TEST_VAR: 'test-value' },
          source: 'phase-sdk'
        })
      };

      mockEnvironmentFallbackManager.mockImplementation(() => mockFallbackManager);

      const manager = new CentralizedConfigManager();
      await manager.initialize();

      expect(manager.get('TEST_VAR')).toBe('test-value');
      expect(manager.get('NONEXISTENT')).toBeUndefined();
    });

    it('should get all configuration values', async () => {
      const mockVars = { VAR1: 'value1', VAR2: 'value2' };
      
      const mockFallbackManager = {
        loadEnvironment: vi.fn().mockResolvedValue({
          success: true,
          variables: mockVars,
          source: 'phase-sdk'
        })
      };

      mockEnvironmentFallbackManager.mockImplementation(() => mockFallbackManager);

      const manager = new CentralizedConfigManager();
      await manager.initialize();

      const allConfig = manager.getAll();
      expect(allConfig).toEqual(mockVars);
    });
  });

  describe('refresh functionality', () => {
    it('should refresh configuration from Phase.dev', async () => {
      const initialVars = { VAR1: 'initial' };
      const refreshedVars = { VAR1: 'refreshed' };
      
      const mockFallbackManager = {
        loadEnvironment: vi.fn()
          .mockResolvedValueOnce({
            success: true,
            variables: initialVars,
            source: 'phase-sdk'
          })
          .mockResolvedValueOnce({
            success: true,
            variables: refreshedVars,
            source: 'phase-sdk'
          })
      };

      mockEnvironmentFallbackManager.mockImplementation(() => mockFallbackManager);

      const manager = new CentralizedConfigManager();
      await manager.initialize();

      expect(manager.get('VAR1')).toBe('initial');

      await manager.refresh();

      expect(manager.get('VAR1')).toBe('refreshed');
      expect(mockFallbackManager.loadEnvironment).toHaveBeenCalledTimes(2);
    });

    it('should handle refresh failures gracefully', async () => {
      const initialVars = { VAR1: 'initial' };
      
      const mockFallbackManager = {
        loadEnvironment: vi.fn()
          .mockResolvedValueOnce({
            success: true,
            variables: initialVars,
            source: 'phase-sdk'
          })
          .mockResolvedValueOnce({
            success: false,
            variables: {},
            source: 'local',
            error: 'Network error'
          })
      };

      mockEnvironmentFallbackManager.mockImplementation(() => mockFallbackManager);

      const manager = new CentralizedConfigManager();
      await manager.initialize();

      expect(manager.get('VAR1')).toBe('initial');

      // Refresh should not throw with fallback enabled
      await manager.refresh();

      // Should still have original value
      expect(manager.get('VAR1')).toBe('initial');
    });
  });

  describe('health and statistics', () => {
    it('should provide configuration statistics', async () => {
      const mockVars = { VAR1: 'value1', VAR2: 'value2' };
      
      const mockFallbackManager = {
        loadEnvironment: vi.fn().mockResolvedValue({
          success: true,
          variables: mockVars,
          source: 'phase-sdk'
        })
      };

      mockEnvironmentFallbackManager.mockImplementation(() => mockFallbackManager);

      const manager = new CentralizedConfigManager();
      await manager.initialize();

      const stats = manager.getStats();

      expect(stats.initialized).toBe(true);
      expect(stats.configCount).toBe(2);
      expect(stats.phaseConfigured).toBe(true);
      expect(stats.healthy).toBe(true);
      expect(stats.lastError).toBeNull();
    });

    it('should provide health status', async () => {
      const mockFallbackManager = {
        loadEnvironment: vi.fn().mockResolvedValue({
          success: true,
          variables: {},
          source: 'phase-sdk'
        })
      };

      mockEnvironmentFallbackManager.mockImplementation(() => mockFallbackManager);

      const manager = new CentralizedConfigManager();
      await manager.initialize();

      const health = manager.getHealthStatus();

      expect(health.healthy).toBe(true);
      expect(health.initialized).toBe(true);
      expect(health.lastError).toBeNull();
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const manager1 = getConfigManager();
      const manager2 = getConfigManager();

      expect(manager1).toBe(manager2);
    });

    it('should reset singleton correctly', () => {
      const manager1 = getConfigManager();
      resetConfigManager();
      const manager2 = getConfigManager();

      expect(manager1).not.toBe(manager2);
    });
  });
});