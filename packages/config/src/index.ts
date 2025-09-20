// Configuration utilities exports - Node.js only
// Runtime detection - fail fast in edge environments

if (typeof (globalThis as any).EdgeRuntime !== 'undefined') {
  throw new Error(
    '@c9d/config is not compatible with Edge Runtime. ' +
    'Use direct environment variable access (process.env) in edge contexts instead.'
  );
}

// Ensure Node.js environment
if (typeof process === 'undefined' || !process.env) {
  throw new Error(
    '@c9d/config requires Node.js environment with process.env access. ' +
    'This package cannot be used in browser or edge runtime contexts.'
  );
}

// Warn about Vercel CI build environment
// https://vercel.com/docs/environment-variables/system-environment-variables
if (process.env.VERCEL === '1' && process.env.CI === '1') {
  console.warn(
    '[Config] Detected Vercel CI build environment (VERCEL=1, CI=1). ' +
    'Configuration loading may be limited during build. ' +
    'Consider using direct process.env access for build-time configuration.'
  );
}

export * from './types';
export * from './env';
export * from './constants';
export * from './phase';
export * from './phase-token-loader';
export * from './phase-sdk-client';
export * from './phase-sdk-cache';
export * from './environment-fallback-manager';
export * from './phase-error-handler';
export * from './phase-monitoring';

