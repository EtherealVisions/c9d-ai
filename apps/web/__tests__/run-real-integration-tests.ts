#!/usr/bin/env tsx

/**
 * Real Integration Test Runner with Phase.dev Support
 * Runs both database and Clerk integration tests with Phase.dev configuration
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import path from 'path'

// Load environment variables from .env.local if it exists
function loadEnvFile(filePath: string) {
  if (existsSync(filePath)) {
    const envContent = readFileSync(filePath, 'utf8')
    const lines = envContent.split('\n')
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=')
          process.env[key] = value
        }
      }
    }
  }
}

// Load environment variables
loadEnvFile('.env.local')
loadEnvFile('../../.env.local') // Also check root directory

interface TestResult {
  name: string
  status: 'passed' | 'failed' | 'skipped'
  duration: number
  tests: number
  passed: number
  failed: number
  error?: string
}

interface TestConfig {
  name: string
  file: string
  requiredEnvVars: string[]
  description: string
}

const testConfigs: TestConfig[] = [
  {
    name: 'Database Integration',
    file: '__tests__/integration/real-database-integration.test.ts',
    requiredEnvVars: ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
    description: 'Tests actual Supabase database operations'
  },
  {
    name: 'Clerk Integration',
    file: '__tests__/integration/real-clerk-integration.test.ts',
    requiredEnvVars: ['CLERK_SECRET_KEY'],
    description: 'Tests actual Clerk authentication API'
  }
]

async function checkEnvironmentVariables(requiredVars: string[]): Promise<{ available: boolean; missing: string[]; source: string }> {
  let envVars: Record<string, string> = {}
  let source = 'local'
  
  try {
    // Try to load from Phase.dev first
    const { loadFromPhase, getPhaseConfig } = await import('@c9d/config')
    const phaseConfig = await getPhaseConfig()
    
    if (phaseConfig) {
      console.log('🔗 Checking Phase.dev configuration...')
      const result = await loadFromPhase(true)
      if (result.success) {
        envVars = result.variables
        source = 'Phase.dev'
      } else {
        throw new Error(result.error || 'Failed to load from Phase.dev')
      }
    } else {
      envVars = { ...process.env } as Record<string, string>
    }
  } catch (error) {
    console.warn('⚠️  Failed to load from Phase.dev, using local environment:', error)
    envVars = { ...process.env } as Record<string, string>
  }
  
  const missing = requiredVars.filter(varName => !envVars[varName])
  return {
    available: missing.length === 0,
    missing,
    source
  }
}

async function runTest(config: TestConfig): Promise<TestResult> {
  const startTime = Date.now()
  
  console.log(`\\n🧪 Running ${config.name} Tests...`)
  console.log(`📝 ${config.description}`)
  
  // Check environment variables
  const envCheck = await checkEnvironmentVariables(config.requiredEnvVars)
  
  if (!envCheck.available) {
    console.log(`⏭️  Skipping ${config.name} - Missing environment variables from ${envCheck.source}:`)
    envCheck.missing.forEach(varName => {
      console.log(`   - ${varName}`)
    })
    
    if (envCheck.source === 'Phase.dev') {
      console.log(`💡 Configure these variables in Phase.dev app "AI.C9d.Web"`)
    }
    
    return {
      name: config.name,
      status: 'skipped',
      duration: Date.now() - startTime,
      tests: 0,
      passed: 0,
      failed: 0,
      error: `Missing environment variables from ${envCheck.source}: ${envCheck.missing.join(', ')}`
    }
  } else {
    console.log(`✅ Found required environment variables from ${envCheck.source}`)
  }
  
  // Check if test file exists
  if (!existsSync(config.file)) {
    console.log(`❌ Test file not found: ${config.file}`)
    return {
      name: config.name,
      status: 'failed',
      duration: Date.now() - startTime,
      tests: 0,
      passed: 0,
      failed: 0,
      error: `Test file not found: ${config.file}`
    }
  }
  
  try {
    console.log(`🔄 Executing: npx vitest run ${config.file}`)
    
    const output = execSync(`npx vitest run ${config.file}`, {
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: process.cwd()
    })
    
    // Parse vitest output
    const testMatch = output.match(/Tests\\s+(\\d+)\\s+passed\\s+\\((\\d+)\\)/)
    const failedMatch = output.match(/(\\d+)\\s+failed/)
    const durationMatch = output.match(/Duration\\s+([\\d.]+)ms/)
    
    const tests = testMatch ? parseInt(testMatch[2]) : 0
    const passed = testMatch ? parseInt(testMatch[1]) : 0
    const failed = failedMatch ? parseInt(failedMatch[1]) : 0
    const duration = durationMatch ? parseFloat(durationMatch[1]) : Date.now() - startTime
    
    console.log(`✅ ${config.name} completed successfully`)
    console.log(`   Tests: ${tests}, Passed: ${passed}, Failed: ${failed}`)
    
    return {
      name: config.name,
      status: failed > 0 ? 'failed' : 'passed',
      duration,
      tests,
      passed,
      failed
    }
    
  } catch (error: any) {
    console.log(`❌ ${config.name} failed:`, error.message)
    
    // Try to parse error output for test counts
    const errorOutput = error.stdout || error.stderr || ''
    const testMatch = errorOutput.match(/Tests\\s+(\\d+)\\s+failed\\s+\\|\\s+(\\d+)\\s+passed\\s+\\((\\d+)\\)/)
    
    let tests = 0, passed = 0, failed = 0
    if (testMatch) {
      failed = parseInt(testMatch[1])
      passed = parseInt(testMatch[2])
      tests = parseInt(testMatch[3])
    }
    
    return {
      name: config.name,
      status: 'failed',
      duration: Date.now() - startTime,
      tests,
      passed,
      failed,
      error: error.message
    }
  }
}

function printSummary(results: TestResult[]) {
  console.log('\\n' + '='.repeat(80))
  console.log('🎯 REAL INTEGRATION TEST SUMMARY')
  console.log('='.repeat(80))
  
  const totalTests = results.reduce((sum, r) => sum + r.tests, 0)
  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0)
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0)
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)
  
  const passedSuites = results.filter(r => r.status === 'passed').length
  const failedSuites = results.filter(r => r.status === 'failed').length
  const skippedSuites = results.filter(r => r.status === 'skipped').length
  
  console.log(`\\n📊 Overall Results:`)
  console.log(`   Test Suites: ${passedSuites} passed, ${failedSuites} failed, ${skippedSuites} skipped`)
  console.log(`   Tests: ${totalPassed} passed, ${totalFailed} failed, ${totalTests} total`)
  console.log(`   Duration: ${totalDuration.toFixed(0)}ms`)
  
  console.log(`\\n📋 Detailed Results:`)
  results.forEach(result => {
    const statusIcon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏭️'
    console.log(`   ${statusIcon} ${result.name}: ${result.status.toUpperCase()}`)
    
    if (result.tests > 0) {
      console.log(`      Tests: ${result.passed}/${result.tests} passed (${result.duration.toFixed(0)}ms)`)
    }
    
    if (result.error) {
      console.log(`      Error: ${result.error}`)
    }
  })
  
  if (skippedSuites > 0) {
    console.log(`\\n💡 Configuration Help:`)
    console.log(`   To enable skipped tests, configure the following in Phase.dev app "AI.C9d.Web":`)
    
    results.filter(r => r.status === 'skipped').forEach(result => {
      const config = testConfigs.find(c => c.name === result.name)
      if (config) {
        console.log(`\\n   For ${result.name}:`)
        config.requiredEnvVars.forEach(varName => {
          console.log(`     ${varName}`)
        })
      }
    })
    
    console.log(`\\n   Phase.dev Configuration:`)
    console.log(`     1. Go to https://console.phase.dev`)
    console.log(`     2. Select app "AI.C9d.Web"`)
    console.log(`     3. Add the required environment variables`)
    console.log(`     4. Ensure PHASE_SERVICE_TOKEN is set locally`)
    
    console.log(`\\n   Alternative - Local .env.test.local file:`)
    console.log(`     # Database Integration`)
    console.log(`     NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"`)
    console.log(`     SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"`)
    console.log(`     `)
    console.log(`     # Clerk Integration`)
    console.log(`     CLERK_SECRET_KEY="your_clerk_secret_key"`)
  }
  
  console.log('\\n' + '='.repeat(80))
  
  const overallSuccess = failedSuites === 0
  if (overallSuccess) {
    console.log('🎉 ALL CONFIGURED TESTS PASSED!')
    if (skippedSuites > 0) {
      console.log(`   (${skippedSuites} test suite(s) skipped due to missing configuration)`)
    }
  } else {
    console.log('❌ SOME TESTS FAILED!')
  }
  
  return overallSuccess
}

async function main() {
  console.log('🚀 Starting Real Integration Test Suite with Phase.dev Support')
  console.log('=============================================================\\n')
  
  console.log('📋 Test Configuration:')
  
  // Check Phase.dev availability
  try {
    const { getPhaseConfig } = await import('@c9d/config')
    const phaseConfig = await getPhaseConfig()
    
    if (phaseConfig) {
      console.log(`✅ Phase.dev configured (app: ${phaseConfig.appName})`)
    } else {
      console.log('⚠️  Phase.dev not configured, using local environment only')
    }
  } catch (error) {
    console.log('⚠️  Phase.dev integration not available, using local environment only')
  }
  
  console.log('\\n📋 Available Tests:')
  for (const config of testConfigs) {
    const envCheck = await checkEnvironmentVariables(config.requiredEnvVars)
    const statusIcon = envCheck.available ? '✅' : '⚠️'
    console.log(`   ${statusIcon} ${config.name}: ${config.description}`)
    
    if (!envCheck.available) {
      console.log(`      Missing from ${envCheck.source}: ${envCheck.missing.join(', ')}`)
    }
  }
  
  const results: TestResult[] = []
  
  for (const config of testConfigs) {
    const result = await runTest(config)
    results.push(result)
  }
  
  const success = printSummary(results)
  
  // Exit with appropriate code
  process.exit(success ? 0 : 1)
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test runner failed:', error)
    process.exit(1)
  })
}

export { main as runRealIntegrationTests }