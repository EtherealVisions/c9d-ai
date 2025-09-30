import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { loadPhaseSecrets, isContainerEnvironment, runEnvWrapper } from '../env-wrapper';

// Mock dependencies
jest.mock('child_process');
jest.mock('fs');
jest.mock('path');
jest.mock('@coordinated/phase-client', () => ({
  PhaseClient: jest.fn().mockImplementation(() => ({
    getSecrets: jest.fn().mockResolvedValue({
      DATABASE_URL: 'postgres://test',
      API_KEY: 'test-key'
    })
  }))
}));

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

describe('env-wrapper', () => {
  beforeEach(() => {
    // Reset environment
    delete process.env.PHASE_SERVICE_TOKEN;
    delete process.env.VERCEL;
    delete process.env.CI;
    delete process.env.CONTAINER;
    
    // Setup default mocks
    mockPath.join.mockImplementation((...args) => args.join('/'));
    mockPath.resolve.mockImplementation((...args) => args.join('/'));
    mockPath.dirname.mockImplementation((p) => p.split('/').slice(0, -1).join('/'));
    mockFs.existsSync.mockReturnValue(false);
  });

  describe('isContainerEnvironment', () => {
    test('detects Vercel environment', () => {
      process.env.VERCEL = '1';
      expect(isContainerEnvironment()).toBe(true);
    });

    test('detects CI environment', () => {
      process.env.CI = 'true';
      expect(isContainerEnvironment()).toBe(true);
    });

    test('detects Docker environment', () => {
      mockFs.existsSync.mockImplementation((path) => 
        path === '/.dockerenv'
      );
      expect(isContainerEnvironment()).toBe(true);
    });

    test('detects Kubernetes environment', () => {
      process.env.KUBERNETES_SERVICE_HOST = 'localhost';
      expect(isContainerEnvironment()).toBe(true);
    });

    test('returns false for non-container environment', () => {
      expect(isContainerEnvironment()).toBe(false);
    });
  });

  describe('loadPhaseSecrets', () => {
    test('returns false when no token is present', async () => {
      const result = await loadPhaseSecrets();
      expect(result).toBe(false);
    });

    test('loads secrets successfully with valid token', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'pss_service:v4:test-token';
      
      const result = await loadPhaseSecrets();
      
      expect(result).toBe(true);
      expect(process.env.DATABASE_URL).toBe('postgres://test');
      expect(process.env.API_KEY).toBe('test-key');
    });

    test('handles invalid token format gracefully', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'invalid';
      
      const result = await loadPhaseSecrets();
      
      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Phase token appears too short')
      );
    });

    test('detects app namespace from Phase config', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'pss_service:v4:test-token';
      
      // Mock package.json with phase config
      mockFs.existsSync.mockImplementation((filePath) => 
        String(filePath).endsWith('package.json')
      );
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        phase: {
          app: 'App.Coordinated.Web',
          environments: {
            development: 'development'
          }
        }
      }));
      
      const { PhaseClient } = await import('@coordinated/phase-client');
      await loadPhaseSecrets();
      
      expect(PhaseClient).toHaveBeenCalledWith(
        expect.objectContaining({
          appNamespace: 'web'
        })
      );
    });

    test('handles Phase client errors gracefully', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'pss_service:v4:test-token';
      
      const { PhaseClient } = await import('@coordinated/phase-client');
      (PhaseClient as any).mockImplementation(() => ({
        getSecrets: jest.fn().mockRejectedValue(new Error('Network error'))
      }));
      
      const result = await loadPhaseSecrets();
      
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load Phase secrets'),
        'Network error'
      );
    });

    test('preserves Phase token for child processes', async () => {
      const token = 'pss_service:v4:test-token';
      process.env.PHASE_SERVICE_TOKEN = token;
      
      await loadPhaseSecrets();
      
      expect(process.env.PHASE_SERVICE_TOKEN).toBe(token);
    });
  });

  describe('runEnvWrapper', () => {
    const mockChildProcess = {
      on: jest.fn(),
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() }
    };

    beforeEach(() => {
      mockSpawn.mockReturnValue(mockChildProcess as any);
      mockChildProcess.on.mockImplementation((event, handler) => {
        if (event === 'exit') {
          // Simulate successful exit
          setTimeout(() => handler(0), 0);
        }
      });
    });

    test('requires -- separator in arguments', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exit');
      });

      await expect(runEnvWrapper(['test'])).rejects.toThrow('Process exit');
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Usage: env-wrapper')
      );
      expect(mockExit).toHaveBeenCalledWith(1);
      
      mockExit.mockRestore();
    });

    test('requires command after -- separator', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exit');
      });

      await expect(runEnvWrapper(['--'])).rejects.toThrow('Process exit');
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('No command specified')
      );
      expect(mockExit).toHaveBeenCalledWith(1);
      
      mockExit.mockRestore();
    });

    test('loads environment file when specified', async () => {
      mockFs.existsSync.mockReturnValue(true);
      
      const dotenv = require('dotenv');
      jest.mock('dotenv', () => ({
        config: jest.fn().mockReturnValue({ parsed: { TEST: 'value' } })
      }));

      await runEnvWrapper(['-e', '.env.test', '--', 'echo', 'test']);
      
      expect(dotenv.config).toHaveBeenCalledWith({
        path: expect.stringContaining('.env.test')
      });
    });

    test('skips env file loading in container environment', async () => {
      process.env.VERCEL = '1';
      
      const dotenv = require('dotenv');
      jest.mock('dotenv', () => ({
        config: jest.fn()
      }));

      await runEnvWrapper(['--', 'echo', 'test']);
      
      expect(dotenv.config).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Container environment detected')
      );
    });

    test('loads Phase secrets when enabled', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'pss_service:v4:test-token';
      
      await runEnvWrapper(['--', 'echo', 'test']);
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Loading Phase.dev secrets')
      );
    });

    test('skips Phase when --no-phase flag is used', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'pss_service:v4:test-token';
      
      await runEnvWrapper(['--no-phase', '--', 'echo', 'test']);
      
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Loading Phase.dev secrets')
      );
    });

    test('executes command with proper arguments', async () => {
      await runEnvWrapper(['--', 'npm', 'run', 'build']);
      
      expect(mockSpawn).toHaveBeenCalledWith(
        'npm run build',
        expect.objectContaining({
          stdio: 'inherit',
          shell: true,
          env: process.env
        })
      );
    });

    test('preserves quoted arguments', async () => {
      await runEnvWrapper(['--', 'echo', '"hello world"']);
      
      expect(mockSpawn).toHaveBeenCalledWith(
        'echo "hello world"',
        expect.anything()
      );
    });

    test('handles command execution errors', async () => {
      mockChildProcess.on.mockImplementation((event, handler) => {
        if (event === 'error') {
          handler(new Error('Command failed'));
        }
      });

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exit');
      });

      await expect(runEnvWrapper(['--', 'invalid-command'])).rejects.toThrow('Process exit');
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to start command'),
        expect.any(Error)
      );
      expect(mockExit).toHaveBeenCalledWith(1);
      
      mockExit.mockRestore();
    });

    test('exits with child process exit code', async () => {
      mockChildProcess.on.mockImplementation((event, handler) => {
        if (event === 'exit') {
          handler(127); // Command not found
        }
      });

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exit');
      });

      await expect(runEnvWrapper(['--', 'test'])).rejects.toThrow('Process exit');
      
      expect(mockExit).toHaveBeenCalledWith(127);
      
      mockExit.mockRestore();
    });
  });
});
