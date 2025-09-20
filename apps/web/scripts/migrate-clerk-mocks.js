#!/usr/bin/env node

/**
 * Migrate Custom Clerk Mocks to Official Testing Utilities
 * 
 * This script identifies and helps migrate test files that use custom Clerk mocking
 * to use the official @clerk/testing utilities and global setup.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

console.log('🔄 Migrating Custom Clerk Mocks to Official Testing Utilities...')

// Find all test files with custom Clerk mocking
function findCustomClerkMocks() {
  try {
    const result = execSync('find . -name "*.test.ts" -o -name "*.test.tsx" | xargs grep -l "vi\\.mock.*@clerk" | grep -v setup', {
      encoding: 'utf8',
      cwd: process.cwd()
    })
    
    return result.trim().split('\n').filter(file => file.length > 0)
  } catch (error) {
    return []
  }
}

// Analyze a test file for Clerk mocking patterns
function analyzeTestFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    
    const analysis = {
      hasCustomClerkMock: content.includes('vi.mock(\'@clerk/nextjs\''),
      hasUseSignIn: content.includes('useSignIn'),
      hasUseAuth: content.includes('useAuth'),
      hasUseUser: content.includes('useUser'),
      hasUseSignUp: content.includes('useSignUp'),
      mockPatterns: []
    }
    
    // Extract mock patterns
    const mockMatches = content.match(/vi\.mock\('@clerk\/nextjs'[\s\S]*?\}\)\)/g)
    if (mockMatches) {
      analysis.mockPatterns = mockMatches
    }
    
    return analysis
  } catch (error) {
    return null
  }
}

// Generate migration instructions for a file
function generateMigrationInstructions(filePath, analysis) {
  const instructions = []
  
  instructions.push(`\n📁 File: ${filePath}`)
  instructions.push('🔧 Migration Steps:')
  
  if (analysis.hasCustomClerkMock) {
    instructions.push('  1. Remove custom vi.mock(\'@clerk/nextjs\') block')
    instructions.push('  2. Remove any custom mock setup in beforeEach/beforeAll')
    instructions.push('  3. Components will automatically use global Clerk mocks')
  }
  
  if (analysis.hasUseSignIn || analysis.hasUseAuth || analysis.hasUseUser || analysis.hasUseSignUp) {
    instructions.push('  4. Verify components render correctly with global mocks')
    instructions.push('  5. Update test selectors to use data-testid if needed')
  }
  
  instructions.push('  6. Test should work with global Clerk setup automatically')
  
  return instructions
}

// Main migration process
function runMigration() {
  console.log('🔍 Scanning for custom Clerk mocks...')
  
  const filesWithCustomMocks = findCustomClerkMocks()
  
  if (filesWithCustomMocks.length === 0) {
    console.log('✅ No custom Clerk mocks found! All tests use official utilities.')
    return
  }
  
  console.log(`\n📊 Found ${filesWithCustomMocks.length} files with custom Clerk mocking:`)
  
  const migrationPlan = []
  
  filesWithCustomMocks.forEach(filePath => {
    const analysis = analyzeTestFile(filePath)
    if (analysis) {
      const instructions = generateMigrationInstructions(filePath, analysis)
      migrationPlan.push({
        file: filePath,
        analysis,
        instructions
      })
    }
  })
  
  // Generate migration report
  console.log('\n📋 Migration Plan:')
  console.log('==================')
  
  migrationPlan.forEach(item => {
    item.instructions.forEach(instruction => {
      console.log(instruction)
    })
  })
  
  // Generate summary
  console.log('\n📈 Migration Summary:')
  console.log('====================')
  console.log(`Total files to migrate: ${migrationPlan.length}`)
  console.log(`Files with useSignIn: ${migrationPlan.filter(item => item.analysis.hasUseSignIn).length}`)
  console.log(`Files with useAuth: ${migrationPlan.filter(item => item.analysis.hasUseAuth).length}`)
  console.log(`Files with useUser: ${migrationPlan.filter(item => item.analysis.hasUUser).length}`)
  
  // Generate automated fix script
  generateAutomatedFixScript(migrationPlan)
  
  console.log('\n🎯 Next Steps:')
  console.log('1. Review the migration plan above')
  console.log('2. Run: node scripts/auto-fix-clerk-mocks.js (automated fixes)')
  console.log('3. Manually verify test functionality')
  console.log('4. Run: ../../scripts/validate-steering-compliance.sh')
  console.log('\n💡 Key Points:')
  console.log('- Global Clerk mocks are already configured in vitest.setup.ts')
  console.log('- Components will automatically use global mocks')
  console.log('- No need for individual test file mocking')
  console.log('- Focus on testing behavior, not mock setup')
}

// Generate automated fix script
function generateAutomatedFixScript(migrationPlan) {
  const fixScript = `#!/usr/bin/env node

/**
 * Automated Clerk Mock Migration
 * Removes custom Clerk mocks from test files
 */

const fs = require('fs')

console.log('🔧 Applying automated Clerk mock fixes...')

const filesToFix = ${JSON.stringify(migrationPlan.map(item => item.file), null, 2)}

filesToFix.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    
    // Remove vi.mock('@clerk/nextjs') blocks
    content = content.replace(/vi\\.mock\\('@clerk\\/nextjs'[\\s\\S]*?\\}\\)\\)/g, '')
    
    // Remove empty lines left by mock removal
    content = content.replace(/\\n\\n\\n+/g, '\\n\\n')
    
    // Remove mock-related imports if they're no longer needed
    if (!content.includes('vi.mock(') && !content.includes('vi.fn(')) {
      content = content.replace(/, vi(?=\\s*\\})/g, '')
      content = content.replace(/vi,\\s*/g, '')
      content = content.replace(/,\\s*vi(?=\\s*\\})/g, '')
    }
    
    fs.writeFileSync(filePath, content)
    console.log(\`✅ Fixed: \${filePath}\`)
    
  } catch (error) {
    console.log(\`❌ Error fixing \${filePath}: \${error.message}\`)
  }
})

console.log('\\n🎉 Automated fixes complete!')
console.log('🔍 Please review changes and test functionality')
`

  fs.writeFileSync(path.join(__dirname, 'auto-fix-clerk-mocks.js'), fixScript)
  fs.chmodSync(path.join(__dirname, 'auto-fix-clerk-mocks.js'), '755')
  
  console.log('\n📝 Generated: scripts/auto-fix-clerk-mocks.js')
}

// Run the migration
runMigration()