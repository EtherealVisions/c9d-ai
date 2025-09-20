// Configuration constants - Edge Runtime safe

export const CONFIG_DEFAULTS = {
  PHASE_TIMEOUT: 5000,
  CACHE_TTL: 300000, // 5 minutes
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000
} as const

export const ENVIRONMENT_NAMES = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test'
} as const

export const PHASE_CONTEXTS = {
  WEB: 'AI.C9d.Web',
  API: 'AI.C9d.API',
  DOCS: 'AI.C9d.Docs'
} as const