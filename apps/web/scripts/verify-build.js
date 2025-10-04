#!/usr/bin/env node
/**
 * Verify build output structure
 */

const fs = require('fs');
const path = require('path');

console.log('=== Build Verification ===');
console.log('Current directory:', process.cwd());
console.log('Build directory contents:');

// Check if we're in the right directory
const possiblePaths = [
  '.next',
  'apps/web/.next',
  path.join(process.cwd(), '.next'),
  path.join(process.cwd(), 'apps/web/.next')
];

let nextPath = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    nextPath = p;
    console.log(`✅ Found .next directory at: ${p}`);
    break;
  }
}

if (!nextPath) {
  console.error('❌ Could not find .next directory');
  console.log('Searched paths:', possiblePaths);
  process.exit(1);
}

// Check for routes-manifest.json
const routesManifestPath = path.join(nextPath, 'routes-manifest.json');
if (fs.existsSync(routesManifestPath)) {
  console.log('✅ Found routes-manifest.json');
} else {
  console.error('❌ routes-manifest.json not found at:', routesManifestPath);
  
  // List contents of .next directory
  console.log('\n.next directory contents:');
  try {
    const files = fs.readdirSync(nextPath);
    files.forEach(file => {
      console.log(`  - ${file}`);
    });
  } catch (error) {
    console.error('Error reading .next directory:', error);
  }
}

// Check build output structure
const requiredFiles = [
  'routes-manifest.json',
  'build-manifest.json',
  'prerender-manifest.json',
  'server',
  'static'
];

console.log('\n=== Required Build Files ===');
let allFilesPresent = true;
for (const file of requiredFiles) {
  const filePath = path.join(nextPath, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - NOT FOUND`);
    allFilesPresent = false;
  }
}

if (!allFilesPresent) {
  console.error('\n❌ Some required build files are missing');
  process.exit(1);
} else {
  console.log('\n✅ All required build files are present');
}