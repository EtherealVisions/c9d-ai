/**
 * Secret validation utilities
 */

import { ValidationResult, ValidationError, ValidationWarning, AppNamespace } from './types';

/**
 * Required secrets per application
 */
const REQUIRED_SECRETS: Record<AppNamespace, string[]> = {
  WEB: [
    'DATABASE_URL',
    'DIRECT_URL',
    'CLERK_SECRET_KEY',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ],
  API: [
    'DATABASE_URL',
    'DIRECT_URL',
    'CLERK_SECRET_KEY',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'JWT_SECRET'
  ],
  DOCS: [
    'NEXT_PUBLIC_APP_URL'
  ],
  STUDIO: [
    'SANITY_STUDIO_PROJECT_ID',
    'SANITY_STUDIO_DATASET'
  ],
  COST: [
    'DATABASE_URL',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY'
  ],
  INTEGRATION: [
    'DATABASE_URL'
  ],
  SHARED: []
};

/**
 * Validate secrets against requirements
 */
export function validateSecrets(
  secrets: Record<string, string>,
  appNamespace?: AppNamespace | string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // Get required secrets for this app
  const required = appNamespace && appNamespace in REQUIRED_SECRETS 
    ? REQUIRED_SECRETS[appNamespace as AppNamespace] 
    : [];
  
  // Check for missing required secrets
  for (const key of required) {
    if (!secrets[key]) {
      errors.push({
        key,
        message: `Required secret '${key}' is missing`,
        required: true
      });
    }
  }
  
  // Check for empty values
  for (const [key, value] of Object.entries(secrets)) {
    if (value === '') {
      warnings.push({
        key,
        message: `Secret '${key}' has an empty value`
      });
    }
  }
  
  // Check for common issues
  checkCommonIssues(secrets, warnings);
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Check for common configuration issues
 */
function checkCommonIssues(
  secrets: Record<string, string>,
  warnings: ValidationWarning[]
): void {
  // Check DATABASE_URL format
  if (secrets.DATABASE_URL && !secrets.DATABASE_URL.startsWith('postgres')) {
    warnings.push({
      key: 'DATABASE_URL',
      message: 'DATABASE_URL should start with postgres:// or postgresql://'
    });
  }
  
  // Check for localhost in production
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    for (const [key, value] of Object.entries(secrets)) {
      if (value.includes('localhost') || value.includes('127.0.0.1')) {
        warnings.push({
          key,
          message: `Secret '${key}' contains localhost reference in production`
        });
      }
    }
  }
  
  // Check for test/development keys in production
  if (isProduction) {
    for (const [key, value] of Object.entries(secrets)) {
      if (value.includes('test_') || value.includes('dev_')) {
        warnings.push({
          key,
          message: `Secret '${key}' appears to be a test/dev key in production`
        });
      }
    }
  }
  
  // Check URL formats
  const urlKeys = Object.keys(secrets).filter(k => k.includes('URL'));
  for (const key of urlKeys) {
    const value = secrets[key];
    if (value && !value.match(/^https?:\/\/|^postgres/)) {
      warnings.push({
        key,
        message: `Secret '${key}' doesn't appear to be a valid URL`
      });
    }
  }
}