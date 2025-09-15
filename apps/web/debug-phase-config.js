// Debug script to check Phase.dev configuration
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

console.log('=== Phase.dev Configuration Debug ===');
console.log('');

// Check environment variables
console.log('Environment Variables:');
console.log('PHASE_SERVICE_TOKEN:', process.env.PHASE_SERVICE_TOKEN ? 
  `${process.env.PHASE_SERVICE_TOKEN.substring(0, 20)}...` : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('');

// Check package.json configuration
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log('Package.json Phase Config:');
  console.log('App Name:', packageJson.phase?.appName || 'NOT SET');
  console.log('');
} catch (error) {
  console.log('Error reading package.json:', error.message);
}

// Simulate the configuration that would be created
const config = {
  serviceToken: process.env.PHASE_SERVICE_TOKEN,
  appName: 'AI.C9d.Web',
  environment: process.env.NODE_ENV || 'development'
};

console.log('Generated Configuration:');
console.log('Service Token:', config.serviceToken ? 
  `${config.serviceToken.substring(0, 20)}...` : 'NOT SET');
console.log('App Name:', config.appName);
console.log('Environment:', config.environment);
console.log('');

// Check if we can make a test API call
if (config.serviceToken) {
  console.log('Testing Phase.dev API call...');
  console.log('URL: https://console.phase.dev/v1/secrets');
  console.log('Headers:');
  console.log('  Authorization: Bearer', config.serviceToken.substring(0, 20) + '...');
  console.log('  X-App-Name:', config.appName);
  console.log('  X-Environment:', config.environment);
} else {
  console.log('Cannot test API call - no service token');
}