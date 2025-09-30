import { readPhaseConfig, getPhaseAppName, getPhaseEnvironment } from './config-reader';
import * as fs from 'fs';
import * as path from 'path';

// Mock the fs and path modules
jest.mock('fs');
jest.mock('path');

describe('config-reader', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockPath = path as jest.Mocked<typeof path>;
  const originalCwd = process.cwd;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    
    // Mock process.cwd
    process.cwd = jest.fn().mockReturnValue('/project/apps/test-app');
    
    // Default path mocks
    mockPath.resolve.mockImplementation((...args) => args.join('/'));
    mockPath.dirname.mockImplementation((p) => {
      const parts = p.split('/');
      parts.pop();
      return parts.join('/') || '/';
    });
    mockPath.basename.mockImplementation((p) => {
      const parts = p.split('/');
      return parts[parts.length - 1];
    });
  });

  afterEach(() => {
    process.cwd = originalCwd;
    process.env = originalEnv;
  });

  describe('readPhaseConfig', () => {
    it('should return null when no config files exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      const result = readPhaseConfig();
      
      expect(result).toBeNull();
    });

    it('should read config from package.json phase field', () => {
      mockFs.existsSync.mockImplementation((path) => {
        return path.toString().includes('package.json');
      });
      
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        name: 'test-app',
        phase: {
          app: 'my-phase-app',
          environments: { dev: 'development' }
        }
      }));
      
      const result = readPhaseConfig('/project');
      
      expect(result).toEqual({
        phaseApp: 'my-phase-app',
        environments: { dev: 'development' }
      });
    });

    it('should handle invalid JSON in config files', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json');
      
      const result = readPhaseConfig();
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle file read errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      const result = readPhaseConfig();
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getPhaseAppName', () => {
    it('should return phaseApp from config', () => {
      mockFs.existsSync.mockImplementation((path) => {
        return path.toString().includes('package.json');
      });
      
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        phase: { app: 'my-app' }
      }));
      
      const result = getPhaseAppName();
      
      expect(result).toBe('my-app');
    });

    it('should use fallback when no config found', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      const result = getPhaseAppName('fallback-app');
      
      expect(result).toBe('fallback-app');
    });

    it('should throw error when no config and no fallback', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      expect(() => getPhaseAppName()).toThrow('No Phase app configuration found');
    });

    it('should use fallback when config has no app name', () => {
      mockFs.existsSync.mockImplementation((path) => {
        return path.toString().includes('package.json');
      });
      
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        phase: { environments: {} }
      }));
      
      const result = getPhaseAppName('fallback');
      
      expect(result).toBe('fallback');
    });
  });

  describe('getPhaseEnvironment', () => {
    it('should return default development when no NODE_ENV', () => {
      delete process.env.NODE_ENV;
      mockFs.existsSync.mockReturnValue(false);
      
      const result = getPhaseEnvironment();
      
      expect(result).toBe('development');
    });

    it('should return NODE_ENV value', () => {
      process.env.NODE_ENV = 'production';
      mockFs.existsSync.mockReturnValue(false);
      
      const result = getPhaseEnvironment();
      
      expect(result).toBe('production');
    });

    it('should use nodeEnv parameter over NODE_ENV', () => {
      process.env.NODE_ENV = 'production';
      mockFs.existsSync.mockReturnValue(false);
      
      const result = getPhaseEnvironment('staging');
      
      expect(result).toBe('staging');
    });

    it('should use environment mapping from config', () => {
      process.env.NODE_ENV = 'production';
      
      mockFs.existsSync.mockImplementation((path) => {
        return path.toString().includes('package.json');
      });
      
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        phase: { 
          app: 'test-app',
          environments: { production: 'prod', development: 'dev' }
        }
      }));
      
      const result = getPhaseEnvironment();
      
      expect(result).toBe('prod');
    });

    it('should return unmapped environment as-is', () => {
      mockFs.existsSync.mockImplementation((path) => {
        return path.toString().includes('package.json');
      });
      
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        phase: { 
          app: 'test-app',
          environments: { production: 'prod' }
        }
      }));
      
      const result = getPhaseEnvironment('staging');
      
      expect(result).toBe('staging');
    });
  });

  describe('edge cases', () => {
    it('should handle root directory properly', () => {
      mockPath.dirname.mockImplementation((p) => {
        if (p === '/') return '/';
        const parts = p.split('/');
        parts.pop();
        return parts.length > 0 ? parts.join('/') || '/' : '/';
      });
      
      process.cwd = jest.fn().mockReturnValue('/');
      mockFs.existsSync.mockReturnValue(false);
      
      const result = readPhaseConfig();
      
      expect(result).toBeNull();
    });

    it('should read package.json phase config when no .phase.json', () => {
      // Test reading from package.json phase field
      process.cwd = jest.fn().mockReturnValue('/project');
      
      mockFs.existsSync.mockImplementation((path) => {
        // Only package.json exists
        return path.toString().includes('package.json');
      });
      
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        name: 'test-project',
        phase: { app: 'simple-app' }
      }));
      
      const result = readPhaseConfig();
      
      expect(result).toEqual({ phaseApp: 'simple-app' });
    });

    it('should handle scoped package names', () => {
      mockFs.existsSync.mockImplementation((path) => {
        return path.toString().includes('package.json');
      });
      
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        name: '@myorg/my-package',
        phase: { app: 'scoped-app' }
      }));
      
      const result = readPhaseConfig();
      
      expect(result).toEqual({ phaseApp: 'scoped-app' });
    });

    it('should read package.json phase config with environments', () => {
      mockFs.existsSync.mockImplementation((path) => {
        return path.toString().includes('package.json');
      });
      
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        name: 'lib-package',
        phase: { 
          app: 'lib-app',
          environments: { dev: 'development', prod: 'production' }
        }
      }));
      
      const result = readPhaseConfig();
      
      expect(result).toEqual({ 
        phaseApp: 'lib-app',
        environments: { dev: 'development', prod: 'production' }
      });
    });

    it('should extract short name from scoped packages', () => {
      mockFs.existsSync.mockImplementation((path) => {
        return path.toString().includes('package.json');
      });
      
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        name: '@myorg/awesome-lib',
        phase: { app: 'awesome-app' }
      }));
      
      const result = readPhaseConfig();
      
      expect(result).toEqual({ phaseApp: 'awesome-app' });
    });

    it('should handle missing name in package.json', () => {
      mockFs.existsSync.mockImplementation((path) => {
        return path.toString().includes('package.json');
      });
      
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        version: '1.0.0',
        phase: { app: 'nameless-app' }
      }));
      
      const result = readPhaseConfig();
      
      expect(result).toEqual({ phaseApp: 'nameless-app' });
    });
  });
});