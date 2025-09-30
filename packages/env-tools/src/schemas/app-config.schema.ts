/**
 * Schema for app-level environment configuration
 */

import { z } from 'zod';

/**
 * Environment variable definition schema
 */
export const EnvVarSchema = z.object({
  name: z.string().min(1, 'Variable name is required'),
  required: z.boolean().default(true),
  description: z.string().min(1, 'Description is required'),
  example: z.string().optional(),
  sensitive: z.boolean().default(false),
  pattern: z.string().optional(), // Regex pattern for validation
  defaultValue: z.string().optional(),
  group: z.string().optional(), // For grouping related variables
});

/**
 * App environment configuration schema
 */
export const AppEnvConfigSchema = z.object({
  // App metadata
  appName: z.string().min(1, 'App name is required'),
  displayName: z.string().optional(),
  
  // Phase.dev configuration (optional - can be read from package.json)
  phase: z.object({
    app: z.string().optional(),
    environments: z.record(z.string()).optional(),
  }).optional(),
  
  // Environment variables configuration
  envVars: z.object({
    required: z.array(EnvVarSchema).default([]),
    optional: z.array(EnvVarSchema).default([]),
  }),
  
  // Validation settings
  validation: z.object({
    strict: z.boolean().default(true), // Exit on validation failure
    skipGroups: z.array(z.string()).default([]), // Skip validation for certain groups
    customValidators: z.string().optional(), // Path to custom validation script
  }).optional(),
  
  // Environment file defaults
  defaults: z.object({
    envFile: z.string().default('.env.development'),
    fallbackFiles: z.array(z.string()).default(['.env.local', '.env']),
  }).optional(),
});

export type EnvVar = z.infer<typeof EnvVarSchema>;
export type AppEnvConfig = z.infer<typeof AppEnvConfigSchema>;

/**
 * Validate app configuration
 */
export function validateAppConfig(config: unknown): AppEnvConfig {
  return AppEnvConfigSchema.parse(config);
}

/**
 * Load app configuration from file
 */
export async function loadAppEnvConfig(configPath: string): Promise<AppEnvConfig | null> {
  try {
    const { existsSync } = await import('fs');
    const { readFile } = await import('fs/promises');
    const { resolve } = await import('path');
    
    const fullPath = resolve(configPath);
    if (!existsSync(fullPath)) {
      return null;
    }
    
    const content = await readFile(fullPath, 'utf-8');
    const config = JSON.parse(content);
    
    return validateAppConfig(config);
  } catch (error) {
    console.error('Error loading app config:', error);
    return null;
  }
}