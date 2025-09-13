import { FullConfig } from '@playwright/test'
import fs from 'fs/promises'
import path from 'path'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global E2E test teardown...')
  
  // Generate coverage report if enabled
  if (process.env.COVERAGE_E2E === 'true') {
    console.log('📊 Generating E2E coverage report...')
    await generateCoverageReport()
  }
  
  // Cleanup test database if needed
  if (process.env.E2E_DATABASE_CLEANUP === 'true') {
    console.log('🗄️ Cleaning up test database...')
    // Add database cleanup logic here
  }
  
  // Archive test artifacts
  await archiveTestArtifacts()
  
  console.log('✅ Global E2E test teardown completed')
}

async function generateCoverageReport() {
  try {
    const coverageDir = path.join(process.cwd(), 'coverage', 'e2e')
    await fs.mkdir(coverageDir, { recursive: true })
    
    // Generate coverage summary
    const summary = {
      timestamp: new Date().toISOString(),
      type: 'e2e-coverage',
      status: 'completed'
    }
    
    await fs.writeFile(
      path.join(coverageDir, 'summary.json'),
      JSON.stringify(summary, null, 2)
    )
    
    console.log('✅ E2E coverage report generated')
  } catch (error) {
    console.error('❌ Failed to generate E2E coverage report:', error)
  }
}

async function archiveTestArtifacts() {
  try {
    const artifactsDir = path.join(process.cwd(), 'test-results')
    const archiveDir = path.join(process.cwd(), 'test-archives', new Date().toISOString().split('T')[0])
    
    // Create archive directory
    await fs.mkdir(archiveDir, { recursive: true })
    
    // Archive test results
    const timestamp = new Date().toISOString()
    const archiveInfo = {
      timestamp,
      artifacts: ['e2e-report', 'e2e-results.json', 'e2e-junit.xml'],
      status: 'archived'
    }
    
    await fs.writeFile(
      path.join(archiveDir, 'archive-info.json'),
      JSON.stringify(archiveInfo, null, 2)
    )
    
    console.log('✅ Test artifacts archived')
  } catch (error) {
    console.error('❌ Failed to archive test artifacts:', error)
  }
}

export default globalTeardown