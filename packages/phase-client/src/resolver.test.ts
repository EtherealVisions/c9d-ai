import { resolveEnvironment, parseEnvMap, detectEnvironment } from './resolver';

describe('resolveEnvironment', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('with no options', () => {
    it('should return "development" by default', () => {
      delete process.env.NODE_ENV;
      delete process.env.PHASE_ENV;
      expect(resolveEnvironment()).toBe('development');
    });

    it('should use NODE_ENV when available', () => {
      process.env.NODE_ENV = 'production';
      expect(resolveEnvironment()).toBe('production');
    });

    it('should use PHASE_ENV over NODE_ENV', () => {
      process.env.NODE_ENV = 'production';
      process.env.PHASE_ENV = 'staging';
      expect(resolveEnvironment()).toBe('staging');
    });

    it('should auto-detect environment', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.PHASE_ENV;
      expect(resolveEnvironment()).toBe('production');
    });
  });

  describe('with globalEnv option', () => {
    it('should use globalEnv when PHASE_ENV is not set', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.PHASE_ENV;
      expect(resolveEnvironment({ globalEnv: 'testing' })).toBe('testing');
    });

    it('should ignore globalEnv when set to "auto"', () => {
      process.env.NODE_ENV = 'production';
      expect(resolveEnvironment({ globalEnv: 'auto' })).toBe('production');
    });
  });

  describe('with envMap option', () => {
    it('should use envMap for app-specific environments', () => {
      delete process.env.PHASE_ENV;
      delete process.env.PHASE_ENV_MAP;
      const result = resolveEnvironment({ 
        appName: 'API',
        envMap: 'WEB=feature-123,API=staging,DOCS=production'
      });
      expect(result).toBe('staging');
    });

    it('should parse PHASE_ENV_MAP from environment', () => {
      process.env.PHASE_ENV_MAP = 'API=custom-env,WEB=another-env';
      const result = resolveEnvironment({ appName: 'API' });
      expect(result).toBe('custom-env');
    });

    it('should prefer provided envMap over environment PHASE_ENV_MAP', () => {
      delete process.env.PHASE_ENV;
      delete process.env.PHASE_ENV__API; // Make sure app-specific isn't set
      process.env.PHASE_ENV_MAP = 'API=env-value';
      const result = resolveEnvironment({ 
        appName: 'API',
        envMap: 'API=option-value'
      });
      expect(result).toBe('option-value');
    });
  });

  describe('with autoDetect option', () => {
    it('should skip auto-detection when false', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.PHASE_ENV;
      expect(resolveEnvironment({ autoDetect: false })).toBe('development');
    });

    it('should use globalEnv even with autoDetect false', () => {
      process.env.NODE_ENV = 'production';
      expect(resolveEnvironment({ 
        autoDetect: false, 
        globalEnv: 'custom' 
      })).toBe('custom');
    });
  });

  describe('with appName option', () => {
    it('should use app-specific environment variable', () => {
      process.env.NODE_ENV = 'production';
      process.env.PHASE_ENV__myapp = 'custom';
      expect(resolveEnvironment({ appName: 'myapp' })).toBe('custom');
    });

    it('should prefer app-specific over PHASE_ENV', () => {
      process.env.PHASE_ENV = 'staging';
      process.env.PHASE_ENV__api = 'testing';
      expect(resolveEnvironment({ appName: 'api' })).toBe('testing');
    });

    it('should fall back to PHASE_ENV if app-specific not found', () => {
      process.env.PHASE_ENV = 'staging';
      expect(resolveEnvironment({ appName: 'api' })).toBe('staging');
    });
  });

  describe('complex scenarios', () => {
    it('should handle all options together', () => {
      process.env.NODE_ENV = 'dev';
      process.env.PHASE_ENV = 'staging';
      process.env.PHASE_ENV__api = 'testing';
      
      // App-specific override takes precedence
      expect(resolveEnvironment({ appName: 'api' })).toBe('testing');
    });

    it('should respect PHASE_ENV over globalEnv', () => {
      process.env.NODE_ENV = 'production';
      process.env.PHASE_ENV = 'staging';
      
      expect(resolveEnvironment({
        globalEnv: 'custom'
      })).toBe('staging');
    });

    it('should handle empty string environments', () => {
      process.env.NODE_ENV = '';
      process.env.PHASE_ENV = '';
      expect(resolveEnvironment()).toBe('development');
    });
  });
});

describe('parseEnvMap', () => {
  it('should parse environment map string', () => {
    const map = parseEnvMap('WEB=feature-123,API=staging,DOCS=production');
    expect(map).toEqual({
      WEB: 'feature-123',
      API: 'staging',
      DOCS: 'production'
    });
  });

  it('should handle whitespace', () => {
    const map = parseEnvMap(' WEB = feature-123 , API = staging ');
    expect(map).toEqual({
      WEB: 'feature-123',
      API: 'staging'
    });
  });

  it('should handle empty string', () => {
    const map = parseEnvMap('');
    expect(map).toEqual({});
  });

  it('should skip invalid pairs', () => {
    const map = parseEnvMap('WEB=valid,INVALID,API=also-valid,=NO_KEY');
    expect(map).toEqual({
      WEB: 'valid',
      API: 'also-valid'
    });
  });
});

describe('detectEnvironment', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should detect Vercel production', () => {
    process.env.VERCEL_ENV = 'production';
    expect(detectEnvironment()).toBe('production');
  });

  it('should detect Vercel preview as staging', () => {
    process.env.VERCEL_ENV = 'preview';
    expect(detectEnvironment()).toBe('staging');
  });

  it('should detect GitHub Actions main branch as production', () => {
    process.env.GITHUB_ACTIONS = 'true';
    process.env.GITHUB_REF = 'refs/heads/main';
    expect(detectEnvironment()).toBe('production');
  });

  it('should detect GitHub Actions develop branch as staging', () => {
    process.env.GITHUB_ACTIONS = 'true';
    process.env.GITHUB_REF = 'refs/heads/develop';
    expect(detectEnvironment()).toBe('staging');
  });

  it('should detect container environment', () => {
    process.env.CONTAINER = 'true';
    process.env.PHASE_ENV = 'custom';
    expect(detectEnvironment()).toBe('custom');
  });

  it('should use NODE_ENV mapping', () => {
    process.env.NODE_ENV = 'test';
    expect(detectEnvironment()).toBe('staging');
  });

  it('should default to development', () => {
    delete process.env.NODE_ENV;
    delete process.env.VERCEL_ENV;
    delete process.env.GITHUB_ACTIONS;
    expect(detectEnvironment()).toBe('development');
  });

  it('should detect Vercel preview as staging', () => {
    process.env.VERCEL_ENV = 'preview';
    expect(detectEnvironment()).toBe('staging');
  });

  it('should detect Vercel development', () => {
    process.env.VERCEL_ENV = 'development';
    expect(detectEnvironment()).toBe('development');
  });

  it('should default to development for unknown Vercel env', () => {
    process.env.VERCEL_ENV = 'custom-branch-preview';
    expect(detectEnvironment()).toBe('development');
  });

  it('should detect feature branch as development', () => {
    process.env.GITHUB_ACTIONS = 'true';
    process.env.GITHUB_REF = 'refs/heads/feature/new-feature';
    expect(detectEnvironment()).toBe('development');
  });

  it('should detect pull request as development', () => {
    process.env.GITHUB_ACTIONS = 'true';
    process.env.GITHUB_REF = 'refs/pull/123/merge';
    expect(detectEnvironment()).toBe('development');
  });

  it('should detect CONTAINER environment without PHASE_ENV', () => {
    process.env.CONTAINER = 'true';
    delete process.env.PHASE_ENV;
    expect(detectEnvironment()).toBe('development');
  });

  it('should detect CURSOR_CONTAINER environment', () => {
    process.env.CURSOR_CONTAINER = 'true';
    process.env.PHASE_ENV = 'staging';
    expect(detectEnvironment()).toBe('staging');
  });

  it('should map test to staging', () => {
    process.env.NODE_ENV = 'test';
    expect(detectEnvironment()).toBe('staging');
  });

  it('should default unknown NODE_ENV to development', () => {
    process.env.NODE_ENV = 'custom-env';
    expect(detectEnvironment()).toBe('development');
  });
});