#!/usr/bin/env tsx

/**
 * Setup Script for Real Integration Tests
 * Helps configure credentials for testing against real Supabase and Clerk services
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { execSync } from 'child_process'
import readline from 'readline'

interface TestCredentials {
  supabaseUrl?: string
  supabaseServiceKey?: string
  clerkSecretKey?: string
  clerkPublishableKey?: string
  testUserEmail?: string
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

async function main() {
  console.log('🚀 Real Integration Test Setup')
  console.log('=====================================\\n')
  
  console.log('This script will help you configure credentials for testing against real services.')
  console.log('You can choose to:')
  console.log('1. Configure Phase.dev (recommended for production)')
  console.log('2. Set up local test credentials (for development)')
  console.log('3. Check current configuration\\n')
  
  const choice = await question('What would you like to do? (1/2/3): ')
  
  switch (choice) {
    case '1':
      await setupPhaseDevConfiguration()
      break
    case '2':
      await setupLocalCredentials()
      break
    case '3':
      await checkCurrentConfiguration()
      break
    default:
      console.log('Invalid choice. Exiting.')
      break
  }
  
  rl.close()
}

async function setupPhaseDevConfiguration() {
  console.log('\\n📋 Phase.dev Configuration Setup')
  console.log('==================================\\n')
  
  console.log('To configure Phase.dev for real integration tests:')
  console.log('\\n1. Go to https://console.phase.dev')
  console.log('2. Select or create app "AI.C9d.Web"')
  console.log('3. Add the following environment variables:\\n')
  
  console.log('   Required for Database Integration:')
  console.log('   - NEXT_PUBLIC_SUPABASE_URL')
  console.log('   - SUPABASE_SERVICE_ROLE_KEY\\n')
  
  console.log('   Required for Clerk Integration:')
  console.log('   - CLERK_SECRET_KEY')
  console.log('   - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY\\n')
  
  console.log('   Optional:')
  console.log('   - TEST_USER_EMAIL (default: integration-test@example.com)\\n')
  
  console.log('4. Ensure PHASE_SERVICE_TOKEN is set in your .env.local file')
  console.log('5. Run: npm run test:real-integration\\n')
  
  const testNow = await question('Would you like to test the Phase.dev connection now? (y/n): ')
  
  if (testNow.toLowerCase() === 'y') {
    console.log('\\n🔄 Testing Phase.dev connection...')
    try {
      execSync('npm run test:real-integration', { stdio: 'inherit', cwd: process.cwd() })
    } catch (error) {
      console.log('\\n⚠️  Phase.dev test completed. Check the output above for configuration status.')
    }
  }
}

async function setupLocalCredentials() {
  console.log('\\n🔧 Local Credentials Setup')
  console.log('===========================\\n')
  
  const credentials: TestCredentials = {}
  
  console.log('Please provide your test service credentials:\\n')
  
  // Supabase Configuration
  console.log('📊 Supabase Database Configuration:')
  credentials.supabaseUrl = await question('Supabase URL (https://your-project.supabase.co): ')
  credentials.supabaseServiceKey = await question('Supabase Service Role Key: ')
  
  console.log('\\n🔐 Clerk Authentication Configuration:')
  credentials.clerkSecretKey = await question('Clerk Secret Key (sk_test_...): ')
  credentials.clerkPublishableKey = await question('Clerk Publishable Key (pk_test_...): ')
  
  console.log('\\n📧 Test Configuration:')
  credentials.testUserEmail = await question('Test User Email (default: integration-test@example.com): ') || 'integration-test@example.com'
  
  // Validate credentials
  const validation = validateCredentials(credentials)
  if (!validation.valid) {
    console.log('\\n❌ Invalid credentials provided:')
    validation.errors.forEach(error => console.log(`   - ${error}`))
    return
  }
  
  // Write to .env.test.local
  const envContent = generateEnvContent(credentials)
  writeFileSync('.env.test.local', envContent)
  
  console.log('\\n✅ Credentials saved to .env.test.local')
  console.log('\\n🧪 Running integration tests...')
  
  try {
    execSync('npm run test:real-integration', { stdio: 'inherit', cwd: process.cwd() })
  } catch (error) {
    console.log('\\n⚠️  Integration tests completed. Check the output above for results.')
  }
}

async function checkCurrentConfiguration() {
  console.log('\\n📋 Current Configuration Status')
  console.log('================================\\n')
  
  // Check Phase.dev configuration
  const phaseToken = process.env.PHASE_SERVICE_TOKEN
  console.log(`Phase.dev Service Token: ${phaseToken ? '✅ Configured' : '❌ Missing'}`)
  
  // Check local environment files
  const envLocalExists = existsSync('.env.local')
  const envTestExists = existsSync('.env.test.local')
  
  console.log(`Local .env.local file: ${envLocalExists ? '✅ Exists' : '❌ Missing'}`)
  console.log(`Test .env.test.local file: ${envTestExists ? '✅ Exists' : '❌ Missing'}`)
  
  // Check required environment variables
  console.log('\\n📊 Required Environment Variables:')
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'CLERK_SECRET_KEY',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'
  ]
  
  requiredVars.forEach(varName => {
    const value = process.env[varName]
    const status = value ? (value.includes('placeholder') ? '⚠️  Placeholder' : '✅ Configured') : '❌ Missing'
    console.log(`   ${varName}: ${status}`)
  })
  
  console.log('\\n🧪 Running test to check actual connectivity...')
  
  try {
    execSync('npm run test:real-integration', { stdio: 'inherit', cwd: process.cwd() })
  } catch (error) {
    console.log('\\n⚠️  Configuration check completed. See output above for details.')
  }
}

function validateCredentials(credentials: TestCredentials): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!credentials.supabaseUrl || !credentials.supabaseUrl.startsWith('https://')) {
    errors.push('Supabase URL must be a valid HTTPS URL')
  }
  
  if (!credentials.supabaseServiceKey || credentials.supabaseServiceKey.length < 50) {
    errors.push('Supabase Service Role Key appears to be invalid (too short)')
  }
  
  if (!credentials.clerkSecretKey || !credentials.clerkSecretKey.startsWith('sk_')) {
    errors.push('Clerk Secret Key must start with "sk_"')
  }
  
  if (!credentials.clerkPublishableKey || !credentials.clerkPublishableKey.startsWith('pk_')) {
    errors.push('Clerk Publishable Key must start with "pk_"')
  }
  
  if (!credentials.testUserEmail || !credentials.testUserEmail.includes('@')) {
    errors.push('Test User Email must be a valid email address')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

function generateEnvContent(credentials: TestCredentials): string {
  return `# Test Environment Configuration for Real Integration Tests
# Generated by setup-real-integration-tests.ts
# DO NOT commit this file to version control

# Phase.dev Service Token
PHASE_SERVICE_TOKEN=${process.env.PHASE_SERVICE_TOKEN || ''}

# Database Configuration (Supabase)
NEXT_PUBLIC_SUPABASE_URL=${credentials.supabaseUrl}
SUPABASE_SERVICE_ROLE_KEY=${credentials.supabaseServiceKey}
TEST_DATABASE_URL=${credentials.supabaseUrl}
TEST_SUPABASE_SERVICE_ROLE_KEY=${credentials.supabaseServiceKey}

# Clerk Authentication Configuration
CLERK_SECRET_KEY=${credentials.clerkSecretKey}
TEST_CLERK_SECRET_KEY=${credentials.clerkSecretKey}
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${credentials.clerkPublishableKey}

# Test User Configuration
TEST_USER_EMAIL=${credentials.testUserEmail}

# Additional Test Configuration
NODE_ENV=test
`
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  })
}

export { main as setupRealIntegrationTests }