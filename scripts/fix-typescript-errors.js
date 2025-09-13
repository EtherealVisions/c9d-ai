#!/usr/bin/env node

/**
 * Script to systematically fix TypeScript errors in the codebase
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Common fixes for TypeScript errors
const fixes = {
  // Fix missing imports
  fixMissingImports: (content, filePath) => {
    let fixed = content

    // Add missing React import for JSX
    if (filePath.endsWith('.tsx') && !fixed.includes("import React") && fixed.includes('<')) {
      fixed = `import React from 'react'\n${fixed}`
    }

    // Add missing vitest imports for test files
    if (filePath.includes('test.ts') || filePath.includes('test.tsx')) {
      if (!fixed.includes('describe') && fixed.includes('describe(')) {
        fixed = `import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'\n${fixed}`
      }
    }

    return fixed
  },

  // Fix auth import issues
  fixAuthImports: (content) => {
    // Replace old auth import with new one
    return content.replace(
      /import { auth } from '@clerk\/nextjs'/g,
      "import { auth } from '@clerk/nextjs/server'"
    )
  },

  // Fix custom errors imports
  fixCustomErrorsImports: (content) => {
    // Ensure custom-errors imports are correct
    return content.replace(
      /from ['"]\.\.\/\.\.\/errors\/custom-errors['"]/g,
      "from '@/lib/errors/custom-errors'"
    ).replace(
      /from ['"]\.\.\/custom-errors['"]/g,
      "from './custom-errors'"
    )
  },

  // Fix analytics types imports
  fixAnalyticsImports: (content) => {
    return content.replace(
      /from ['"]@\/lib\/types\/hero['"]/g,
      "from '@/lib/types/hero'"
    ).replace(
      /from ['"]@\/lib\/types\/cta['"]/g,
      "from '@/lib/types/cta'"
    )
  },

  // Fix useRef without initial value
  fixUseRef: (content) => {
    return content.replace(
      /const\s+(\w+)\s+=\s+React\.useRef<([^>]+)>\(\);/g,
      'const $1 = React.useRef<$2>(null);'
    ).replace(
      /const\s+(\w+)\s+=\s+useRef<([^>]+)>\(\);/g,
      'const $1 = useRef<$2>(null);'
    )
  }
}

// Files to process
const filesToProcess = [
  'apps/web/lib/utils/analytics.ts',
  'apps/web/lib/utils/cta-analytics.ts',
  'apps/web/lib/validation/form-validation.ts',
  'apps/web/lib/errors/api-error-handler.ts',
  'apps/web/lib/errors/error-utils.ts',
  'apps/web/lib/errors/index.ts'
]

function fixFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`)
      return false
    }

    let content = fs.readFileSync(filePath, 'utf8')
    let originalContent = content

    // Apply all fixes
    Object.values(fixes).forEach(fix => {
      content = fix(content, filePath)
    })

    // Only write if content changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8')
      console.log(`✅ Fixed: ${filePath}`)
      return true
    } else {
      console.log(`ℹ️  No changes needed: ${filePath}`)
      return false
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message)
    return false
  }
}

function main() {
  console.log('🔧 Starting TypeScript error fixes...\n')

  let fixedCount = 0
  
  filesToProcess.forEach(filePath => {
    if (fixFile(filePath)) {
      fixedCount++
    }
  })

  console.log(`\n📊 Summary: Fixed ${fixedCount} files`)

  // Run typecheck to see remaining errors
  console.log('\n🔍 Running typecheck to see remaining errors...')
  try {
    execSync('pnpm typecheck --filter=@c9d/web', { stdio: 'inherit', cwd: process.cwd() })
    console.log('✅ All TypeScript errors fixed!')
  } catch (error) {
    console.log('⚠️  Some TypeScript errors remain. Check output above.')
  }
}

if (require.main === module) {
  main()
}

module.exports = { fixes, fixFile }