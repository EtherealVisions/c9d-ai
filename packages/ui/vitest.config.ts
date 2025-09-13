import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      },
      exclude: [
        '**/__tests__/**',
        '**/node_modules/**',
        '**/*.config.*',
        '**/coverage/**',
        '**/dist/**'
      ]
    },
    // Allow running with no test files
    passWithNoTests: true
  }
})