import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        '__tests__/**',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/*.config.{ts,js}',
        '**/coverage/**',
        '**/.next/**',
        '**/dist/**',
        '**/*.d.ts',
        'vitest.setup.ts',
        'next.config.js',
        'tailwind.config.js',
        'postcss.config.js',
        // Exclude demo and example files
        'demo-*.{ts,tsx,html}',
        '**/examples/**',
        '**/fixtures/**',
        '**/mocks/**'
      ],
      include: [
        'app/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
        'hooks/**/*.{ts,tsx}'
      ],
      // Coverage thresholds
      thresholds: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        },
        // Critical modules require 100% coverage
        'lib/services/**': {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100
        },
        'lib/models/**': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        },
        'app/api/**': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      },
      // Fail if coverage is below threshold
      skipFull: false,
      all: true
    },
    // Test execution settings
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    // Parallel execution for better performance
    maxConcurrency: 4,
    // Reporter configuration
    reporters: ['verbose', 'json', 'html'],
    outputFile: {
      json: './test-results/results.json',
      html: './test-results/index.html'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '~/': path.resolve(__dirname, '.'),
    },
  },
})