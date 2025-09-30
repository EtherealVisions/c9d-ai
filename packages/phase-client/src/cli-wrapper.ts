/**
 * Phase CLI wrapper for when the SDK doesn't work
 * This is a fallback implementation that uses the Phase CLI directly
 */

import { execSync } from 'child_process';
import { getPhaseAppName, getPhaseEnvironment } from './config-reader';

export interface PhaseCliOptions {
  app?: string;
  environment?: string;
  token?: string;
  debug?: boolean;
}

/**
 * Fetch secrets using the Phase CLI
 */
export async function fetchSecretsViaCli(options: PhaseCliOptions = {}): Promise<Record<string, string>> {
  const token = options.token || process.env.PHASE_SERVICE_TOKEN;
  
  if (!token) {
    throw new Error('Phase token not found (PHASE_SERVICE_TOKEN)');
  }
  
  // Get app name from config or options
  const appName = options.app || getPhaseAppName();
  const environment = options.environment || getPhaseEnvironment();
  
  if (options.debug) {
    console.log(`[Phase CLI] Fetching secrets from ${appName} / ${environment}`);
  }
  
  try {
    // Use Phase CLI to get secrets in JSON format
    const command = `phase secrets list --app "${appName}" --env "${environment}" --json 2>/dev/null`;
    
    const output = execSync(command, {
      env: { ...process.env, PHASE_SERVICE_TOKEN: token },
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'] // Suppress stderr
    });
    
    // Parse the JSON output
    const secrets: Record<string, string> = {};
    
    try {
      // The Phase CLI output might be JSON array or object
      const parsed = JSON.parse(output);
      
      if (Array.isArray(parsed)) {
        // Array format: [{key: "KEY", value: "VALUE"}, ...]
        for (const item of parsed) {
          if (item.key && item.value !== undefined) {
            secrets[item.key] = item.value;
          }
        }
      } else if (typeof parsed === 'object') {
        // Object format: {KEY: "VALUE", ...}
        Object.assign(secrets, parsed);
      }
    } catch (parseError) {
      // If not JSON, try to parse the text output
      const lines = output.split('\n');
      for (const line of lines) {
        // Parse lines like: │ KEY │ VALUE │
        const match = line.match(/│\s*([^│]+)\s*│\s*([^│]+)\s*│/);
        if (match && match[1] && match[2]) {
          const key = match[1].trim();
          const value = match[2].trim();
          if (key && key !== 'KEY') { // Skip header
            secrets[key] = value;
          }
        }
      }
    }
    
    if (options.debug) {
      console.log(`[Phase CLI] Fetched ${Object.keys(secrets).length} secrets`);
    }
    
    return secrets;
    
  } catch (error: any) {
    if (options.debug) {
      console.error('[Phase CLI] Error:', error.message);
    }
    
    // Check if Phase CLI is installed
    try {
      execSync('which phase', { stdio: 'ignore' });
    } catch {
      throw new Error('Phase CLI not found. Please install it: curl -fsSL https://pkg.phase.dev/install.sh | bash');
    }
    
    throw new Error(`Failed to fetch secrets via Phase CLI: ${error.message}`);
  }
}

/**
 * Inject secrets into process.env using Phase CLI
 */
export async function injectSecretsViaCli(options: PhaseCliOptions = {}): Promise<void> {
  const secrets = await fetchSecretsViaCli(options);
  
  // Inject into process.env
  for (const [key, value] of Object.entries(secrets)) {
    process.env[key] = value;
  }
  
  if (options.debug) {
    console.log(`[Phase CLI] Injected ${Object.keys(secrets).length} secrets into process.env`);
  }
}