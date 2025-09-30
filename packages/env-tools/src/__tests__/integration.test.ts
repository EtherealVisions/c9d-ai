import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { runEnvWrapper, loadPhaseSecrets } from '../env-wrapper';
import { loadAppConfig } from '../config-loader';
import { validateEnvironment } from '../validator';

// Mock child_process spawn to prevent actual command execution
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

describe('env-tools integration tests', () => {
  let tempDir: string;
  const originalExit = process.exit;
  
  beforeAll(() => {
    // Mock process.exit to prevent test runner from exiting
    process.exit = jest.fn() as any;
  });
  
  afterAll(() => {
    // Restore original process.exit
    process.exit = originalExit;
  });
  
  beforeEach(() => {
    // Create temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-tools-test-'));
    process.chdir(tempDir);
    
    // Clear all mocks
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Full workflow test', () => {
    test('loads env file, validates config, and runs command', async () => {
      // Create test env file
      fs.writeFileSync('.env.test', `
TEST_DATABASE_URL=postgresql://test@localhost/test
TEST_API_KEY=test-key-123
TEST_OPTIONAL_VAR=optional-value
`);

      // Create config file
      const config = {
        appName: 'integration-test',
        displayName: 'Integration Test App',
        envVars: {
          required: [{
            name: 'TEST_DATABASE_URL',
            required: true,
            description: 'Test database URL',
            example: 'postgresql://...'
          }, {
            name: 'TEST_API_KEY',
            required: true,
            description: 'Test API key',
            example: 'key-123'
          }],
          optional: [{
            name: 'TEST_OPTIONAL_VAR',
            required: false,
            description: 'Optional test variable',
            example: 'value'
          }]
        },
        validation: {
          strict: true
        }
      };
      
      fs.writeFileSync('env.config.json', JSON.stringify(config));

      // Mock spawn to capture command execution
      const { spawn } = require('child_process');
      const mockProcess = {
        on: jest.fn((event, handler) => {
          if (event === 'exit') {
            setTimeout(() => handler(0), 0);
          }
        }),
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() }
      };
      spawn.mockReturnValue(mockProcess);

      // Run env-wrapper
      await runEnvWrapper(['-e', '.env.test', '--config', 'env.config.json', '--', 'echo', 'test']);

      // Verify environment was loaded
      expect(process.env.TEST_DATABASE_URL).toBe('postgresql://test@localhost/test');
      expect(process.env.TEST_API_KEY).toBe('test-key-123');
      
      // Verify command was executed
      expect(spawn).toHaveBeenCalledWith(
        'echo test',
        expect.objectContaining({
          env: expect.objectContaining({
            TEST_DATABASE_URL: 'postgresql://test@localhost/test',
            TEST_API_KEY: 'test-key-123'
          })
        })
      );
    });
  });

  describe('Phase.dev integration', () => {
    test('loads config and validates against Phase secrets', async () => {
      // Create config file
      const config = {
        appName: 'phase-test',
        displayName: 'Phase Test App',
        phase: {
          app: 'App.Test.Integration',
          environments: {
            development: 'development'
          }
        },
        envVars: {
          required: [{
            name: 'TEST_DATABASE_URL',
            required: true,
            description: 'Database URL from Phase',
            example: 'postgresql://...'
          }, {
            name: 'TEST_API_KEY',
            required: true,
            description: 'API key from Phase',
            example: 'key-...'
          }],
          optional: []
        }
      };
      
      fs.writeFileSync('env.config.json', JSON.stringify(config));
      fs.writeFileSync('package.json', JSON.stringify({
        name: 'phase-test',
        phase: config.phase
      }));
      
      // Set Phase token
      process.env.PHASE_SERVICE_TOKEN = 'pss_service:v4:test-integration';
      
      // Mock Phase client
      jest.doMock('@coordinated/phase-client', () => ({
        PhaseClient: jest.fn().mockImplementation(() => ({
          getSecrets: jest.fn().mockResolvedValue({
            TEST_DATABASE_URL: 'phase://database',
            TEST_API_KEY: 'phase-key-456'
          })
        }))
      }));
      
      // Load Phase secrets
      const phaseLoaded = await loadPhaseSecrets();
      expect(phaseLoaded).toBe(true);
      
      // Load config
      const loadedConfig = loadAppConfig();
      expect(loadedConfig).toBeTruthy();
      
      // Validate environment
      if (loadedConfig) {
        const validation = await validateEnvironment(loadedConfig);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      }
    });
  });

  describe('Vercel environment simulation', () => {
    test('behaves correctly in Vercel build environment', async () => {
      // Set Vercel environment variables
      process.env.VERCEL = '1';
      process.env.VERCEL_ENV = 'production';
      process.env.NODE_ENV = 'production';
      
      // Create minimal config
      const config = {
        appName: 'vercel-test',
        displayName: 'Vercel Test App'
      };
      
      fs.writeFileSync('env.config.json', JSON.stringify(config));
      
      // Mock spawn
      const { spawn } = require('child_process');
      const mockProcess = {
        on: jest.fn((event, handler) => {
          if (event === 'exit') handler(0);
        }),
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() }
      };
      spawn.mockReturnValue(mockProcess);
      
      // Run env-wrapper - should detect container environment
      await runEnvWrapper(['--', 'next', 'build']);
      
      // Verify it detected container environment
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Container environment detected')
      );
      
      // Verify command was executed
      expect(spawn).toHaveBeenCalledWith(
        'next build',
        expect.any(Object)
      );
    });
  });

  describe('Error scenarios', () => {
    test('handles missing required variables gracefully', async () => {
      // Create config requiring variables that don't exist
      const config = {
        appName: 'error-test',
        displayName: 'Error Test App',
        envVars: {
          required: [{
            name: 'MISSING_VAR',
            required: true,
            description: 'This variable is missing',
            example: 'value'
          }],
          optional: []
        },
        validation: {
          strict: true
        }
      };
      
      fs.writeFileSync('env.config.json', JSON.stringify(config));
      
      // Run env-wrapper with validation
      await runEnvWrapper(['--config', 'env.config.json', '--', 'echo', 'test']);
      
      // Verify validation failed and process.exit was called
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Environment validation failed')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('continues without Phase when token is invalid', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'invalid-token';
      
      // Create env file as fallback
      fs.writeFileSync('.env', 'FALLBACK_VAR=fallback-value');
      
      // Mock spawn
      const { spawn } = require('child_process');
      const mockProcess = {
        on: jest.fn((event, handler) => {
          if (event === 'exit') handler(0);
        }),
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() }
      };
      spawn.mockReturnValue(mockProcess);
      
      // Run env-wrapper
      await runEnvWrapper(['--', 'echo', 'test']);
      
      // Verify it tried Phase but continued
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Phase token appears too short')
      );
      
      // Verify fallback env was loaded
      expect(process.env.FALLBACK_VAR).toBe('fallback-value');
    });
  });
});