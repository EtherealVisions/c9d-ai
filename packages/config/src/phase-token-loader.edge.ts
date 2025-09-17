// Edge-safe Phase.dev token loader
// This module provides token loading without file system access

import { getEnvVar } from './env.edge';

export interface TokenSource {
  source: 'process.env' | 'edge-runtime';
  path?: string;
  exists: boolean;
  hasToken: boolean;
  tokenLength?: number;
  isActive?: boolean;
}

export interface TokenLoadResult {
  token: string | null;
  tokenSource?: TokenSource;
  metadata: {
    loadingTime: number;
    checkedSources: TokenSource[];
    totalSourcesChecked: number;
    sourcesWithToken: number;
  };
  error?: string;
}

/**
 * Load Phase.dev service token from environment variables (edge-safe)
 */
export async function loadPhaseServiceToken(): Promise<TokenLoadResult> {
  const startTime = performance.now();
  const checkedSources: TokenSource[] = [];
  
  // In edge runtime, we can only check process.env
  const token = getEnvVar('PHASE_SERVICE_TOKEN');
  
  const source: TokenSource = {
    source: 'process.env',
    exists: true,
    hasToken: !!token,
    tokenLength: token?.length,
    isActive: !!token
  };
  
  checkedSources.push(source);
  
  const loadingTime = performance.now() - startTime;
  
  const result: TokenLoadResult = {
    token: token || null,
    tokenSource: token ? source : undefined,
    metadata: {
      loadingTime,
      checkedSources,
      totalSourcesChecked: 1,
      sourcesWithToken: token ? 1 : 0
    }
  };
  
  if (token) {
    console.log('[Phase.dev] token-loading: Token loaded successfully from process.env', {
      tokenSource: source,
      metadata: result.metadata,
      error: undefined
    });
  } else {
    result.error = 'No PHASE_SERVICE_TOKEN found in environment variables';
    console.log('[Phase.dev] token-loading: No token found in edge runtime environment');
  }
  
  return result;
}

/**
 * Get token source diagnostics
 */
export function getTokenSourceDiagnostics(): TokenSource[] {
  const token = getEnvVar('PHASE_SERVICE_TOKEN');
  
  return [{
    source: 'process.env',
    exists: true,
    hasToken: !!token,
    tokenLength: token?.length,
    isActive: !!token
  }];
}

/**
 * Quick check for Phase.dev token availability
 */
export function hasPhaseServiceToken(): boolean {
  return !!getEnvVar('PHASE_SERVICE_TOKEN');
}

/**
 * Get masked token for logging
 */
export function getMaskedToken(token: string | null): string {
  if (!token) return 'null';
  if (token.length < 8) return '***';
  return token.substring(0, 4) + '...' + token.substring(token.length - 4);
}
