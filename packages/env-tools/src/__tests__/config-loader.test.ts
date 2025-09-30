import * as fs from 'fs';
import * as path from 'path';
import { loadAppConfig } from '../config-loader';

jest.mock('fs');
jest.mock('path');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

describe('config-loader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPath.join.mockImplementation((...args) => args.join('/'));
    mockPath.resolve.mockImplementation((...args) => args.join('/'));
    mockPath.parse.mockImplementation((p) => ({
      root: '/',
      dir: p.substring(0, p.lastIndexOf('/')),
      base: p.substring(p.lastIndexOf('/') + 1),
      ext: '',
      name: ''
    }));
    mockPath.dirname.mockImplementation((p) => p.substring(0, p.lastIndexOf('/')));
  });

  describe('loadAppConfig', () => {
    test('returns null when no config file exists', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      const config = loadAppConfig('/test/dir');
      
      expect(config).toBeNull();
    });

    test('loads and parses valid config file', () => {
      const testConfig = {
        appName: 'test-app',
        displayName: 'Test Application',
        envVars: {
          required: ['DATABASE_URL'],
          optional: ['REDIS_URL']
        }
      };
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(testConfig));
      
      const config = loadAppConfig('/test/dir');
      
      expect(config).toEqual(testConfig);
      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        '/test/dir/env.config.json',
        'utf-8'
      );
    });

    test('uses current working directory when no dir provided', () => {
      const originalCwd = process.cwd;
      process.cwd = jest.fn().mockReturnValue('/current/dir');
      
      mockFs.existsSync.mockReturnValue(false);
      
      loadAppConfig();
      
      expect(mockPath.join).toHaveBeenCalledWith('/current/dir', 'env.config.json');
      
      process.cwd = originalCwd;
    });

    test('handles JSON parsing errors gracefully', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json');
      
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      const config = loadAppConfig('/test/dir');
      
      expect(config).toBeNull();
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse env.config.json'),
        expect.any(Error)
      );
      
      consoleError.mockRestore();
    });

    test('handles file read errors gracefully', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      const config = loadAppConfig('/test/dir');
      
      expect(config).toBeNull();
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load env.config.json'),
        expect.any(Error)
      );
      
      consoleError.mockRestore();
    });

    test('loads config with all possible fields', () => {
      const fullConfig = {
        appName: 'full-app',
        displayName: 'Full Application',
        envVars: {
          required: ['DATABASE_URL', 'API_KEY'],
          optional: ['REDIS_URL', 'SENTRY_DSN']
        },
        defaults: {
          envFile: '.env.custom',
          fallbackFiles: ['.env.local', '.env']
        },
        validation: {
          strict: true,
          allowExtra: false
        }
      };
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(fullConfig));
      
      const config = loadAppConfig('/test/dir');
      
      expect(config).toEqual(fullConfig);
    });

    test('handles empty config file', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{}');
      
      const config = loadAppConfig('/test/dir');
      
      expect(config).toEqual({});
    });

    test('preserves config structure exactly as loaded', () => {
      const complexConfig = {
        appName: 'complex-app',
        nested: {
          deeply: {
            nested: {
              value: true
            }
          }
        },
        arrays: [1, 2, 3],
        mixed: {
          array: ['a', 'b'],
          object: { key: 'value' }
        }
      };
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(complexConfig));
      
      const config = loadAppConfig('/test/dir');
      
      expect(config).toEqual(complexConfig);
    });
  });
});
