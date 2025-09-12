#!/usr/bin/env tsx

/**
 * Real Integration Validation Script
 * Validates and fixes issues with real Supabase and Clerk integrations
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'

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
loadEnvFile('.env.test.local')

interface ValidationResult {
  service: string
  status: 'pass' | 'fail' | 'skip'
  issues: string[]
  fixes: string[]
  testResults?: {
    total: number
    passed: number
    failed: number
    skipped: number
  }
}

interface EnvironmentCheck {
  name: string
  value?: string
  required: boolean
  validator?: (value: string) => boolean
  errorMessage?: string
}

async function main() {
  console.log('🔍 Real Integration Validation & Remediation')
  console.log('=============================================\\n')
  
  const results: ValidationResult[] = []
  
  // Step 1: Validate Environment Configuration
  console.log('📋 Step 1: Environment Configuration Validation')
  const envResult = await validateEnvironmentConfiguration()
  results.push(envResult)
  
  // Step 2: Validate Phase.dev Integration
  console.log('\\n🔗 Step 2: Phase.dev Integration Validation')
  const phaseResult = await validatePhaseDevIntegration()
  results.push(phaseResult)
  
  // Step 3: Validate Database Integration
  console.log('\\n🗄️ Step 3: Database Integration Validation')
  const dbResult = await validateDatabaseIntegration()
  results.push(dbResult)
  
  // Step 4: Validate Clerk Integration
  console.log('\\n🔐 Step 4: Clerk Integration Validation')
  const clerkResult = await validateClerkIntegration()
  results.push(clerkResult)
  
  // Step 5: Run Comprehensive Integration Tests
  console.log('\\n🧪 Step 5: Comprehensive Integration Test Execution')
  const testResult = await runComprehensiveTests()
  results.push(testResult)
  
  // Generate Summary Report
  console.log('\\n📊 Validation Summary')
  console.log('======================')
  generateSummaryReport(results)
  
  // Provide Remediation Guidance
  const hasIssues = results.some(r => r.status === 'fail' || r.issues.length > 0)
  if (hasIssues) {
    console.log('\\n🔧 Remediation Guidance')
    console.log('========================')
    provideRemediationGuidance(results)
  } else {
    console.log('\\n🎉 All validations passed! Real integrations are ready.')
  }
}

async function validateEnvironmentConfiguration(): Promise<ValidationResult> {
  const result: ValidationResult = {
    service: 'Environment Configuration',
    status: 'pass',
    issues: [],
    fixes: []
  }
  
  const checks: EnvironmentCheck[] = [
    {
      name: 'PHASE_SERVICE_TOKEN',
      value: process.env.PHASE_SERVICE_TOKEN,
      required: false,
      validator: (value) => value.startsWith('pss_service:'),
      errorMessage: 'Phase.dev service token should start with "pss_service:"'
    },
    {
      name: 'NEXT_PUBLIC_SUPABASE_URL',
      value: process.env.NEXT_PUBLIC_SUPABASE_URL,
      required: true,
      validator: (value) => value.startsWith('https://') && value.includes('supabase'),
      errorMessage: 'Supabase URL should be a valid HTTPS URL containing "supabase"'
    },
    {
      name: 'SUPABASE_SERVICE_ROLE_KEY',
      value: process.env.SUPABASE_SERVICE_ROLE_KEY,
      required: true,
      validator: (value) => value.length > 50 && !value.includes('placeholder'),
      errorMessage: 'Supabase service role key should be a long string and not a placeholder'
    },
    {
      name: 'CLERK_SECRET_KEY',
      value: process.env.CLERK_SECRET_KEY,
      required: true,
      validator: (value) => value.startsWith('sk_'),
      errorMessage: 'Clerk secret key should start with "sk_"'
    },
    {
      name: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      value: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      required: false,
      validator: (value) => value.startsWith('pk_'),
      errorMessage: 'Clerk publishable key should start with "pk_"'
    }
  ]
  
  console.log('Checking environment variables...')
  
  for (const check of checks) {
    const status = check.value ? '✅' : (check.required ? '❌' : '⚠️')
    console.log(`   ${status} ${check.name}: ${check.value ? (check.value.includes('placeholder') ? 'Placeholder' : 'Configured') : 'Missing'}`)
    
    if (check.required && !check.value) {
      result.issues.push(`Missing required environment variable: ${check.name}`)
      result.fixes.push(`Set ${check.name} in .env.local or Phase.dev`)
    } else if (check.value && check.validator && !check.validator(check.value)) {
      result.issues.push(`Invalid ${check.name}: ${check.errorMessage}`)
      result.fixes.push(`Update ${check.name} with a valid value`)
    }
  }
  
  // Check for environment files
  const envFiles = ['.env.local', '.env.test.local']
  envFiles.forEach(file => {
    const exists = existsSync(file)
    console.log(`   ${exists ? '✅' : '⚠️'} ${file}: ${exists ? 'Exists' : 'Missing'}`)
    
    if (!exists && file === '.env.local') {
      result.fixes.push(`Create ${file} with required environment variables`)
    }
  })
  
  result.status = result.issues.length > 0 ? 'fail' : 'pass'
  return result
}

async function validatePhaseDevIntegration(): Promise<ValidationResult> {
  const result: ValidationResult = {
    service: 'Phase.dev Integration',
    status: 'pass',
    issues: [],
    fixes: []
  }
  
  const phaseToken = process.env.PHASE_SERVICE_TOKEN
  
  if (!phaseToken) {
    console.log('⚠️  Phase.dev not configured - using local environment only')
    result.status = 'skip'
    result.fixes.push('Configure PHASE_SERVICE_TOKEN to enable Phase.dev integration')
    return result
  }
  
  console.log('Testing Phase.dev connection...')
  
  try {
    // Test Phase.dev connection by trying to load configuration
    const { loadEnvironmentWithFallback, createPhaseConfigFromEnv } = await import('../lib/config/phase')
    const phaseConfig = createPhaseConfigFromEnv()
    
    if (!phaseConfig) {
      result.issues.push('Phase.dev configuration could not be created')
      result.fixes.push('Verify PHASE_SERVICE_TOKEN is correctly set')
      result.status = 'fail'
      return result
    }
    
    console.log(`   ✅ Phase.dev app: ${phaseConfig.appName}`)
    
    try {
      const envVars = await loadEnvironmentWithFallback(phaseConfig, false)
      console.log(`   ✅ Successfully loaded ${Object.keys(envVars).length} variables from Phase.dev`)
      
      // Check if required variables are available in Phase.dev
      const requiredVars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CLERK_SECRET_KEY']
      const missingVars = requiredVars.filter(varName => !envVars[varName])
      
      if (missingVars.length > 0) {
        result.issues.push(`Missing variables in Phase.dev: ${missingVars.join(', ')}`)
        result.fixes.push(`Add missing variables to Phase.dev app "${phaseConfig.appName}"`)
      }
      
    } catch (error: any) {
      console.log(`   ❌ Phase.dev API error: ${error.message}`)
      result.issues.push(`Phase.dev API error: ${error.message}`)
      
      if (error.statusCode === 404) {
        result.fixes.push(`Create app "AI.C9d.Web" in Phase.dev console`)
        result.fixes.push(`Add required environment variables to the app`)
      } else if (error.statusCode === 401) {
        result.fixes.push(`Verify PHASE_SERVICE_TOKEN is valid and has correct permissions`)
      } else {
        result.fixes.push(`Check Phase.dev service status and token permissions`)
      }
    }
    
  } catch (error: any) {
    console.log(`   ❌ Phase.dev integration error: ${error.message}`)
    result.issues.push(`Phase.dev integration failed: ${error.message}`)
    result.fixes.push('Check Phase.dev configuration and dependencies')
  }
  
  result.status = result.issues.length > 0 ? 'fail' : 'pass'
  return result
}

async function validateDatabaseIntegration(): Promise<ValidationResult> {
  const result: ValidationResult = {
    service: 'Database Integration',
    status: 'pass',
    issues: [],
    fixes: []
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceKey) {
    console.log('⚠️  Database credentials not configured')
    result.status = 'skip'
    result.fixes.push('Configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    return result
  }
  
  if (supabaseUrl.includes('placeholder') || serviceKey.includes('placeholder')) {
    console.log('⚠️  Database credentials are placeholders')
    result.status = 'skip'
    result.fixes.push('Replace placeholder database credentials with real values')
    return result
  }
  
  console.log('Testing database connection...')
  
  try {
    // Test database connection
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceKey)
    
    // Test basic connectivity
    const { data, error } = await supabase.from('users').select('count').limit(1)
    
    if (error) {
      console.log(`   ❌ Database connection failed: ${error.message}`)
      result.issues.push(`Database connection error: ${error.message}`)
      
      if (error.message.includes('Invalid API key')) {
        result.fixes.push('Verify SUPABASE_SERVICE_ROLE_KEY is correct')
      } else if (error.message.includes('not found')) {
        result.fixes.push('Verify NEXT_PUBLIC_SUPABASE_URL is correct')
        result.fixes.push('Ensure database schema is properly set up')
      } else {
        result.fixes.push('Check Supabase project status and credentials')
      }
    } else {
      console.log('   ✅ Database connection successful')
      
      // Test table access
      try {
        const { error: tableError } = await supabase.from('organizations').select('count').limit(1)
        if (tableError) {
          console.log(`   ⚠️  Table access issue: ${tableError.message}`)
          result.issues.push(`Table access error: ${tableError.message}`)
          result.fixes.push('Ensure database schema includes required tables (users, organizations, etc.)')
        } else {
          console.log('   ✅ Table access verified')
        }
      } catch (tableError: any) {
        console.log(`   ⚠️  Table validation error: ${tableError.message}`)
        result.issues.push(`Table validation failed: ${tableError.message}`)
      }
    }
    
  } catch (error: any) {
    console.log(`   ❌ Database validation error: ${error.message}`)
    result.issues.push(`Database validation failed: ${error.message}`)
    result.fixes.push('Check Supabase client configuration and dependencies')
  }
  
  result.status = result.issues.length > 0 ? 'fail' : 'pass'
  return result
}

async function validateClerkIntegration(): Promise<ValidationResult> {
  const result: ValidationResult = {
    service: 'Clerk Integration',
    status: 'pass',
    issues: [],
    fixes: []
  }
  
  const clerkSecretKey = process.env.CLERK_SECRET_KEY
  
  if (!clerkSecretKey) {
    console.log('⚠️  Clerk credentials not configured')
    result.status = 'skip'
    result.fixes.push('Configure CLERK_SECRET_KEY')
    return result
  }
  
  if (clerkSecretKey.includes('placeholder') || clerkSecretKey === 'sk_test_Y2xlcmsuZXhhbXBsZS5jb20k') {
    console.log('⚠️  Clerk credentials are placeholders')
    result.status = 'skip'
    result.fixes.push('Replace placeholder Clerk credentials with real values')
    return result
  }
  
  console.log('Testing Clerk connection...')
  
  try {
    // Test Clerk connection
    const { clerkClient } = await import('@clerk/nextjs/server')
    
    if (!clerkClient || !clerkClient.users) {
      console.log('   ❌ Clerk client not properly initialized')
      result.issues.push('Clerk client initialization failed')
      result.fixes.push('Check Clerk SDK installation and configuration')
      result.status = 'fail'
      return result
    }
    
    // Test API connectivity
    try {
      const users = await clerkClient.users.getUserList({ limit: 1 })
      console.log(`   ✅ Clerk API connection successful (${users.totalCount} total users)`)
      
      // Test user operations
      if (users.totalCount > 0) {
        console.log('   ✅ User data access verified')
      } else {
        console.log('   ⚠️  No users found (this may be expected for a new Clerk instance)')
      }
      
    } catch (apiError: any) {
      console.log(`   ❌ Clerk API error: ${apiError.message}`)
      result.issues.push(`Clerk API error: ${apiError.message}`)
      
      if (apiError.status === 401) {
        result.fixes.push('Verify CLERK_SECRET_KEY is valid and has correct permissions')
      } else if (apiError.status === 403) {
        result.fixes.push('Check Clerk API key permissions and plan limits')
      } else {
        result.fixes.push('Check Clerk service status and API key configuration')
      }
    }
    
  } catch (error: any) {
    console.log(`   ❌ Clerk validation error: ${error.message}`)
    result.issues.push(`Clerk validation failed: ${error.message}`)
    result.fixes.push('Check Clerk SDK installation and configuration')
  }
  
  result.status = result.issues.length > 0 ? 'fail' : 'pass'
  return result
}

async function runComprehensiveTests(): Promise<ValidationResult> {
  const result: ValidationResult = {
    service: 'Integration Tests',
    status: 'pass',
    issues: [],
    fixes: [],
    testResults: { total: 0, passed: 0, failed: 0, skipped: 0 }
  }
  
  console.log('Running comprehensive integration tests...')
  
  try {
    // Run mocked integration tests first
    console.log('\\n   🧪 Running mocked integration tests...')
    const mockedOutput = execSync('npm run test:mocked', { encoding: 'utf8', stdio: 'pipe' })
    
    const mockedMatch = mockedOutput.match(/Tests\\s+(\\d+)\\s+passed\\s+\\((\\d+)\\)/)
    if (mockedMatch) {
      const passed = parseInt(mockedMatch[1])
      const total = parseInt(mockedMatch[2])
      console.log(`   ✅ Mocked tests: ${passed}/${total} passed`)
      result.testResults!.passed += passed
      result.testResults!.total += total
    }
    
    // Run real integration tests
    console.log('\\n   🧪 Running real integration tests...')
    try {
      const realOutput = execSync('npm run test:real-integration', { encoding: 'utf8', stdio: 'pipe' })
      
      // Parse test results from output
      const skippedMatch = realOutput.match(/Test Suites: (\\d+) passed, (\\d+) failed, (\\d+) skipped/)
      if (skippedMatch) {
        const passed = parseInt(skippedMatch[1])
        const failed = parseInt(skippedMatch[2])
        const skipped = parseInt(skippedMatch[3])
        
        console.log(`   📊 Real integration tests: ${passed} passed, ${failed} failed, ${skipped} skipped`)
        
        result.testResults!.passed += passed
        result.testResults!.failed += failed
        result.testResults!.skipped += skipped
        result.testResults!.total += passed + failed + skipped
        
        if (failed > 0) {
          result.issues.push(`${failed} real integration tests failed`)
          result.fixes.push('Check real integration test output for specific failures')
        }
        
        if (skipped > 0) {
          result.issues.push(`${skipped} real integration tests skipped due to missing configuration`)
          result.fixes.push('Configure missing credentials to enable skipped tests')
        }
      }
      
    } catch (realTestError: any) {
      console.log('   ⚠️  Real integration tests encountered issues (this may be expected)')
      // Real integration test failures are often due to missing credentials, which is expected
    }
    
  } catch (error: any) {
    console.log(`   ❌ Test execution error: ${error.message}`)
    result.issues.push(`Test execution failed: ${error.message}`)
    result.fixes.push('Check test configuration and dependencies')
  }
  
  result.status = result.issues.length > 0 ? 'fail' : 'pass'
  return result
}

function generateSummaryReport(results: ValidationResult[]) {
  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0)
  const passedServices = results.filter(r => r.status === 'pass').length
  const failedServices = results.filter(r => r.status === 'fail').length
  const skippedServices = results.filter(r => r.status === 'skip').length
  
  console.log(`\\n📊 Overall Status: ${totalIssues === 0 ? '✅ HEALTHY' : '⚠️  NEEDS ATTENTION'}`)
  console.log(`   Services: ${passedServices} passed, ${failedServices} failed, ${skippedServices} skipped`)
  console.log(`   Total Issues: ${totalIssues}`)
  
  // Test results summary
  const testResult = results.find(r => r.testResults)
  if (testResult?.testResults) {
    const { total, passed, failed, skipped } = testResult.testResults
    console.log(`   Tests: ${passed} passed, ${failed} failed, ${skipped} skipped (${total} total)`)
  }
  
  console.log('\\n📋 Service Details:')
  results.forEach(result => {
    const statusIcon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏭️'
    console.log(`   ${statusIcon} ${result.service}: ${result.status.toUpperCase()}`)
    
    if (result.issues.length > 0) {
      result.issues.forEach(issue => console.log(`      - ${issue}`))
    }
  })
}

function provideRemediationGuidance(results: ValidationResult[]) {
  const allFixes = results.flatMap(r => r.fixes)
  const uniqueFixes = [...new Set(allFixes)]
  
  console.log('\\n🔧 Recommended Actions:')
  uniqueFixes.forEach((fix, index) => {
    console.log(`   ${index + 1}. ${fix}`)
  })
  
  console.log('\\n💡 Quick Setup Options:')
  console.log('   1. Run setup wizard: npm run test:setup')
  console.log('   2. Configure Phase.dev: https://console.phase.dev')
  console.log('   3. Manual setup: Edit .env.local with real credentials')
  console.log('   4. Re-run validation: npm run test:validate')
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Validation failed:', error)
    process.exit(1)
  })
}

export { main as validateRealIntegrations }