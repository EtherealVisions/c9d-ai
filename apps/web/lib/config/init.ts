import { initializeGlobalConfig, getConfig } from './manager';

/**
 * Global configuration initialization state
 */
let configInitialized = false;
let configInitializationPromise: Promise<void> | null = null;

/**
 * Initialize application configuration
 * This should be called early in the application lifecycle
 */
export async function initializeAppConfig(): Promise<void> {
  // If already initialized, return immediately
  if (configInitialized) {
    return;
  }

  // If initialization is in progress, wait for it
  if (configInitializationPromise) {
    return configInitializationPromise;
  }

  // Start initialization
  configInitializationPromise = (async () => {
    try {
      console.log('[AppConfig] Initializing application configuration...');
      
      // Initialize the global configuration manager
      await initializeGlobalConfig();
      
      configInitialized = true;
      console.log('[AppConfig] Application configuration initialized successfully');
      
    } catch (error) {
      console.error('[AppConfig] Failed to initialize application configuration:', error);
      
      // Reset the promise so we can retry
      configInitializationPromise = null;
      
      // Don't throw the error - let the application continue with fallback configuration
      // The configuration manager will handle fallbacks internally
      configInitialized = true; // Mark as initialized even if Phase.dev failed
    }
  })();

  return configInitializationPromise;
}

/**
 * Get a configuration value with automatic initialization
 * @param key Configuration key
 * @returns Configuration value or undefined
 */
export async function getAppConfig(key: string): Promise<string | undefined> {
  await initializeAppConfig();
  return getConfig(key);
}

/**
 * Get a configuration value synchronously (only works if already initialized)
 * @param key Configuration key
 * @returns Configuration value or undefined
 */
export function getAppConfigSync(key: string): string | undefined {
  if (!configInitialized) {
    console.warn(`[AppConfig] Attempting to get config '${key}' before initialization. Consider using getAppConfig() instead.`);
    return process.env[key];
  }
  
  try {
    return getConfig(key);
  } catch (error) {
    console.warn(`[AppConfig] Failed to get config '${key}':`, error);
    return process.env[key];
  }
}

/**
 * Check if configuration is initialized
 * @returns True if configuration is initialized
 */
export function isConfigInitialized(): boolean {
  return configInitialized;
}

/**
 * Reset configuration initialization state (for testing)
 */
export function resetConfigInitialization(): void {
  configInitialized = false;
  configInitializationPromise = null;
}