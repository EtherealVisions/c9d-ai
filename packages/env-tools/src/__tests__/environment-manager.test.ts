import { EnvironmentManager } from '../environment-manager';
import * as envWrapper from '../env-wrapper';
import * as configLoader from '../config-loader';
import * as validator from '../validator';

// Mock dependencies
jest.mock('../env-wrapper');
jest.mock('../config-loader');
jest.mock('../validator');
jest.mock('fs');
jest.mock('path');

const mockEnvWrapper = envWrapper as jest.Mocked<typeof envWrapper>;
const mockConfigLoader = configLoader as jest.Mocked<typeof configLoader>;
const mockValidator = validator as jest.Mocked<typeof validator>;

describe('environment-manager service', () => {
  let manager: EnvironmentManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockEnvWrapper.isContainerEnvironment.mockReturnValue(false);
    mockConfigLoader.loadAppConfig.mockReturnValue(null);
    mockValidator.validateEnvironment.mockResolvedValue({
      valid: true,
      errors: [],
      warnings: [],
    });
    mockValidator.printValidationSummary.mockImplementation(() => {});
    
    manager = new EnvironmentManager();
  });

  describe('loadEnvironment', () => {
    it('should load environment successfully with Phase.dev', async () => {
      const mockAppConfig = {
        appName: 'test-app',
        displayName: 'Test App',
        envVars: {
          required: [
            { name: 'DATABASE_URL', required: true, description: 'Database connection string' }
          ],
          optional: [
            { name: 'API_KEY', required: false, description: 'API key for external service' }
          ],
        },
      };

      mockConfigLoader.loadAppConfig.mockReturnValue(mockAppConfig);
      mockEnvWrapper.loadPhaseSecrets.mockResolvedValue(true);

      const result = await manager.loadEnvironment('/test/path');

      expect(result.success).toBe(true);
      expect(result.sources).toContain('app-config');
      expect(result.sources).toContain('phase.dev');
      expect(result.phaseEnabled).toBe(true);
      expect(result.appConfig).toEqual(mockAppConfig);
    });

    it('should handle Phase.dev failure gracefully', async () => {
      const mockAppConfig = {
        appName: 'test-app',
        displayName: 'Test App',
        envVars: {
          required: [
            { name: 'DATABASE_URL', required: true, description: 'Database connection string' }
          ],
          optional: [
            { name: 'API_KEY', required: false, description: 'API key for external service' }
          ],
        },
      };

      mockConfigLoader.loadAppConfig.mockReturnValue(mockAppConfig);
      mockEnvWrapper.loadPhaseSecrets.mockRejectedValue(new Error('Phase connection failed'));

      const result = await manager.loadEnvironment('/test/path');

      expect(result.success).toBe(true);
      expect(result.phaseEnabled).toBe(false);
      expect(result.sources).toContain('app-config');
    });

    it('should handle configuration loading errors gracefully', async () => {
      mockConfigLoader.loadAppConfig.mockImplementation(() => {
        throw new Error('Config loading failed');
      });
      mockEnvWrapper.loadPhaseSecrets.mockResolvedValue(false);

      // The manager should handle config errors gracefully and continue
      const nonStrictManager = new EnvironmentManager({ strict: false });
      const result = await nonStrictManager.loadEnvironment('/test/path');

      // Should succeed but with no app config
      expect(result.success).toBe(true);
      expect(result.appConfig).toBeNull();
    });

    it('should work without app configuration', async () => {
      mockConfigLoader.loadAppConfig.mockReturnValue(null);
      mockEnvWrapper.loadPhaseSecrets.mockResolvedValue(false);

      // Create a non-strict manager to avoid errors when no env files are found
      const nonStrictManager = new EnvironmentManager({ strict: false });
      const result = await nonStrictManager.loadEnvironment('/test/path');

      expect(result.success).toBe(true);
      expect(result.appConfig).toBeNull();
    });

  });

  describe('getStatus', () => {
    it('should return current environment status', () => {
      const status = manager.getStatus();

      expect(status).toEqual({
        loaded: false,
        sources: [],
        validated: false,
        valid: false,
        phaseEnabled: false,
        containerEnvironment: false,
      });
    });
  });

  describe('reset', () => {
    it('should reset environment state', () => {
      manager.reset();
      const status = manager.getStatus();

      expect(status.loaded).toBe(false);
      expect(status.sources).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle container environment', () => {
      mockEnvWrapper.isContainerEnvironment.mockReturnValue(true);
      
      const manager = new EnvironmentManager();
      const status = manager.getStatus();
      
      expect(status.containerEnvironment).toBe(true);
    });

    it('should handle validation errors in strict mode', async () => {
      const mockAppConfig = {
        appName: 'test-app',
        displayName: 'Test App',
        envVars: {
          required: [
            { name: 'DATABASE_URL', required: true, description: 'Database connection string' }
          ],
          optional: [
            { name: 'API_KEY', required: false, description: 'API key for external service' }
          ],
        },
      };

      mockConfigLoader.loadAppConfig.mockReturnValue(mockAppConfig);
      mockEnvWrapper.loadPhaseSecrets.mockResolvedValue(false);
      mockValidator.validateEnvironment.mockResolvedValue({
        valid: false,
        errors: ['Missing DATABASE_URL'],
        warnings: [],
      });

      const strictManager = new EnvironmentManager({ strict: true });
      const result = await strictManager.loadEnvironment('/test/path');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Environment validation failed: Missing DATABASE_URL');
    });

    it('should handle validation errors in non-strict mode', async () => {
      const mockAppConfig = {
        appName: 'test-app',
        displayName: 'Test App',
        envVars: {
          required: [
            { name: 'DATABASE_URL', required: true, description: 'Database connection string' }
          ],
          optional: [
            { name: 'API_KEY', required: false, description: 'API key for external service' }
          ],
        },
      };

      mockConfigLoader.loadAppConfig.mockReturnValue(mockAppConfig);
      mockEnvWrapper.loadPhaseSecrets.mockResolvedValue(false);
      mockValidator.validateEnvironment.mockResolvedValue({
        valid: false,
        errors: ['Missing DATABASE_URL'],
        warnings: [],
      });

      const nonStrictManager = new EnvironmentManager({ strict: false });
      const result = await nonStrictManager.loadEnvironment('/test/path');

      expect(result.success).toBe(true);
      expect(result.validation?.valid).toBe(false);
    });
  });
});