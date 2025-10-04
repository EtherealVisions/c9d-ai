#!/usr/bin/env node
/**
 * Test script to verify environment variable loading in Vercel
 */

console.log('=== Environment Variable Test ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('VERCEL:', process.env.VERCEL);
console.log('VERCEL_ENV:', process.env.VERCEL_ENV);
console.log('CI:', process.env.CI);
console.log('\n=== Critical Variables ===');

// Check for literal $ variables
const criticalVars = [
  'DATABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'CLERK_WEBHOOK_SECRET',
  'REDIS_URL',
  'PHASE_SERVICE_TOKEN',
  'SUPABASE_SERVICE_ROLE_KEY'
];

let hasLiteralVars = false;
let missingVars = [];
let literalVars = [];

criticalVars.forEach(varName => {
  const value = process.env[varName];
  
  if (!value) {
    console.log(`❌ ${varName}: NOT SET`);
    missingVars.push(varName);
  } else if (value.startsWith('$')) {
    console.log(`⚠️  ${varName}: LITERAL VARIABLE (${value})`);
    hasLiteralVars = true;
    literalVars.push(varName);
  } else {
    // Show first 10 chars for security
    const displayValue = value.length > 10 ? value.substring(0, 10) + '...' : value;
    console.log(`✅ ${varName}: ${displayValue} (length: ${value.length})`);
  }
});

console.log('\n=== Summary ===');
console.log(`Total variables checked: ${criticalVars.length}`);
console.log(`Missing variables: ${missingVars.length}`);
console.log(`Literal variables: ${literalVars.length}`);

if (hasLiteralVars) {
  console.log('\n⚠️  WARNING: Some environment variables contain literal $ values!');
  console.log('This typically means the variables are not properly set in Vercel.');
  console.log('\nTo fix this:');
  console.log('1. Go to your Vercel project settings');
  console.log('2. Navigate to Settings > Environment Variables');
  console.log('3. Ensure these variables are set with actual values (not $VARIABLE_NAME)');
  console.log('\nAffected variables:', literalVars.join(', '));
}

if (missingVars.length > 0) {
  console.log('\n❌ ERROR: Some required environment variables are missing!');
  console.log('Missing variables:', missingVars.join(', '));
}

// Check if we can detect Vercel environment variable injection
console.log('\n=== Vercel Variable Detection ===');
console.log('Total environment variables:', Object.keys(process.env).length);

// Look for Vercel-specific variables
const vercelVars = Object.keys(process.env).filter(key => 
  key.startsWith('VERCEL_') || 
  key.startsWith('NEXT_') ||
  key === 'CI' ||
  key === 'NODE_ENV'
);
console.log('Vercel-related variables found:', vercelVars.length);

// Exit with error if we have issues
if (hasLiteralVars || missingVars.length > 0) {
  process.exit(1);
}

console.log('\n✅ All environment variables are properly set!');