import { loadVercelPhaseSecrets, VercelPhaseWebpackPlugin } from '../vercel-adapter';
import * as envWrapper from '../env-wrapper';
import * as fs from 'fs';

jest.mock('../env-wrapper');
jest.mock('fs');

const mockLoadPhaseSecrets = envWrapper.loadPhaseSecrets as jest.MockedFunction<typeof envWrapper.loadPhaseSecrets>;
const mockFs = fs as jest.Mocked<typeof fs>;

describe('vercel-adapter', () => {
  beforeEach(() => {
    delete process.env.PHASE_SERVICE_TOKEN;
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    delete process.env.NEXT_PUBLIC_VARS;
    jest.clearAllMocks();
  });

  describe('loadVercelPhaseSecrets', () => {
    test('skips when no Phase token is present', async () => {
      await loadVercelPhaseSecrets();
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No PHASE_SERVICE_TOKEN found')
      );
      expect(mockLoadPhaseSecrets).not.toHaveBeenCalled();
    });

    test('loads secrets in Vercel build environment', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'pss_service:v4:test';
      process.env.VERCEL = '1';
      process.env.VERCEL_ENV = 'production';
      
      mockLoadPhaseSecrets.mockResolvedValue(true);
      
      await loadVercelPhaseSecrets();
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Loading Phase.dev secrets for Vercel')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Vercel Environment: production')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Build Phase: Yes')
      );
      expect(mockLoadPhaseSecrets).toHaveBeenCalled();
    });

    test('detects app namespace from current directory', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'pss_service:v4:test';
      const originalCwd = process.cwd;
      process.cwd = jest.fn().mockReturnValue('/workspace/apps/trendgate');
      
      mockLoadPhaseSecrets.mockResolvedValue(true);
      
      await loadVercelPhaseSecrets();
      
      expect(mockLoadPhaseSecrets).toHaveBeenCalledWith({
        appNamespace: 'trendgate',
        cwd: '/workspace/apps/trendgate'
      });
      
      process.cwd = originalCwd;
    });

    test('creates .env.production for NEXT_PUBLIC vars during build', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'pss_service:v4:test';
      process.env.VERCEL = '1';
      process.env.NEXT_PUBLIC_VARS = 'NEXT_PUBLIC_APP_URL,NEXT_PUBLIC_API_URL';
      process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
      process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
      
      mockLoadPhaseSecrets.mockResolvedValue(true);
      
      await loadVercelPhaseSecrets();
      
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '.env.production',
        'NEXT_PUBLIC_APP_URL=https://app.example.com\nNEXT_PUBLIC_API_URL=https://api.example.com'
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Created .env.production')
      );
    });

    test('handles Phase loading errors gracefully', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'pss_service:v4:test';
      
      mockLoadPhaseSecrets.mockRejectedValue(new Error('Network error'));
      
      await loadVercelPhaseSecrets();
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load Phase secrets in Vercel'),
        expect.any(Error)
      );
    });

    test('continues without error when Phase loading fails', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'pss_service:v4:test';
      mockLoadPhaseSecrets.mockResolvedValue(false);
      
      await expect(loadVercelPhaseSecrets()).resolves.not.toThrow();
    });

    test('detects different app namespaces correctly', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'pss_service:v4:test';
      mockLoadPhaseSecrets.mockResolvedValue(true);
      
      const testCases = [
        { cwd: '/workspace/apps/api-portal', expected: 'api-portal' },
        { cwd: '/workspace/apps/docs', expected: 'docs' },
        { cwd: '/workspace/packages/ui', expected: undefined }
      ];
      
      const originalCwd = process.cwd;
      
      for (const testCase of testCases) {
        process.cwd = jest.fn().mockReturnValue(testCase.cwd);
        await loadVercelPhaseSecrets();
        
        expect(mockLoadPhaseSecrets).toHaveBeenLastCalledWith({
          appNamespace: testCase.expected,
          cwd: testCase.cwd
        });
      }
      
      process.cwd = originalCwd;
    });
  });

  describe('VercelPhaseWebpackPlugin', () => {
    test('applies plugin and loads secrets on beforeRun hook', async () => {
      const mockCompiler = {
        hooks: {
          beforeRun: {
            tapPromise: jest.fn()
          }
        }
      };
      
      process.env.PHASE_SERVICE_TOKEN = 'pss_service:v4:test';
      process.env.VERCEL = '1';
      mockLoadPhaseSecrets.mockResolvedValue(true);
      
      const plugin = new VercelPhaseWebpackPlugin();
      plugin.apply(mockCompiler);
      
      expect(mockCompiler.hooks.beforeRun.tapPromise).toHaveBeenCalledWith(
        'VercelPhasePlugin',
        expect.any(Function)
      );
      
      // Get the hook function and execute it
      const hookFn = mockCompiler.hooks.beforeRun.tapPromise.mock.calls[0][1];
      await hookFn();
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Loading Phase.dev secrets for Vercel')
      );
    });
  });

  describe('Auto-run functionality', () => {
    test('runs loadVercelPhaseSecrets when module is main', async () => {
      // Mock require.main to simulate direct execution
      const originalMain = require.main;
      require.main = { filename: __filename } as any;
      
      process.env.PHASE_SERVICE_TOKEN = 'pss_service:v4:test';
      mockLoadPhaseSecrets.mockResolvedValue(true);
      
      // Re-import to trigger the auto-run check
      jest.isolateModules(() => {
        require('../vercel-adapter');
      });
      
      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Loading Phase.dev secrets for Vercel')
      );
      
      require.main = originalMain;
    });
  });
});
