/**
 * Environment variable validation system
 */

import * as fs from 'fs'
import * as path from 'path'

export interface EnvVarDefinition {
  name: string
  description: string
  type: 'string' | 'number' | 'boolean' | 'url' | 'email' | 'json'
  format?: 'url' | 'email' | 'uuid' | 'jwt' | 'base64'
  enum?: string[]
  example?: string
  default?: any
  sensitive?: boolean
  validation?: {
    pattern?: string
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
  }
}

export interface EnvConfig {
  appName: string
  displayName: string
  description?: string
  envVars: {
    required: EnvVarDefinition[]
    optional: EnvVarDefinition[]
  }
  validation?: {
    strict?: boolean
    warnOnMissing?: boolean
    failOnInvalid?: boolean
  }
  environments?: {
    [env: string]: {
      requiredOverrides?: string[]
      optionalOverrides?: string[]
    }
  }
  customValidation?: {
    rules: Array<{
      name: string
      description?: string
      validator: string
      errorMessage: string
    }>
  }
}

export interface ValidationError {
  variable: string
  type: 'missing' | 'invalid' | 'type_mismatch' | 'format_error' | 'custom_rule'
  message: string
  suggestion?: string
  severity: 'error' | 'warning'
}

export interface EnvValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  summary: {
    total: number
    required: number
    optional: number
    missing: number
    invalid: number
    valid: number
  }
  suggestions: string[]
}

/**
 * Load environment configuration from file
 */
export function loadEnvConfig(configPath: string): EnvConfig {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Environment configuration not found: ${configPath}`)
  }
  
  try {
    const content = fs.readFileSync(configPath, 'utf-8')
    return JSON.parse(content) as EnvConfig
  } catch (error) {
    throw new Error(`Failed to parse environment configuration: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Find environment configuration file for an app/package
 */
export function findEnvConfig(appPath: string): string | null {
  const configPath = path.join(appPath, 'env.config.json')
  return fs.existsSync(configPath) ? configPath : null
}

/**
 * Validate environment variables against configuration
 */
export function validateEnvironment(
  env: NodeJS.ProcessEnv,
  config: EnvConfig,
  environment: string = 'development'
): EnvValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  const suggestions: string[] = []
  
  // Get environment-specific overrides
  const envOverrides = config.environments?.[environment]
  const requiredVars = [...config.envVars.required]
  const optionalVars = [...config.envVars.optional]
  
  // Apply environment overrides
  if (envOverrides?.requiredOverrides) {
    for (const varName of envOverrides.requiredOverrides) {
      const optionalVar = optionalVars.find(v => v.name === varName)
      if (optionalVar) {
        requiredVars.push(optionalVar)
        optionalVars.splice(optionalVars.indexOf(optionalVar), 1)
      }
    }
  }
  
  if (envOverrides?.optionalOverrides) {
    for (const varName of envOverrides.optionalOverrides) {
      const requiredVar = requiredVars.find(v => v.name === varName)
      if (requiredVar) {
        optionalVars.push(requiredVar)
        requiredVars.splice(requiredVars.indexOf(requiredVar), 1)
      }
    }
  }
  
  const allVars = [...requiredVars, ...optionalVars]
  let validCount = 0
  let missingCount = 0
  let invalidCount = 0
  
  // Validate required variables
  for (const varDef of requiredVars) {
    const value = env[varDef.name]
    
    if (value === undefined || value === '') {
      missingCount++
      errors.push({
        variable: varDef.name,
        type: 'missing',
        message: `Required environment variable '${varDef.name}' is missing`,
        suggestion: generateSuggestion(varDef),
        severity: 'error'
      })
      continue
    }
    
    const validationResult = validateVariable(varDef, value)
    if (!validationResult.valid) {
      invalidCount++
      errors.push({
        variable: varDef.name,
        type: validationResult.type,
        message: validationResult.message,
        suggestion: validationResult.suggestion,
        severity: 'error'
      })
    } else {
      validCount++
    }
  }
  
  // Validate optional variables
  for (const varDef of optionalVars) {
    const value = env[varDef.name]
    
    if (value === undefined || value === '') {
      if (config.validation?.warnOnMissing) {
        warnings.push({
          variable: varDef.name,
          type: 'missing',
          message: `Optional environment variable '${varDef.name}' is not set`,
          suggestion: generateSuggestion(varDef),
          severity: 'warning'
        })
      }
      continue
    }
    
    const validationResult = validateVariable(varDef, value)
    if (!validationResult.valid) {
      invalidCount++
      const severity = config.validation?.failOnInvalid ? 'error' : 'warning'
      const errorArray = severity === 'error' ? errors : warnings
      
      errorArray.push({
        variable: varDef.name,
        type: validationResult.type,
        message: validationResult.message,
        suggestion: validationResult.suggestion,
        severity
      })
    } else {
      validCount++
    }
  }
  
  // Run custom validation rules
  if (config.customValidation?.rules) {
    for (const rule of config.customValidation.rules) {
      try {
        const validator = new Function('env', `return (${rule.validator})(env)`)
        const isValid = validator(env)
        
        if (!isValid) {
          errors.push({
            variable: 'custom',
            type: 'custom_rule',
            message: rule.errorMessage,
            severity: 'error'
          })
        }
      } catch (error) {
        warnings.push({
          variable: 'custom',
          type: 'custom_rule',
          message: `Custom validation rule '${rule.name}' failed to execute: ${error instanceof Error ? error.message : String(error)}`,
          severity: 'warning'
        })
      }
    }
  }
  
  // Generate suggestions
  if (errors.length > 0) {
    suggestions.push('Review the environment variable configuration and ensure all required variables are set')
    
    if (errors.some(e => e.type === 'missing')) {
      suggestions.push('Create a .env.local file with the missing variables')
      suggestions.push('Check your Phase.dev configuration for the correct environment context')
    }
    
    if (errors.some(e => e.type === 'invalid' || e.type === 'format_error')) {
      suggestions.push('Verify the format and values of your environment variables')
    }
    
    if (config.validation?.strict) {
      suggestions.push('Strict validation is enabled - all validation errors must be resolved')
    }
  }
  
  const isValid = config.validation?.strict 
    ? errors.length === 0 && warnings.length === 0
    : errors.length === 0
  
  return {
    valid: isValid,
    errors,
    warnings,
    summary: {
      total: allVars.length,
      required: requiredVars.length,
      optional: optionalVars.length,
      missing: missingCount,
      invalid: invalidCount,
      valid: validCount
    },
    suggestions
  }
}

/**
 * Validate a single environment variable
 */
function validateVariable(varDef: EnvVarDefinition, value: string): {
  valid: boolean
  type: ValidationError['type']
  message: string
  suggestion?: string
} {
  // Type validation
  switch (varDef.type) {
    case 'number':
      const num = Number(value)
      if (isNaN(num)) {
        return {
          valid: false,
          type: 'type_mismatch',
          message: `'${varDef.name}' must be a number, got: ${value}`,
          suggestion: `Set ${varDef.name} to a numeric value${varDef.example ? `, e.g., ${varDef.example}` : ''}`
        }
      }
      
      if (varDef.validation?.min !== undefined && num < varDef.validation.min) {
        return {
          valid: false,
          type: 'invalid',
          message: `'${varDef.name}' must be at least ${varDef.validation.min}, got: ${num}`,
          suggestion: `Set ${varDef.name} to a value >= ${varDef.validation.min}`
        }
      }
      
      if (varDef.validation?.max !== undefined && num > varDef.validation.max) {
        return {
          valid: false,
          type: 'invalid',
          message: `'${varDef.name}' must be at most ${varDef.validation.max}, got: ${num}`,
          suggestion: `Set ${varDef.name} to a value <= ${varDef.validation.max}`
        }
      }
      break
      
    case 'boolean':
      if (!['true', 'false', '1', '0', 'yes', 'no'].includes(value.toLowerCase())) {
        return {
          valid: false,
          type: 'type_mismatch',
          message: `'${varDef.name}' must be a boolean value, got: ${value}`,
          suggestion: `Set ${varDef.name} to true, false, 1, 0, yes, or no`
        }
      }
      break
      
    case 'json':
      try {
        JSON.parse(value)
      } catch {
        return {
          valid: false,
          type: 'format_error',
          message: `'${varDef.name}' must be valid JSON, got invalid JSON`,
          suggestion: `Ensure ${varDef.name} contains valid JSON format`
        }
      }
      break
  }
  
  // Format validation
  if (varDef.format) {
    const formatResult = validateFormat(varDef.name, value, varDef.format)
    if (!formatResult.valid) {
      return formatResult
    }
  }
  
  // Enum validation
  if (varDef.enum && !varDef.enum.includes(value)) {
    return {
      valid: false,
      type: 'invalid',
      message: `'${varDef.name}' must be one of: ${varDef.enum.join(', ')}, got: ${value}`,
      suggestion: `Set ${varDef.name} to one of the allowed values: ${varDef.enum.join(', ')}`
    }
  }
  
  // Pattern validation
  if (varDef.validation?.pattern) {
    const regex = new RegExp(varDef.validation.pattern)
    if (!regex.test(value)) {
      return {
        valid: false,
        type: 'format_error',
        message: `'${varDef.name}' does not match required pattern`,
        suggestion: generatePatternSuggestion(varDef)
      }
    }
  }
  
  // Length validation
  if (varDef.validation?.minLength !== undefined && value.length < varDef.validation.minLength) {
    return {
      valid: false,
      type: 'invalid',
      message: `'${varDef.name}' must be at least ${varDef.validation.minLength} characters long`,
      suggestion: `Ensure ${varDef.name} has at least ${varDef.validation.minLength} characters`
    }
  }
  
  if (varDef.validation?.maxLength !== undefined && value.length > varDef.validation.maxLength) {
    return {
      valid: false,
      type: 'invalid',
      message: `'${varDef.name}' must be at most ${varDef.validation.maxLength} characters long`,
      suggestion: `Ensure ${varDef.name} has at most ${varDef.validation.maxLength} characters`
    }
  }
  
  return { valid: true, type: 'invalid', message: '' }
}

/**
 * Validate format-specific patterns
 */
function validateFormat(name: string, value: string, format: string): {
  valid: boolean
  type: ValidationError['type']
  message: string
  suggestion?: string
} {
  switch (format) {
    case 'url':
      try {
        new URL(value)
      } catch {
        return {
          valid: false,
          type: 'format_error',
          message: `'${name}' must be a valid URL`,
          suggestion: `Ensure ${name} starts with http:// or https:// and is a valid URL`
        }
      }
      break
      
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        return {
          valid: false,
          type: 'format_error',
          message: `'${name}' must be a valid email address`,
          suggestion: `Ensure ${name} is in the format user@domain.com`
        }
      }
      break
      
    case 'uuid':
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(value)) {
        return {
          valid: false,
          type: 'format_error',
          message: `'${name}' must be a valid UUID`,
          suggestion: `Ensure ${name} is in UUID format (e.g., 123e4567-e89b-12d3-a456-426614174000)`
        }
      }
      break
      
    case 'jwt':
      const jwtRegex = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/
      if (!jwtRegex.test(value)) {
        return {
          valid: false,
          type: 'format_error',
          message: `'${name}' must be a valid JWT token`,
          suggestion: `Ensure ${name} is a valid JWT token with three parts separated by dots`
        }
      }
      break
      
    case 'base64':
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
      if (!base64Regex.test(value)) {
        return {
          valid: false,
          type: 'format_error',
          message: `'${name}' must be valid base64`,
          suggestion: `Ensure ${name} contains only valid base64 characters`
        }
      }
      break
  }
  
  return { valid: true, type: 'invalid', message: '' }
}

/**
 * Generate suggestion for missing variable
 */
function generateSuggestion(varDef: EnvVarDefinition): string {
  let suggestion = `Set ${varDef.name}=${varDef.example || '<value>'}`
  
  if (varDef.description) {
    suggestion += ` # ${varDef.description}`
  }
  
  if (varDef.enum) {
    suggestion += ` (one of: ${varDef.enum.join(', ')})`
  }
  
  return suggestion
}

/**
 * Generate suggestion for pattern validation failure
 */
function generatePatternSuggestion(varDef: EnvVarDefinition): string {
  const patterns: Record<string, string> = {
    '^postgresql://.*': 'PostgreSQL connection string (e.g., postgresql://user:pass@host:port/db)',
    '^https://.*\\.supabase\\.co$': 'Supabase project URL (e.g., https://your-project.supabase.co)',
    '^eyJ[A-Za-z0-9_-]*\\.[A-Za-z0-9_-]*\\.[A-Za-z0-9_-]*$': 'JWT token format',
    '^pk_(test|live)_[A-Za-z0-9]{32,}$': 'Clerk publishable key (pk_test_... or pk_live_...)',
    '^sk_(test|live)_[A-Za-z0-9]{32,}$': 'Clerk secret key (sk_test_... or sk_live_...)',
    '^whsec_[A-Za-z0-9+/]{32,}={0,2}$': 'Clerk webhook secret (whsec_...)',
    '^pss_[A-Za-z0-9]{32,}$': 'Phase.dev service token (pss_...)',
    '^redis://.*': 'Redis connection URL (e.g., redis://localhost:6379)'
  }
  
  const pattern = varDef.validation?.pattern
  if (pattern && patterns[pattern]) {
    return `${varDef.name} should be a ${patterns[pattern]}`
  }
  
  if (varDef.example) {
    return `${varDef.name} should match the required format, e.g., ${varDef.example}`
  }
  
  return `${varDef.name} should match the required pattern`
}

/**
 * Validate all environment configurations in a directory
 */
export function validateAllEnvironments(rootPath: string, environment: string = 'development'): {
  valid: boolean
  results: Array<{
    app: string
    path: string
    result: EnvValidationResult
  }>
  summary: {
    total: number
    valid: number
    invalid: number
    errors: number
    warnings: number
  }
} {
  const results: Array<{
    app: string
    path: string
    result: EnvValidationResult
  }> = []
  
  // Find all env.config.json files
  const findConfigs = (dir: string, basePath: string = ''): void => {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        findConfigs(path.join(dir, entry.name), path.join(basePath, entry.name))
      } else if (entry.name === 'env.config.json') {
        const configPath = path.join(dir, entry.name)
        const appName = basePath || path.basename(dir)
        
        try {
          const config = loadEnvConfig(configPath)
          const result = validateEnvironment(process.env, config, environment)
          
          results.push({
            app: appName,
            path: configPath,
            result
          })
        } catch (error) {
          results.push({
            app: appName,
            path: configPath,
            result: {
              valid: false,
              errors: [{
                variable: 'config',
                type: 'invalid',
                message: `Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`,
                severity: 'error'
              }],
              warnings: [],
              summary: { total: 0, required: 0, optional: 0, missing: 0, invalid: 0, valid: 0 },
              suggestions: ['Fix the configuration file syntax and structure']
            }
          })
        }
      }
    }
  }
  
  findConfigs(rootPath)
  
  const summary = {
    total: results.length,
    valid: results.filter(r => r.result.valid).length,
    invalid: results.filter(r => !r.result.valid).length,
    errors: results.reduce((sum, r) => sum + r.result.errors.length, 0),
    warnings: results.reduce((sum, r) => sum + r.result.warnings.length, 0)
  }
  
  return {
    valid: summary.invalid === 0,
    results,
    summary
  }
}