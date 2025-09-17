// Configuration utilities exports - Browser Version
// This version excludes Node.js-specific modules like phase-token-loader

export * from './types';
export * from './env';
export * from './constants';
export * from './phase-error-handler';
export * from './phase-monitoring';

// Note: The following are server-only due to Node.js dependencies:
// - phase.ts (uses phase-token-loader)
// - phase-token-loader.ts (uses fs module)
// - phase-sdk-client.ts (uses phase-token-loader)
// - environment-fallback-manager.ts (uses phase-token-loader)