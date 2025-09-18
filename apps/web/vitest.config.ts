import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Enable parallel execution with memory management
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 2, // Reduced from 4 to prevent memory issues
        minThreads: 1
      }
    },
    // Test timeouts
    testTimeout: 15000, // Increased timeout for complex tests
    hookTimeout: 15000,
    // Memory management
    maxConcurrency: 10, // Limit concurrent tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Exceptional coverage thresholds by path
      thresholds: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        },
        // 100% coverage for service layer components (critical business logic)
        'lib/services/**': {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100
        },
        // 95% coverage for model components (data layer)
        'lib/models/**': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        },
        // 90% coverage for API routes (external interfaces)
        'app/api/**': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      },
      exclude: [
        '**/__tests__/**',
        '**/__mocks__/**',
        '**/node_modules/**',
        '**/*.config.*',
        '**/coverage/**',
        '**/*.d.ts',
        '**/dist/**',
        '**/.next/**',
        '**/middleware.ts', // Next.js middleware
        '**/instrumentation.ts' // Next.js instrumentation
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '~/': path.resolve(__dirname, '.'),
    },
  },
})