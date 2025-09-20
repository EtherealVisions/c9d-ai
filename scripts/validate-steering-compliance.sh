#!/bin/bash

# Steering Guide Compliance Validation Script
# Validates that projects follow the established steering guide standards

set -e

echo "🔍 Validating Steering Guide Compliance..."
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track validation results
ERRORS=0
WARNINGS=0

# Function to log errors
log_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    ((ERRORS++))
}

# Function to log warnings
log_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
    ((WARNINGS++))
}

# Function to log success
log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

echo "📋 Checking Modern Testing Standards Compliance..."

# 1. Check for NODE_OPTIONS in package.json
echo "🔍 Validating memory management configuration..."
if [ -f "package.json" ]; then
    if grep -q "NODE_OPTIONS.*--max-old-space-size" package.json; then
        log_success "NODE_OPTIONS found in package.json"
    else
        log_error "Missing NODE_OPTIONS in test scripts. Add memory allocation to test commands."
    fi
else
    log_warning "No package.json found in current directory"
fi

# 2. Check for @clerk/testing package
echo "🔍 Validating Clerk testing utilities..."
if [ -f "package.json" ]; then
    if grep -q "@clerk/testing" package.json; then
        log_success "@clerk/testing package installed"
    else
        log_error "Missing @clerk/testing package. Run: pnpm add -D @clerk/testing"
    fi
fi

# 3. Check for official Clerk testing setup
echo "🔍 Validating Clerk testing setup..."
if [ -f "__tests__/setup/clerk-testing-setup.ts" ] || [ -f "apps/web/__tests__/setup/clerk-testing-setup.ts" ]; then
    log_success "Clerk testing setup file found"
else
    log_error "Missing Clerk testing setup file. Create __tests__/setup/clerk-testing-setup.ts"
fi

# 4. Check for forbidden Clerk mocking patterns
echo "🔍 Checking for forbidden Clerk mocking patterns..."
if find . -name "*.test.ts" -o -name "*.test.tsx" | xargs grep -l "vi\.mock.*@clerk" | grep -v setup 2>/dev/null; then
    log_error "Custom Clerk mocking detected. Use official @clerk/testing utilities instead."
else
    log_success "No forbidden Clerk mocking patterns found"
fi

# 5. Check for vitest.setup.ts
echo "🔍 Validating vitest setup configuration..."
if [ -f "vitest.setup.ts" ] || [ -f "apps/web/vitest.setup.ts" ]; then
    log_success "vitest.setup.ts found"
else
    log_error "Missing vitest.setup.ts file. Create global test setup file."
fi

# 6. Check for vitest.config.ts with proper configuration
echo "🔍 Validating vitest configuration..."
if [ -f "vitest.config.ts" ] || [ -f "apps/web/vitest.config.ts" ]; then
    # Check for memory optimization settings
    if find . -name "vitest.config.ts" | xargs grep -q "singleFork.*true" 2>/dev/null; then
        log_success "Memory optimization configured in vitest.config.ts"
    else
        log_warning "Consider adding singleFork: true for memory optimization"
    fi
    
    # Check for coverage thresholds
    if find . -name "vitest.config.ts" | xargs grep -q "lib/services" 2>/dev/null; then
        log_success "Tiered coverage thresholds configured"
    else
        log_warning "Consider adding tiered coverage thresholds"
    fi
else
    log_error "Missing vitest.config.ts file. Create vitest configuration."
fi

# 7. Check for Phase.dev integration (no mocking)
echo "🔍 Validating Phase.dev integration standards..."
if find . -name "*.test.ts" -o -name "*.test.tsx" | xargs grep -l "mock.*phase\|mock.*Phase" 2>/dev/null; then
    log_error "Phase.dev mocking detected. Use real API calls with PHASE_SERVICE_TOKEN."
else
    log_success "No Phase.dev mocking found (correct approach)"
fi

# 8. Check for proper test command patterns
echo "🔍 Validating test command patterns..."
if [ -f "package.json" ]; then
    # Check for watch mode in default test command
    if grep -q '"test".*vitest"' package.json && ! grep -q '"test".*vitest run' package.json; then
        log_error "Default test command uses watch mode. Change to 'vitest run'"
    else
        log_success "Test commands properly configured"
    fi
fi

# 9. Check for accessibility context mocking
echo "🔍 Validating accessibility context setup..."
if find . -name "vitest.setup.ts" | xargs grep -q "accessibility-context" 2>/dev/null; then
    log_success "Accessibility context mocking configured"
else
    log_warning "Consider adding accessibility context mocking to vitest.setup.ts"
fi

# 10. Check for proper exclusions in coverage
echo "🔍 Validating coverage exclusions..."
if find . -name "vitest.config.ts" | xargs grep -A 10 "exclude:" | grep -q "__tests__" 2>/dev/null; then
    log_success "Proper coverage exclusions configured"
else
    log_warning "Consider adding proper coverage exclusions"
fi

echo ""
echo "============================================"
echo "📊 Compliance Validation Summary"
echo "============================================"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 Perfect compliance! All steering guide standards met.${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Good compliance with $WARNINGS warnings to address.${NC}"
    echo "Consider addressing warnings for optimal configuration."
    exit 0
else
    echo -e "${RED}❌ Compliance issues found: $ERRORS errors, $WARNINGS warnings${NC}"
    echo ""
    echo "🔧 Immediate Actions Required:"
    echo "1. Fix all ERROR items above"
    echo "2. Consider addressing WARNING items"
    echo "3. Re-run validation: ./scripts/validate-steering-compliance.sh"
    echo ""
    echo "📚 Reference: .kiro/steering/modern-testing-standards.md"
    exit 1
fi