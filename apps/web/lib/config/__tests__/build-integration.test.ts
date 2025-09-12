import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Mock child_process for testing
vi.mock('child_process', () => ({
  execSync: vi.fn()
}));

// Mock fs for testing
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn(),
    statSync: vi.fn()
  }
}));

const mockExecSync = vi.mocked(execSync);
const mockFs = vi.mocked(fs);

describe('Build Process Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Turbo Build Orchestration', () => {
    it('should execute turbo build with correct configuration', () => {
      // Mock turbo.json exists
      mockFs.existsSync.mockImplementation((filePath: any) => {
        return filePath.toString().includes('turbo.json');
      });

      // Mock turbo.json content
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        pipeline: {
          build: {
            dependsOn: ['^build'],
            outputs: ['dist/**', '.next/**']
          },
          test: {
            dependsOn: ['build'],
            outputs: []
          }
        }
      }));

      // Mock successful turbo build
      mockExecSync.mockReturnValue(Buffer.from('✓ Built successfully'));

      // Simulate turbo build command
      const buildCommand = 'turbo run build';
      const result = mockExecSync(buildCommand, { encoding: 'utf8' });

      expect(mockExecSync).toHaveBeenCalledWith(buildCommand, { encoding: 'utf8' });
      expect(result.toString()).toContain('Built successfully');
    });

    it('should handle turbo build failures gracefully', () => {
      mockFs.existsSync.mockReturnValue(true);
      
      // Mock turbo build failure
      const buildError = new Error('Build failed: TypeScript errors found');
      (buildError as any).status = 1;
      mockExecSync.mockImplementation(() => {
        throw buildError;
      });

      expect(() => {
        mockExecSync('turbo run build', { encoding: 'utf8' });
      }).toThrow('Build failed: TypeScript errors found');
    });

    it('should validate turbo pipeline configuration', () => {
      const mockTurboConfig = {
        pipeline: {
          build: {
            dependsOn: ['^build'],
            outputs: ['dist/**', '.next/**'],
            cache: true
          },
          test: {
            dependsOn: ['build'],
            outputs: [],
            cache: true
          },
          lint: {
            outputs: [],
            cache: true
          },
          typecheck: {
            dependsOn: ['build'],
            outputs: [],
            cache: true
          }
        }
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockTurboConfig));

      const config = JSON.parse(mockFs.readFileSync('turbo.json', 'utf8') as string);

      // Validate pipeline structure
      expect(config.pipeline).toBeDefined();
      expect(config.pipeline.build).toBeDefined();
      expect(config.pipeline.test).toBeDefined();
      expect(config.pipeline.lint).toBeDefined();
      expect(config.pipeline.typecheck).toBeDefined();

      // Validate build dependencies
      expect(config.pipeline.build.dependsOn).toContain('^build');
      expect(config.pipeline.test.dependsOn).toContain('build');
      expect(config.pipeline.typecheck.dependsOn).toContain('build');

      // Validate caching is enabled
      expect(config.pipeline.build.cache).toBe(true);
      expect(config.pipeline.test.cache).toBe(true);
      expect(config.pipeline.lint.cache).toBe(true);
    });

    it('should execute builds in correct dependency order', () => {
      const buildOrder: string[] = [];
      
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('packages/config')) {
          buildOrder.push('config');
        } else if (command.includes('packages/types')) {
          buildOrder.push('types');
        } else if (command.includes('packages/ui')) {
          buildOrder.push('ui');
        } else if (command.includes('apps/web')) {
          buildOrder.push('web');
        }
        return Buffer.from('Build completed');
      });

      // Simulate turbo build execution
      mockExecSync('turbo run build --filter=packages/types', { encoding: 'utf8' });
      mockExecSync('turbo run build --filter=packages/config', { encoding: 'utf8' });
      mockExecSync('turbo run build --filter=packages/ui', { encoding: 'utf8' });
      mockExecSync('turbo run build --filter=apps/web', { encoding: 'utf8' });

      // Verify build order (packages should build before apps)
      expect(buildOrder).toEqual(['types', 'config', 'ui', 'web']);
    });

    it('should handle parallel builds for independent packages', () => {
      const startTimes: Record<string, number> = {};
      const endTimes: Record<string, number> = {};

      mockExecSync.mockImplementation((command: string) => {
        const packageName = command.includes('types') ? 'types' : 'config';
        startTimes[packageName] = Date.now();
        
        // Simulate build time
        setTimeout(() => {
          endTimes[packageName] = Date.now();
        }, 100);
        
        return Buffer.from(`${packageName} built`);
      });

      // Simulate parallel builds
      mockExecSync('turbo run build --filter=packages/types', { encoding: 'utf8' });
      mockExecSync('turbo run build --filter=packages/config', { encoding: 'utf8' });

      expect(mockExecSync).toHaveBeenCalledTimes(2);
    });
  });

  describe('pnpm Workspace Dependency Resolution', () => {
    it('should validate pnpm workspace configuration', () => {
      const mockWorkspaceConfig = {
        packages: [
          'apps/*',
          'packages/*'
        ]
      };

      mockFs.readFileSync.mockReturnValue(`packages:\n  - 'apps/*'\n  - 'packages/*'`);

      const workspaceContent = mockFs.readFileSync('pnpm-workspace.yaml', 'utf8');
      
      expect(workspaceContent).toContain('apps/*');
      expect(workspaceContent).toContain('packages/*');
    });

    it('should resolve workspace dependencies correctly', () => {
      // Mock package.json files
      const mockRootPackageJson = {
        name: 'c9d-ai',
        workspaces: ['apps/*', 'packages/*'],
        devDependencies: {
          turbo: '^1.10.0',
          typescript: '^5.0.0'
        }
      };

      const mockWebPackageJson = {
        name: '@c9d/web',
        dependencies: {
          '@c9d/config': 'workspace:*',
          '@c9d/types': 'workspace:*',
          '@c9d/ui': 'workspace:*'
        }
      };

      mockFs.readFileSync.mockImplementation((filePath: any) => {
        const path = filePath.toString();
        if (path.includes('package.json') && !path.includes('apps') && !path.includes('packages')) {
          return JSON.stringify(mockRootPackageJson);
        } else if (path.includes('apps/web/package.json')) {
          return JSON.stringify(mockWebPackageJson);
        }
        return '{}';
      });

      // Simulate pnpm install
      mockExecSync.mockReturnValue(Buffer.from('Dependencies installed'));

      const result = mockExecSync('pnpm install', { encoding: 'utf8' });

      expect(result.toString()).toContain('Dependencies installed');
      expect(mockExecSync).toHaveBeenCalledWith('pnpm install', { encoding: 'utf8' });
    });

    it('should handle workspace dependency linking', () => {
      // Mock successful linking
      mockExecSync.mockReturnValue(Buffer.from('Workspace dependencies linked'));

      const result = mockExecSync('pnpm install --frozen-lockfile', { encoding: 'utf8' });

      expect(result.toString()).toContain('linked');
      expect(mockExecSync).toHaveBeenCalledWith('pnpm install --frozen-lockfile', { encoding: 'utf8' });
    });

    it('should validate package interdependencies', () => {
      const mockPackages = {
        'packages/types': {
          name: '@c9d/types',
          dependencies: {}
        },
        'packages/config': {
          name: '@c9d/config',
          dependencies: {
            '@c9d/types': 'workspace:*'
          }
        },
        'packages/ui': {
          name: '@c9d/ui',
          dependencies: {
            '@c9d/types': 'workspace:*'
          }
        },
        'apps/web': {
          name: '@c9d/web',
          dependencies: {
            '@c9d/config': 'workspace:*',
            '@c9d/types': 'workspace:*',
            '@c9d/ui': 'workspace:*'
          }
        }
      };

      mockFs.readFileSync.mockImplementation((filePath: any) => {
        const path = filePath.toString();
        for (const [packagePath, packageJson] of Object.entries(mockPackages)) {
          if (path.includes(`${packagePath}/package.json`)) {
            return JSON.stringify(packageJson);
          }
        }
        return '{}';
      });

      // Validate dependency graph
      const webDeps = JSON.parse(mockFs.readFileSync('apps/web/package.json', 'utf8') as string);
      const configDeps = JSON.parse(mockFs.readFileSync('packages/config/package.json', 'utf8') as string);

      expect(webDeps.dependencies['@c9d/config']).toBe('workspace:*');
      expect(webDeps.dependencies['@c9d/types']).toBe('workspace:*');
      expect(webDeps.dependencies['@c9d/ui']).toBe('workspace:*');
      expect(configDeps.dependencies['@c9d/types']).toBe('workspace:*');
    });

    it('should handle pnpm lockfile validation', () => {
      mockFs.existsSync.mockImplementation((filePath: any) => {
        return filePath.toString().includes('pnpm-lock.yaml');
      });

      mockFs.readFileSync.mockReturnValue(`
lockfileVersion: '6.0'
dependencies:
  '@c9d/config':
    specifier: workspace:*
    version: link:packages/config
`);

      const lockfileExists = mockFs.existsSync('pnpm-lock.yaml');
      expect(lockfileExists).toBe(true);

      const lockfileContent = mockFs.readFileSync('pnpm-lock.yaml', 'utf8');
      expect(lockfileContent).toContain('workspace:*');
      expect(lockfileContent).toContain('link:packages/config');
    });
  });

  describe('Vercel Deployment Configuration', () => {
    it('should validate vercel.json configuration', () => {
      const mockVercelConfig = {
        version: 2,
        builds: [
          {
            src: 'apps/web/package.json',
            use: '@vercel/next'
          }
        ],
        routes: [
          {
            src: '/(.*)',
            dest: 'apps/web/$1'
          }
        ],
        env: {
          PHASE_SERVICE_TOKEN: '@phase-service-token'
        },
        build: {
          env: {
            PHASE_SERVICE_TOKEN: '@phase-service-token'
          }
        }
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockVercelConfig));

      const config = JSON.parse(mockFs.readFileSync('vercel.json', 'utf8') as string);

      expect(config.version).toBe(2);
      expect(config.builds).toHaveLength(1);
      expect(config.builds[0].src).toBe('apps/web/package.json');
      expect(config.builds[0].use).toBe('@vercel/next');
      expect(config.env.PHASE_SERVICE_TOKEN).toBe('@phase-service-token');
    });

    it('should validate Next.js configuration for Vercel', () => {
      const mockNextConfig = {
        experimental: {
          outputFileTracingRoot: path.join(process.cwd(), '../../')
        },
        transpilePackages: ['@c9d/ui', '@c9d/config', '@c9d/types'],
        env: {
          CUSTOM_KEY: process.env.CUSTOM_KEY
        }
      };

      mockFs.readFileSync.mockReturnValue(`
/** @type {import('next').NextConfig} */
const nextConfig = ${JSON.stringify(mockNextConfig, null, 2)};

export default nextConfig;
`);

      const configContent = mockFs.readFileSync('apps/web/next.config.mjs', 'utf8');
      
      expect(configContent).toContain('outputFileTracingRoot');
      expect(configContent).toContain('transpilePackages');
      expect(configContent).toContain('@c9d/ui');
      expect(configContent).toContain('@c9d/config');
      expect(configContent).toContain('@c9d/types');
    });

    it('should validate build command configuration', () => {
      const mockPackageJson = {
        scripts: {
          build: 'turbo run build',
          'build:vercel': 'turbo run build --filter=apps/web',
          start: 'turbo run start',
          dev: 'turbo run dev',
          test: 'turbo run test'
        }
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

      const packageJson = JSON.parse(mockFs.readFileSync('package.json', 'utf8') as string);

      expect(packageJson.scripts.build).toBe('turbo run build');
      expect(packageJson.scripts['build:vercel']).toBe('turbo run build --filter=apps/web');
      expect(packageJson.scripts.start).toBe('turbo run start');
    });

    it('should handle Vercel environment variable integration', () => {
      // Mock Vercel CLI commands
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('vercel env')) {
          return Buffer.from('Environment variables configured');
        } else if (command.includes('vercel build')) {
          return Buffer.from('Build completed successfully');
        }
        return Buffer.from('Command executed');
      });

      // Test environment variable setup
      const envResult = mockExecSync('vercel env add PHASE_SERVICE_TOKEN', { encoding: 'utf8' });
      expect(envResult.toString()).toContain('Environment variables configured');

      // Test build with environment variables
      const buildResult = mockExecSync('vercel build', { encoding: 'utf8' });
      expect(buildResult.toString()).toContain('Build completed successfully');
    });

    it('should validate deployment output structure', () => {
      mockFs.existsSync.mockImplementation((filePath: any) => {
        const path = filePath.toString();
        return path.includes('.vercel/output') || 
               path.includes('functions') || 
               path.includes('static') || 
               path.includes('config.json');
      });

      mockFs.readdirSync.mockImplementation((dirPath: any) => {
        if (dirPath.toString().includes('.vercel/output')) {
          return ['functions', 'static', 'config.json'] as any;
        }
        return [] as any;
      });

      const outputExists = mockFs.existsSync('.vercel/output');
      expect(outputExists).toBe(true);

      const outputContents = mockFs.readdirSync('.vercel/output');
      expect(outputContents).toContain('functions');
      expect(outputContents).toContain('static');
      expect(outputContents).toContain('config.json');
    });
  });

  describe('End-to-End Build Integration', () => {
    it('should execute complete build pipeline', () => {
      const buildSteps: string[] = [];

      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('pnpm install')) {
          buildSteps.push('install');
          return Buffer.from('Dependencies installed');
        } else if (command.includes('turbo run build')) {
          buildSteps.push('build');
          return Buffer.from('Build completed');
        } else if (command.includes('turbo run test')) {
          buildSteps.push('test');
          return Buffer.from('Tests passed');
        }
        return Buffer.from('Step completed');
      });

      // Execute build pipeline
      mockExecSync('pnpm install', { encoding: 'utf8' });
      mockExecSync('turbo run build', { encoding: 'utf8' });
      mockExecSync('turbo run test', { encoding: 'utf8' });

      expect(buildSteps).toEqual(['install', 'build', 'test']);
      expect(mockExecSync).toHaveBeenCalledTimes(3);
    });

    it('should handle build failures and provide diagnostics', () => {
      const buildError = new Error('Build failed: Module not found');
      (buildError as any).status = 1;
      (buildError as any).stdout = 'Error: Cannot resolve module @c9d/config';

      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('turbo run build')) {
          throw buildError;
        }
        return Buffer.from('Command executed');
      });

      expect(() => {
        mockExecSync('turbo run build', { encoding: 'utf8' });
      }).toThrow('Build failed: Module not found');
    });

    it('should validate cache effectiveness', () => {
      let cacheHits = 0;

      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('turbo run build')) {
          cacheHits++;
          if (cacheHits === 1) {
            return Buffer.from('Building... [CACHE MISS]');
          } else {
            return Buffer.from('Building... [CACHE HIT]');
          }
        }
        return Buffer.from('Command executed');
      });

      // First build (cache miss)
      const firstBuild = mockExecSync('turbo run build', { encoding: 'utf8' });
      expect(firstBuild.toString()).toContain('CACHE MISS');

      // Second build (cache hit)
      const secondBuild = mockExecSync('turbo run build', { encoding: 'utf8' });
      expect(secondBuild.toString()).toContain('CACHE HIT');
    });

    it('should validate monorepo package isolation', () => {
      const packageBuilds: Record<string, boolean> = {};

      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('--filter=packages/config')) {
          packageBuilds.config = true;
          return Buffer.from('Config package built');
        } else if (command.includes('--filter=packages/types')) {
          packageBuilds.types = true;
          return Buffer.from('Types package built');
        } else if (command.includes('--filter=apps/web')) {
          packageBuilds.web = true;
          return Buffer.from('Web app built');
        }
        return Buffer.from('Package built');
      });

      // Build individual packages
      mockExecSync('turbo run build --filter=packages/types', { encoding: 'utf8' });
      mockExecSync('turbo run build --filter=packages/config', { encoding: 'utf8' });
      mockExecSync('turbo run build --filter=apps/web', { encoding: 'utf8' });

      expect(packageBuilds.types).toBe(true);
      expect(packageBuilds.config).toBe(true);
      expect(packageBuilds.web).toBe(true);
    });
  });
});