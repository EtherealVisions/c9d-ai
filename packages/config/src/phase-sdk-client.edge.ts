// Edge-safe Phase SDK client (mock implementation)
// This module provides a Phase.dev client interface without the actual SDK

import { phaseSDKCache } from './phase-sdk-cache.edge';
import { getAllEnvVars } from './env.edge';

export interface PhaseSDKConfig {
  appName: string;
  environment: string;
  token?: string;
  baseUrl?: string;
}

export interface PhaseSecret {
  key: string;
  value: string;
}

export interface PhaseSDKResult {
  success: boolean;
  data?: Record<string, string>;
  error?: string;
  cached?: boolean;
}

/**
 * Edge-safe Phase SDK client
 * In edge runtime, this provides a fallback implementation
 */
export class PhaseSDKClient {
  private config: PhaseSDKConfig;
  private tokenSource?: string;
  private initialized = false;

  constructor(config: PhaseSDKConfig) {
    this.config = config;
    if (config.token) {
      this.tokenSource = 'constructor';
    }
  }

  /**
   * Initialize the client
   * In edge runtime, this is a no-op but maintains the interface
   */
  async initialize(): Promise<boolean> {
    if (!this.config.token) {
      console.error('[PhaseSDKClient] No token provided');
      return false;
    }

    this.initialized = true;
    console.log('[PhaseSDKClient] Edge runtime mode - using environment variables');
    return true;
  }

  /**
   * Fetch secrets
   * In edge runtime, returns environment variables as fallback
   */
  async fetchSecrets(): Promise<PhaseSDKResult> {
    if (!this.initialized) {
      return {
        success: false,
        error: 'Client not initialized'
      };
    }

    // Check cache first
    if (this.tokenSource) {
      const cached = phaseSDKCache.get(
        this.config.appName,
        this.config.environment,
        this.tokenSource
      );
      
      if (cached) {
        return {
          success: true,
          data: cached,
          cached: true
        };
      }
    }

    // In edge runtime, return environment variables
    const envVars = getAllEnvVars();
    
    // Cache the result
    if (this.tokenSource) {
      phaseSDKCache.set(
        this.config.appName,
        this.config.environment,
        this.tokenSource,
        envVars
      );
    }

    return {
      success: true,
      data: envVars,
      cached: false
    };
  }

  /**
   * Get a specific secret
   */
  async getSecret(key: string): Promise<string | null> {
    const result = await this.fetchSecrets();
    if (result.success && result.data) {
      return result.data[key] || null;
    }
    return null;
  }

  /**
   * Check if client is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get client status
   */
  getStatus(): {
    initialized: boolean;
    hasToken: boolean;
    mode: string;
  } {
    return {
      initialized: this.initialized,
      hasToken: !!this.config.token,
      mode: 'edge-fallback'
    };
  }
}

/**
 * Create a Phase SDK client instance
 */
export function createPhaseClient(config: PhaseSDKConfig): PhaseSDKClient {
  return new PhaseSDKClient(config);
}

/**
 * Mock Phase SDK init for compatibility
 */
export function Phase(): any {
  console.warn('[Phase.dev] Edge runtime detected - Phase SDK not available');
  return {
    init: () => {
      throw new Error('Phase.dev SDK is not compatible with Edge Runtime');
    }
  };
}
