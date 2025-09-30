#!/usr/bin/env node
/**
 * Test script to verify CLI tools are working correctly
 */

const { execSync } = require('child_process')

console.log('🧪 Testing CLI Tools Integration...')
console.log()

const tests = [
  {
    name: 'env-wrapper help',
    command: 'pnpm env-wrapper --help',
    expectSuccess: true
  },
  {
    name: 'env-wrapper dry-run',
    command: 'pnpm env-wrapper --dry-run echo "test"',
    expectSuccess: true
  },
  {
    name: 'validate-env help',
    command: 'pnpm validate-env --help',
    expectSuccess: true
  },
  {
    name: 'validate-env status',
    command: 'pnpm validate-env status --json',
    expectSuccess: true
  },
  {
    name: 'validate-config help',
    command: 'pnpm validate-config --help',
    expectSuccess: true
  },
  {
    name: 'validate-config list',
    command: 'pnpm validate-config list --json',
    expectSuccess: true
  },
  {
    name: 'vercel-phase-prebuild help',
    command: 'pnpm vercel-phase-prebuild --help',
    expectSuccess: true
  },
  {
    name: 'vercel-phase-prebuild dry-run',
    command: 'pnpm vercel-phase-prebuild --dry-run',
    expectSuccess: true
  },
  {
    name: 'env-wrapper invalid option (should fail)',
    command: 'pnpm env-wrapper --invalid-option echo "test"',
    expectSuccess: false
  },
  {
    name: 'validate-env invalid option (should fail)',
    command: 'pnpm validate-env --invalid-option',
    expectSuccess: false
  }
]

let passed = 0
let failed = 0

for (const test of tests) {
  try {
    console.log(`Testing: ${test.name}`)
    
    const result = execSync(test.command, { 
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 30000
    })
    
    if (test.expectSuccess) {
      console.log(`✅ ${test.name} - PASSED`)
      passed++
    } else {
      console.log(`❌ ${test.name} - FAILED (expected failure but succeeded)`)
      failed++
    }
  } catch (error) {
    if (!test.expectSuccess) {
      console.log(`✅ ${test.name} - PASSED (expected failure)`)
      passed++
    } else {
      console.log(`❌ ${test.name} - FAILED`)
      console.log(`   Error: ${error.message}`)
      failed++
    }
  }
}

console.log()
console.log('📊 Test Results:')
console.log(`  ✅ Passed: ${passed}`)
console.log(`  ❌ Failed: ${failed}`)
console.log(`  📁 Total: ${tests.length}`)

if (failed === 0) {
  console.log()
  console.log('🎉 All CLI tools are working correctly!')
  process.exit(0)
} else {
  console.log()
  console.log('💥 Some CLI tools failed testing')
  process.exit(1)
}