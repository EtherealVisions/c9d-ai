import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        }
      },
      exclude: [
        '**/__tests__/**',
        '**/node_modules/**',
        '**/*.config.*',
        '**/coverage/**',
        '**/*.d.ts',
        '**/dist/**',
        '**/.next/**'
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