/**
 * @coordinated/phase-client
 * 
 * Phase.dev client library for the Coordinated.app monorepo.
 * Provides environment resolution, secret fetching, caching, and validation.
 */

export { PhaseClient } from './client';
export { resolveEnvironment } from './resolver';
export { validateSecrets } from './validator';
export { SecretCache } from './cache';
export type {
  PhaseConfig,
  EnvVars,
  ValidationResult,
  AppNamespace,
  CacheConfig,
  ResolverOptions
} from './types';