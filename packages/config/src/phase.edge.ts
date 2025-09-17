// Edge-safe Phase.dev configuration
// This module provides Phase.dev configuration without Node.js-specific APIs

import { getEnvVar, getAllEnvVars } from './env.edge';
import { loadPhaseServiceToken, hasPhaseServiceToken } from './phase-token-loader.edge';

export interface PhaseConfig {
  appName: string;
  environment: string;
  token?: string;
}

export interface PhaseInitResult {
  success: boolean;
  error?: string;
  config?: PhaseConfig;
}

/**
 * Initialize Phase.dev configuration (edge-safe)
 * In edge runtime, we can only access environment variables, not the Phase SDK
 */
export async function initializePhase(
  appName?: string,
  environment?: string
): Promise<PhaseInitResult> {
  const tokenResult = await loadPhaseServiceToken();
  
  if (!tokenResult.token) {
    return {
      success: false,
      error: 'No Phase.dev service token found in environment'
    };
  }
  
  const config: PhaseConfig = {
    appName: appName || getEnvVar('PHASE_APP_NAME') || 'AI.C9d.Web',
    environment: environment || getEnvVar('NODE_ENV') || 'production',
    token: tokenResult.token
  };
  
  // In edge runtime, we can't actually initialize the Phase SDK
  console.log('[Phase.dev] Edge runtime detected - Phase SDK not available');
  
  return {
    success: false,
    error: 'Phase.dev SDK is not compatible with Edge Runtime',
    config
  };
}

/**
 * Load configuration from Phase.dev (edge-safe fallback)
 * In edge runtime, this will always return environment variables
 */
export async function loadPhaseConfig(): Promise<Record<string, string>> {
  console.log('[Phase.dev] Edge runtime - returning process.env variables');
  return getAllEnvVars();
}

/**
 * Check if Phase.dev is configured
 */
export function isPhaseConfigured(): boolean {
  return hasPhaseServiceToken();
}

/**
 * Get Phase.dev configuration status
 */
export function getPhaseStatus(): {
  configured: boolean;
  available: boolean;
  reason?: string;
} {
  const hasToken = hasPhaseServiceToken();
  
  return {
    configured: hasToken,
    available: false, // Phase SDK not available in edge runtime
    reason: hasToken 
      ? 'Phase.dev SDK is not compatible with Edge Runtime' 
      : 'No Phase.dev service token found'
  };
}

// Re-export edge-safe functions
export { 
  hasPhaseServiceToken as isPhaseDevAvailable,
  loadPhaseServiceToken as getPhaseServiceToken 
};
