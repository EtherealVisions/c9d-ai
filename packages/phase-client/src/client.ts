/**
 * Phase.dev Client Implementation
 */

import Phase from '@phase.dev/phase-node';
import { PhaseConfig, EnvVars, AppNamespace } from './types';
import { resolveEnvironment } from './resolver';
import { SecretCache } from './cache';
import { validateSecrets } from './validator';
import { getPhaseAppName } from './config-reader';
import { fetchSecretsViaCli } from './cli-wrapper';

export class PhaseClient {
  private phase: Phase;
  private cache: SecretCache;
  private config: PhaseConfig;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  
  constructor(config: PhaseConfig) {
    // Set defaults with proper cache config
    const defaultCache = { enabled: true, ttl: 300 };
    this.config = {
      appNamespace: config.appNamespace,
      token: config.token,
      phaseEnv: config.phaseEnv || 'auto',
      strict: config.strict ?? false,
      stripPrefix: config.stripPrefix ?? true,
      cache: config.cache || defaultCache,
      apiUrl: config.apiUrl || 'https://api.phase.dev',
      timeout: config.timeout || 5000,
      debug: config.debug ?? false
    };
    
    // Initialize Phase SDK with service token
    // Phase SDK constructor takes the token as first parameter
    this.phase = new Phase(this.config.token);
    
    // Initialize in-memory cache only (no disk storage for security)
    this.cache = new SecretCache(this.config.cache);
    
    if (this.config.debug) {
      const stats = this.cache.getStats();
      console.log('[PhaseClient] Initialized with config:', {
        ...this.config,
        token: '***', // Hide token in logs
        cache: {
          enabled: this.config.cache?.enabled,
          ttl: this.config.cache?.ttl,
          maxMemoryMB: stats.maxMemoryMB,
          storage: 'memory-only' // Emphasize no disk caching
        }
      });
    }
    
    // Log cache health periodically in debug mode
    if (this.config.debug && this.config.cache?.enabled) {
      const healthInterval = setInterval(() => {
        const stats = this.cache.getStats();
        if (stats.healthStatus !== 'healthy') {
          console.log(`[PhaseClient] Cache health: ${stats.healthStatus} - ${stats.percentUsed}% memory used`);
        }
      }, 30000); // Every 30 seconds
      healthInterval.unref();
    }
  }
  
  /**
   * Initialize the Phase SDK (populate apps list)
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    
    // Use a single promise to avoid multiple init calls
    if (!this.initPromise) {
      this.initPromise = this.phase.init().then(() => {
        this.initialized = true;
        if (this.config.debug) {
          console.log(`[PhaseClient] SDK initialized, ${this.phase.apps?.length || 0} apps available`);
        }
      });
    }
    
    await this.initPromise;
  }
  
  /**
   * Get secrets from Phase.dev with caching and processing
   */
  async getSecrets(): Promise<EnvVars> {
    const startTime = Date.now();
    
    // Ensure SDK is initialized
    await this.ensureInitialized();
    
    // Resolve target environment
    const environment = this.resolveEnvironment();
    
    if (this.config.debug) {
      console.log(`[PhaseClient] Resolved environment: ${environment}`);
    }
    
    // Check cache first
    if (this.config.cache?.enabled) {
      const cached = await this.cache.get(environment);
      if (cached) {
        if (this.config.debug) {
          console.log(`[PhaseClient] Cache hit for ${environment}`);
        }
        this.logMetrics(Date.now() - startTime, true);
        return cached;
      }
    }
    
    // Fetch from Phase.dev
    try {
      if (this.config.debug) {
        console.log(`[PhaseClient] Fetching from Phase.dev...`);
      }
      
      // Get the app name and find the app in the initialized list
      const appName = this.getProjectName();
      const app = this.phase.apps?.find((a: any) => a.name === appName);
      
      if (!app) {
        throw new Error(`App '${appName}' not found in Phase. Available apps: ${this.phase.apps?.map((a: any) => a.name).join(', ')}`);
      }
      
      // Find the environment
      const env = app.environments?.find((e: any) => 
        e.name.toLowerCase() === environment.toLowerCase()
      );
      
      if (!env) {
        throw new Error(`Environment '${environment}' not found for app '${appName}'. Available: ${app.environments?.map((e: any) => e.name).join(', ')}`);
      }
      
      // Use the proper SDK method with app ID
      const secretsArray = await this.phase.get({
        appId: app.id,
        envName: env.name
      } as any); // Type assertion until we have proper types
      
      // Convert array to key-value object
      const secrets: Record<string, string> = {};
      if (Array.isArray(secretsArray)) {
        secretsArray.forEach((secret: any) => {
          // Phase SDK returns objects with 'key' and 'value' properties
          if (secret.key && typeof secret.value === 'string') {
            secrets[secret.key] = secret.value;
          } else if (secret.key && !secret.value) {
            // Some secrets might be empty, which is OK
            secrets[secret.key] = '';
          }
        });
      } else if (typeof secretsArray === 'object') {
        // If it's already an object, use it directly
        Object.assign(secrets, secretsArray);
      }
      
      // Process secrets (namespace stripping, etc.)
      const processed = this.processSecrets(secrets);
      
      // Validate if strict mode
      if (this.config.strict) {
        const validation = validateSecrets(processed, this.config.appNamespace);
        if (!validation.valid) {
          throw new Error(`Secret validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }
      }
      
      // Cache the result
      if (this.config.cache?.enabled) {
        await this.cache.set(environment, processed);
      }
      
      this.logMetrics(Date.now() - startTime, false);
      
      if (this.config.debug) {
        console.log(`[PhaseClient] Fetched ${Object.keys(processed).length} secrets`);
      }
      
      return processed;
    } catch (error) {
      if (this.config.debug) {
        console.error('[PhaseClient] Error fetching secrets:', error);
      }
      
      // Try to return stale cache if available
      if (this.config.cache?.enabled) {
        const stale = await this.cache.getStale(environment);
        if (stale) {
          console.warn(`[PhaseClient] Using stale cache due to error: ${error}`);
          return stale;
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Get a single secret value
   */
  async getSecret(key: string): Promise<string | undefined> {
    const secrets = await this.getSecrets();
    return secrets[key];
  }
  
  /**
   * Refresh secrets, bypassing cache
   */
  async refresh(): Promise<EnvVars> {
    const environment = this.resolveEnvironment();
    
    // Clear cache for this environment
    if (this.config.cache?.enabled) {
      await this.cache.delete(environment);
    }
    
    return this.getSecrets();
  }
  
  /**
   * Inject secrets into process.env
   */
  async inject(): Promise<void> {
    const secrets = await this.getSecrets();
    
    Object.entries(secrets).forEach(([key, value]) => {
      process.env[key] = value;
    });
    
    if (this.config.debug) {
      console.log(`[PhaseClient] Injected ${Object.keys(secrets).length} secrets into process.env`);
    }
  }
  
  /**
   * Get the effective environment being used
   */
  getEnvironment(): string {
    return this.resolveEnvironment();
  }
  
  /**
   * Clear all cached secrets
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }
  
  /**
   * Resolve the target environment based on configuration
   */
  private resolveEnvironment(): string {
    return resolveEnvironment({
      appName: this.config.appNamespace,
      globalEnv: this.config.phaseEnv === 'auto' ? undefined : this.config.phaseEnv
    });
  }
  
  /**
   * Get the Phase.dev project name for this app
   */
  private getProjectName(): string {
    try {
      // Try to get app name from configuration files
      return getPhaseAppName(this.config.appNamespace);
    } catch (error) {
      // If no config found and appNamespace is provided, use it as-is
      if (this.config.appNamespace) {
        if (this.config.debug) {
          console.log(`[PhaseClient] Using provided app name: ${this.config.appNamespace}`);
        }
        return this.config.appNamespace;
      }
      throw new Error('Phase app name not configured. Please provide appNamespace or configure .phase.json');
    }
  }
  
  /**
   * Process secrets (strip prefixes, handle special cases)
   */
  private processSecrets(secrets: Record<string, string>): EnvVars {
    if (!this.config.stripPrefix) {
      return secrets;
    }
    
    const processed: EnvVars = {};
    const prefix = `${this.config.appNamespace}__`;
    
    for (const [key, value] of Object.entries(secrets)) {
      let processedKey = key;
      
      // Strip app-specific prefix
      if (key.startsWith(prefix)) {
        processedKey = key.slice(prefix.length);
      }
      // Strip SHARED__ prefix
      else if (key.startsWith('SHARED__')) {
        processedKey = key.slice(8);
      }
      
      processed[processedKey] = value;
    }
    
    return processed;
  }
  
  /**
   * Log performance metrics
   */
  private logMetrics(duration: number, cached: boolean): void {
    if (process.env.PHASE_METRICS === 'true') {
      console.log(JSON.stringify({
        type: 'phase_metrics',
        app: this.config.appNamespace,
        environment: this.resolveEnvironment(),
        duration_ms: duration,
        cached,
        timestamp: new Date().toISOString()
      }));
    }
  }
}