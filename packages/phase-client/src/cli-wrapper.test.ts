import { fetchSecretsViaCli, injectSecretsViaCli } from './cli-wrapper';
import { execSync } from 'child_process';
import { getPhaseAppName, getPhaseEnvironment } from './config-reader';

jest.mock('child_process');
jest.mock('./config-reader');

describe('cli-wrapper', () => {
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
  const mockGetPhaseAppName = getPhaseAppName as jest.MockedFunction<typeof getPhaseAppName>;
  const mockGetPhaseEnvironment = getPhaseEnvironment as jest.MockedFunction<typeof getPhaseEnvironment>;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    mockGetPhaseAppName.mockReturnValue('test-app');
    mockGetPhaseEnvironment.mockReturnValue('development');
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('fetchSecretsViaCli', () => {
    it('should fetch secrets with token from environment', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'test-token';
      const mockOutput = JSON.stringify({
        API_KEY: 'secret123',
        DATABASE_URL: 'postgres://localhost'
      });
      mockExecSync.mockReturnValue(Buffer.from(mockOutput));

      const result = await fetchSecretsViaCli();

      expect(mockExecSync).toHaveBeenCalledWith(
        'phase secrets list --app "test-app" --env "development" --json 2>/dev/null',
        expect.objectContaining({
          env: expect.objectContaining({
            PHASE_SERVICE_TOKEN: 'test-token'
          })
        })
      );
      expect(result).toEqual({
        API_KEY: 'secret123',
        DATABASE_URL: 'postgres://localhost'
      });
    });

    it('should use provided token over environment', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'env-token';
      const mockOutput = JSON.stringify({ KEY: 'value' });
      mockExecSync.mockReturnValue(Buffer.from(mockOutput));

      await fetchSecretsViaCli({ token: 'provided-token' });

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          env: expect.objectContaining({
            PHASE_SERVICE_TOKEN: 'provided-token'
          })
        })
      );
    });

    it('should throw when no token available', async () => {
      delete process.env.PHASE_SERVICE_TOKEN;

      await expect(fetchSecretsViaCli()).rejects.toThrow('PHASE_SERVICE_TOKEN');
    });

    it('should use custom app name', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'test-token';
      mockExecSync.mockReturnValue(Buffer.from('{}'));

      await fetchSecretsViaCli({ app: 'my-app' });

      expect(mockExecSync).toHaveBeenCalledWith(
        'phase secrets list --app "my-app" --env "development" --json 2>/dev/null',
        expect.any(Object)
      );
    });

    it('should use custom environment', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'test-token';
      mockExecSync.mockReturnValue(Buffer.from('{}'));

      await fetchSecretsViaCli({ environment: 'staging' });

      expect(mockExecSync).toHaveBeenCalledWith(
        'phase secrets list --app "test-app" --env "staging" --json 2>/dev/null',
        expect.any(Object)
      );
    });

    it('should use all options together', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'test-token';
      mockExecSync.mockReturnValue(Buffer.from('{}'));

      await fetchSecretsViaCli({
        token: 'custom-token',
        app: 'my-app',
        environment: 'prod'
      });

      expect(mockExecSync).toHaveBeenCalledWith(
        'phase secrets list --app "my-app" --env "prod" --json 2>/dev/null',
        expect.objectContaining({
          env: expect.objectContaining({
            PHASE_SERVICE_TOKEN: 'custom-token'
          })
        })
      );
    });

    it('should handle exec errors', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'test-token';
      mockExecSync.mockImplementation((cmd) => {
        if (cmd === 'which phase') {
          // Phase CLI is installed
          return Buffer.from('/usr/local/bin/phase');
        }
        throw new Error('Command failed');
      });

      await expect(fetchSecretsViaCli()).rejects.toThrow('Failed to fetch secrets via Phase CLI');
    });

    it('should handle invalid JSON output', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'test-token';
      mockExecSync.mockReturnValue(Buffer.from('invalid json'));

      await expect(fetchSecretsViaCli()).rejects.toThrow('Failed to fetch secrets');
    });

    it('should handle array format JSON output', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'test-token';
      mockExecSync.mockReturnValue(Buffer.from(JSON.stringify([
        { key: 'API_KEY', value: 'secret123' },
        { key: 'DATABASE_URL', value: 'postgres://localhost' }
      ])));

      const result = await fetchSecretsViaCli();

      expect(result).toEqual({
        API_KEY: 'secret123',
        DATABASE_URL: 'postgres://localhost'
      });
    });

    it('should handle text format output', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'test-token';
      const textOutput = `
│ API_KEY │ secret123 │
│ DATABASE_URL │ postgres://localhost │
`;
      mockExecSync.mockReturnValue(textOutput);

      const result = await fetchSecretsViaCli();

      expect(result).toEqual({
        API_KEY: 'secret123',
        DATABASE_URL: 'postgres://localhost'
      });
    });

    it('should preserve original environment', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'test-token';
      process.env.CUSTOM_VAR = 'custom-value';
      mockExecSync.mockReturnValue(Buffer.from('{}'));

      await fetchSecretsViaCli();

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          env: expect.objectContaining({
            CUSTOM_VAR: 'custom-value'
          })
        })
      );
    });
  });

  describe('injectSecretsViaCli', () => {
    it('should inject secrets into process.env', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'test-token';
      const mockSecrets = {
        NEW_KEY: 'new-value',
        ANOTHER_KEY: 'another-value'
      };
      mockExecSync.mockReturnValue(Buffer.from(JSON.stringify(mockSecrets)));

      await injectSecretsViaCli();

      expect(process.env.NEW_KEY).toBe('new-value');
      expect(process.env.ANOTHER_KEY).toBe('another-value');
    });

    it('should overwrite existing environment variables', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'test-token';
      process.env.EXISTING_KEY = 'old-value';
      
      const mockSecrets = {
        EXISTING_KEY: 'new-value'
      };
      mockExecSync.mockReturnValue(Buffer.from(JSON.stringify(mockSecrets)));

      await injectSecretsViaCli();

      expect(process.env.EXISTING_KEY).toBe('new-value');
    });

    it('should pass through options to fetchSecretsViaCli', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'test-token';
      mockExecSync.mockReturnValue(Buffer.from('{}'));

      await injectSecretsViaCli({
        app: 'my-app',
        environment: 'staging'
      });

      expect(mockExecSync).toHaveBeenCalledWith(
        'phase secrets list --app "my-app" --env "staging" --json 2>/dev/null',
        expect.any(Object)
      );
    });

    it('should handle empty secrets', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'test-token';
      mockExecSync.mockReturnValue(Buffer.from('{}'));

      await injectSecretsViaCli();

      // Should not throw
      expect(true).toBe(true);
    });

    it('should handle non-string values as strings', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'test-token';
      const mockSecrets = {
        STRING_KEY: 'string-value',
        // All values from Phase are strings
        NUMBER_KEY: '123',
        BOOL_KEY: 'true',
        EMPTY_KEY: ''
      };
      mockExecSync.mockReturnValue(Buffer.from(JSON.stringify(mockSecrets)));

      await injectSecretsViaCli();

      expect(process.env.STRING_KEY).toBe('string-value');
      expect(process.env.NUMBER_KEY).toBe('123');
      expect(process.env.BOOL_KEY).toBe('true');
      expect(process.env.EMPTY_KEY).toBe('');
    });
  });

  describe('debug mode', () => {
    it('should log debug information when fetching secrets', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      process.env.PHASE_SERVICE_TOKEN = 'test-token';
      
      mockExecSync.mockReturnValue(Buffer.from('{}'));

      await fetchSecretsViaCli({ debug: true });

      expect(consoleSpy).toHaveBeenCalledWith('[Phase CLI] Fetching secrets from test-app / development');
      
      consoleSpy.mockRestore();
    });

    it('should log error details in debug mode', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      process.env.PHASE_SERVICE_TOKEN = 'test-token';
      
      mockExecSync.mockImplementation(() => {
        throw new Error('Command failed');
      });

      await expect(fetchSecretsViaCli({ debug: true })).rejects.toThrow();

      expect(errorSpy).toHaveBeenCalledWith('[Phase CLI] Error:', 'Command failed');
      
      errorSpy.mockRestore();
    });

    it('should log injection details in debug mode', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      process.env.PHASE_SERVICE_TOKEN = 'test-token';
      
      mockExecSync.mockReturnValue(Buffer.from(JSON.stringify({
        KEY1: 'value1',
        KEY2: 'value2'
      })));

      await injectSecretsViaCli({ debug: true });

      expect(consoleSpy).toHaveBeenCalledWith('[Phase CLI] Injected 2 secrets into process.env');
      
      consoleSpy.mockRestore();
    });
  });

  describe('CLI installation check', () => {
    it('should check for Phase CLI when command fails', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'test-token';
      
      let callCount = 0;
      mockExecSync.mockImplementation((cmd) => {
        callCount++;
        if (callCount === 1) {
          // First call (phase secrets list) fails
          throw new Error('Command not found');
        }
        // Second call (which phase) also fails
        throw new Error('Phase not found');
      });

      await expect(fetchSecretsViaCli()).rejects.toThrow('Phase CLI not found. Please install it');
    });
  });

  describe('text format parsing', () => {
    it('should handle non-JSON text output gracefully', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'test-token';
      
      // Return plain text that doesn't match the table format
      const plainText = 'Error: No secrets found\\nPlease configure your app first';
      mockExecSync.mockReturnValue(plainText);

      const result = await fetchSecretsViaCli();

      expect(result).toEqual({});
    });
  });
});