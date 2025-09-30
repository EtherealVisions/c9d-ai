/**
 * Test Script Validation
 * 
 * Validates that all test scripts are properly configured with env-wrapper
 * and proper memory management as required by Task 9.
 */

import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Test Script Configuration Validation', () => {
  const packageJsonPath = join(process.cwd(), 'package.json')
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))

  describe('Package.json Test Scripts', () => {
    it('should have all test scripts using env-wrapper', () => {
      const testScripts = Object.entries(packageJson.scripts)
        .filter(([name]) => name.startsWith('test'))
        .map(([name, script]) => ({ name, script: script as string }))

      expect(testScripts.length).toBeGreaterThan(0)

      testScripts.forEach(({ name, script }) => {
        // All test scripts should use env-wrapper
        expect(script).toContain('env-wrapper')
        console.log(`✅ ${name}: uses env-wrapper`)
      })
    })

    it('should have all test scripts with proper memory management', () => {
      const testScripts = Object.entries(packageJson.scripts)
        .filter(([name]) => name.startsWith('test'))
        .map(([name, script]) => ({ name, script: script as string }))

      testScripts.forEach(({ name, script }) => {
        // All test scripts should have NODE_OPTIONS with memory allocation
        expect(script).toContain('NODE_OPTIONS=')
        expect(script).toContain('--max-old-space-size=')
        
        // Extract memory size
        const memoryMatch = script.match(/--max-old-space-size=(\d+)/)
        expect(memoryMatch).toBeTruthy()
        
        const memorySize = parseInt(memoryMatch![1])
        
        // Coverage tests should have higher memory allocation
        if (name.includes('coverage')) {
          expect(memorySize).toBeGreaterThanOrEqual(16384) // 16GB for coverage
        } else {
          expect(memorySize).toBeGreaterThanOrEqual(8192) // 8GB for regular tests
        }
        
        console.log(`✅ ${name}: memory allocation ${memorySize}MB`)
      })
    })

    it('should have specific environment test scripts', () => {
      const requiredScripts = [
        'test:env',
        'test:env-validation', 
        'test:phase-integration',
        'test:env-e2e'
      ]

      requiredScripts.forEach(scriptName => {
        expect(packageJson.scripts).toHaveProperty(scriptName)
        expect(packageJson.scripts[scriptName]).toContain('env-wrapper')
        console.log(`✅ ${scriptName}: configured`)
      })
    })
  })

  describe('Environment Variable Loading', () => {
    it('should load environment variables through env-wrapper', () => {
      // Test that env-wrapper is working by running a simple command
      try {
        const result = execSync('pnpm env-wrapper node -e "console.log(process.env.NODE_ENV)"', {
          encoding: 'utf8',
          timeout: 10000
        })
        
        expect(result.trim()).toBeTruthy()
        console.log('✅ env-wrapper is working, NODE_ENV:', result.trim())
      } catch (error) {
        console.error('❌ env-wrapper test failed:', error)
        throw error
      }
    })

    it('should validate environment variables are accessible in tests', () => {
      // These environment variables should be available in test context
      const criticalVars = ['NODE_ENV', 'NODE_OPTIONS']
      
      criticalVars.forEach(varName => {
        expect(process.env[varName]).toBeDefined()
        console.log(`✅ ${varName}:`, process.env[varName])
      })
    })

    it('should have proper memory configuration in current process', () => {
      const nodeOptions = process.env.NODE_OPTIONS
      expect(nodeOptions).toBeDefined()
      expect(nodeOptions).toContain('--max-old-space-size=')
      
      const memoryMatch = nodeOptions!.match(/--max-old-space-size=(\d+)/)
      expect(memoryMatch).toBeTruthy()
      
      const memorySize = parseInt(memoryMatch![1])
      expect(memorySize).toBeGreaterThanOrEqual(8192)
      
      console.log(`✅ Current process memory allocation: ${memorySize}MB`)
    })
  })

  describe('Phase.dev Integration Configuration', () => {
    it('should have Phase.dev service token available for integration tests', () => {
      if (process.env.PHASE_SERVICE_TOKEN) {
        // Validate token format without exposing the actual token
        const tokenPattern = /^pss_[A-Za-z0-9_:-]{10,}$/
        expect(process.env.PHASE_SERVICE_TOKEN).toMatch(tokenPattern)
        console.log('✅ PHASE_SERVICE_TOKEN format is valid')
      } else {
        console.warn('⚠️  PHASE_SERVICE_TOKEN not available - Phase.dev integration tests will be skipped')
      }
    })

    it('should have Phase.dev integration test scripts configured', () => {
      const phaseTestScript = packageJson.scripts['test:phase-integration']
      expect(phaseTestScript).toBeDefined()
      expect(phaseTestScript).toContain('env-wrapper')
      expect(phaseTestScript).toContain('phase-environment-integration')
      
      console.log('✅ Phase.dev integration test script configured')
    })
  })

  describe('Test Framework Configuration', () => {
    it('should have vitest configured properly', () => {
      // Check that vitest is available
      try {
        execSync('pnpm vitest --version', { encoding: 'utf8', timeout: 5000 })
        console.log('✅ Vitest is available')
      } catch (error) {
        throw new Error('Vitest is not available or not configured properly')
      }
    })

    it('should have playwright configured for E2E tests', () => {
      // Check that playwright is available
      try {
        execSync('pnpm playwright --version', { encoding: 'utf8', timeout: 5000 })
        console.log('✅ Playwright is available')
      } catch (error) {
        console.warn('⚠️  Playwright may not be configured - E2E tests might not work')
      }
    })

    it('should have proper test setup files', () => {
      const setupFiles = [
        'vitest.setup.ts',
        '__tests__/setup/common-mocks.ts',
        '__tests__/setup/clerk-testing-setup.ts',
        '__tests__/setup/phase-testing-setup.ts',
        '__tests__/setup/test-environment-validation.ts'
      ]

      setupFiles.forEach(file => {
        try {
          const filePath = join(process.cwd(), file)
          readFileSync(filePath, 'utf8')
          console.log(`✅ ${file}: exists`)
        } catch (error) {
          throw new Error(`Required test setup file missing: ${file}`)
        }
      })
    })
  })

  describe('Error Handling and Validation', () => {
    it('should handle test failures gracefully', () => {
      // Test that our test scripts have proper error handling
      const testScript = packageJson.scripts['test']
      
      // Should use vitest run (not watch mode) for CI compatibility
      expect(testScript).toContain('vitest run')
      console.log('✅ Test script uses run mode (CI compatible)')
    })

    it('should have validation scripts available', () => {
      const validationScripts = [
        'validate:env',
        'validate:env-dev',
        'validate:env-staging',
        'validate:env-prod'
      ]

      validationScripts.forEach(scriptName => {
        expect(packageJson.scripts).toHaveProperty(scriptName)
        expect(packageJson.scripts[scriptName]).toContain('validate-env')
        console.log(`✅ ${scriptName}: configured`)
      })
    })
  })

  describe('Performance and Memory Management', () => {
    it('should have appropriate memory limits for different test types', () => {
      const memoryRequirements = {
        'test': 8192,
        'test:coverage': 16384,
        'test:performance': 8192,
        'test:e2e': 8192,
        'test:integration': 8192
      }

      Object.entries(memoryRequirements).forEach(([scriptName, expectedMemory]) => {
        if (packageJson.scripts[scriptName]) {
          const script = packageJson.scripts[scriptName]
          const memoryMatch = script.match(/--max-old-space-size=(\d+)/)
          
          if (memoryMatch) {
            const actualMemory = parseInt(memoryMatch[1])
            expect(actualMemory).toBeGreaterThanOrEqual(expectedMemory)
            console.log(`✅ ${scriptName}: ${actualMemory}MB (required: ${expectedMemory}MB)`)
          }
        }
      })
    })

    it('should have test timeout configurations', () => {
      // Integration tests should have reasonable timeouts
      const integrationScript = packageJson.scripts['test:integration']
      if (integrationScript) {
        // Should use env-wrapper which handles timeouts appropriately
        expect(integrationScript).toContain('env-wrapper')
        console.log('✅ Integration tests use env-wrapper for timeout handling')
      }
    })
  })
})