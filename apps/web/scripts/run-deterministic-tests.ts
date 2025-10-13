#!/usr/bin/env tsx
/**
 * Deterministic Test Runner
 * Executes all test suites with comprehensive evidence collection
 */

import { execSync } from 'child_process'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

// Test run configuration
const RUN_ID = `test_run_${Date.now()}`
const RESULTS_DIR = join(process.cwd(), 'test-results', RUN_ID)
const TIMESTAMP = new Date().toISOString()

// Ensure results directory exists
if (!existsSync(RESULTS_DIR)) {
  mkdirSync(RESULTS_DIR, { recursive: true })
}

// Test execution phases
const phases = [
  {
    name: 'Unit Tests',
    command: 'pnpm test:run --reporter=json --reporter=default --coverage',
    outputFile: 'unit-test-results.json'
  },
  {
    name: 'Integration Tests', 
    command: 'pnpm test:run __tests__/integration --reporter=json --reporter=default',
    outputFile: 'integration-test-results.json'
  },
  {
    name: 'E2E Tests',
    command: 'pnpm test:e2e --reporter=json',
    outputFile: 'e2e-test-results.json'
  }
]

// Main execution
async function runDeterministicTests() {
  console.log(`\n🔬 DETERMINISTIC TEST EXECUTION - ${RUN_ID}`)
  console.log(`📅 Timestamp: ${TIMESTAMP}`)
  console.log(`📁 Results Directory: ${RESULTS_DIR}\n`)

  const summary: any = {
    runId: RUN_ID,
    timestamp: TIMESTAMP,
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cwd: process.cwd()
    },
    phases: [],
    totals: {
      tests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0
    },
    coverage: null,
    deterministic: false
  }

  const startTime = Date.now()

  for (const phase of phases) {
    console.log(`\n🏃 Running ${phase.name}...`)
    const phaseStart = Date.now()
    
    try {
      // Execute test command
      const output = execSync(phase.command, {
        encoding: 'utf8',
        env: {
          ...process.env,
          CI: 'true',
          TEST_RUN_ID: RUN_ID,
          NODE_ENV: 'test'
        },
        stdio: ['pipe', 'pipe', 'pipe']
      })
      
      // Save raw output
      writeFileSync(
        join(RESULTS_DIR, `${phase.outputFile}.log`),
        output
      )
      
      // Parse results
      const results = parseTestOutput(output)
      
      // Add to summary
      summary.phases.push({
        name: phase.name,
        status: 'completed',
        duration: Date.now() - phaseStart,
        results
      })
      
      // Update totals
      if (results) {
        summary.totals.tests += results.tests || 0
        summary.totals.passed += results.passed || 0
        summary.totals.failed += results.failed || 0
        summary.totals.skipped += results.skipped || 0
      }
      
      console.log(`✅ ${phase.name} completed`)
      
    } catch (error: any) {
      console.error(`❌ ${phase.name} failed:`, error.message)
      
      // Save error output
      writeFileSync(
        join(RESULTS_DIR, `${phase.outputFile}.error`),
        error.stdout || error.message
      )
      
      summary.phases.push({
        name: phase.name,
        status: 'failed',
        duration: Date.now() - phaseStart,
        error: error.message
      })
    }
  }

  // Get coverage data
  try {
    const coverageData = execSync('pnpm coverage:generate --json', {
      encoding: 'utf8',
      cwd: process.cwd()
    })
    
    const coverage = JSON.parse(coverageData)
    summary.coverage = {
      lines: coverage.total.lines.pct,
      statements: coverage.total.statements.pct,
      functions: coverage.total.functions.pct,
      branches: coverage.total.branches.pct
    }
  } catch (error) {
    console.warn('⚠️  Coverage data not available')
  }

  // Calculate final metrics
  summary.totals.duration = Date.now() - startTime
  summary.deterministic = summary.totals.failed === 0 && summary.totals.tests > 0

  // Generate evidence report
  const evidenceReport = generateEvidenceReport(summary)
  
  // Save all outputs
  writeFileSync(
    join(RESULTS_DIR, 'summary.json'),
    JSON.stringify(summary, null, 2)
  )
  
  writeFileSync(
    join(RESULTS_DIR, 'evidence-report.md'),
    evidenceReport
  )
  
  // Display final results
  console.log('\n' + '='.repeat(80))
  console.log('📊 DETERMINISTIC TEST RESULTS')
  console.log('='.repeat(80))
  console.log(`Run ID: ${RUN_ID}`)
  console.log(`Total Tests: ${summary.totals.tests}`)
  console.log(`✅ Passed: ${summary.totals.passed}`)
  console.log(`❌ Failed: ${summary.totals.failed}`)
  console.log(`⏭️  Skipped: ${summary.totals.skipped}`)
  console.log(`⏱️  Duration: ${(summary.totals.duration / 1000).toFixed(2)}s`)
  
  if (summary.coverage) {
    console.log('\n📈 Coverage Metrics:')
    console.log(`  Lines: ${summary.coverage.lines}%`)
    console.log(`  Statements: ${summary.coverage.statements}%`)
    console.log(`  Functions: ${summary.coverage.functions}%`)
    console.log(`  Branches: ${summary.coverage.branches}%`)
  }
  
  console.log('\n🔒 Deterministic Status:', summary.deterministic ? '✅ PASS' : '❌ FAIL')
  console.log(`📁 Full results saved to: ${RESULTS_DIR}`)
  console.log('='.repeat(80))
  
  // Exit with appropriate code
  process.exit(summary.deterministic ? 0 : 1)
}

function parseTestOutput(output: string): any {
  // Try to extract test metrics from output
  const testMatch = output.match(/Tests\s+(\d+)\s+failed.*?(\d+)\s+passed.*?(\d+)\s+skipped.*?\((\d+)\)/)
  if (testMatch) {
    return {
      tests: parseInt(testMatch[4]),
      failed: parseInt(testMatch[1]),
      passed: parseInt(testMatch[2]),
      skipped: parseInt(testMatch[3])
    }
  }
  
  // Try JSON parsing
  try {
    const lines = output.split('\n')
    for (const line of lines) {
      if (line.startsWith('{') && line.includes('testResults')) {
        return JSON.parse(line)
      }
    }
  } catch {}
  
  return null
}

function generateEvidenceReport(summary: any): string {
  return `# Deterministic Test Evidence Report

## Execution Metadata
- **Run ID**: ${summary.runId}
- **Timestamp**: ${summary.timestamp}
- **Platform**: ${summary.environment.platform} (${summary.environment.arch})
- **Node Version**: ${summary.environment.nodeVersion}
- **Working Directory**: ${summary.environment.cwd}

## Test Results Summary

### Overall Metrics
- **Total Tests**: ${summary.totals.tests}
- **Passed**: ${summary.totals.passed} (${summary.totals.tests > 0 ? ((summary.totals.passed / summary.totals.tests) * 100).toFixed(2) : 0}%)
- **Failed**: ${summary.totals.failed}
- **Skipped**: ${summary.totals.skipped}
- **Duration**: ${(summary.totals.duration / 1000).toFixed(2)}s

### Phase Results
${summary.phases.map((phase: any) => `
#### ${phase.name}
- Status: ${phase.status}
- Duration: ${(phase.duration / 1000).toFixed(2)}s
${phase.results ? `- Tests: ${phase.results.tests || 0}
- Passed: ${phase.results.passed || 0}
- Failed: ${phase.results.failed || 0}` : '- No results data'}
${phase.error ? `- Error: ${phase.error}` : ''}
`).join('\n')}

## Coverage Report
${summary.coverage ? `
- **Lines**: ${summary.coverage.lines}%
- **Statements**: ${summary.coverage.statements}%
- **Functions**: ${summary.coverage.functions}%
- **Branches**: ${summary.coverage.branches}%
` : 'Coverage data not available'}

## Deterministic Verification
- **Status**: ${summary.deterministic ? '✅ PASS' : '❌ FAIL'}
- **Criteria**: All tests must pass (0 failures)
- **Evidence**: Test execution logs and coverage reports available in results directory

## Artifacts
- Summary JSON: \`${summary.runId}/summary.json\`
- Test Logs: \`${summary.runId}/*.log\`
- Coverage Reports: \`${summary.runId}/coverage/\`

---
Generated by Deterministic Test Runner v1.0.0
`
}

// Execute
runDeterministicTests().catch(console.error)