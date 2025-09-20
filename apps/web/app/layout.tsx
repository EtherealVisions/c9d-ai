import React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ClerkProvider } from '@clerk/nextjs'
import { AuthProvider } from '@/lib/contexts/auth-context'
// import { OrganizationProvider } from '@/lib/contexts/organization-context'
// Build-safe config imports
const isBuildTime = typeof process !== 'undefined' && (
  process.env.NEXT_PHASE === 'phase-production-build' || 
  (process.env.VERCEL === '1' && process.env.CI === '1')
)

let getOptionalEnvVar: any
let validateRequiredEnvVars: any
let EnvironmentFallbackManager: any
let EnvironmentConfig: any

if (isBuildTime) {
  // Build-time stubs
  getOptionalEnvVar = (key: string, defaultValue?: string) => process.env[key] || defaultValue
  validateRequiredEnvVars = () => ({ valid: true, errors: [] })
  EnvironmentFallbackManager = {
    loadWithFallback: async () => ({
      success: false,
      error: 'Build-time stub',
      variables: process.env,
      source: 'build-stub',
      nodeEnv: process.env.NODE_ENV || 'production',
      isDevelopment: false,
      isProduction: true,
      totalVariables: Object.keys(process.env).length,
      phaseStatus: {
        available: false,
        success: false,
        variableCount: 0,
        error: 'Build-time stub',
        source: 'build-stub',
        tokenSource: null
      },
      diagnostics: {
        summary: 'Build-time stub',
        tokenSourceDiagnostics: null
      }
    }),
    validateConfig: () => ({ valid: true, errors: [], isValid: true }),
    createTestConfig: (vars: any) => vars || {},
    getDiagnosticInfo: () => ({ summary: 'Build-time stub' })
  }
} else {
  try {
    const config = require('@c9d/config')
    getOptionalEnvVar = config.getOptionalEnvVar
    validateRequiredEnvVars = config.validateRequiredEnvVars
    EnvironmentFallbackManager = config.EnvironmentFallbackManager
    EnvironmentConfig = config.EnvironmentConfig
  } catch (error) {
    // Runtime fallbacks
    getOptionalEnvVar = (key: string, defaultValue?: string) => process.env[key] || defaultValue
    validateRequiredEnvVars = () => ({ valid: true, errors: [] })
    EnvironmentFallbackManager = {
      loadWithFallback: async () => ({
        success: false,
        error: 'Runtime fallback stub',
        variables: process.env,
        source: 'runtime-stub',
        nodeEnv: process.env.NODE_ENV || 'development',
        isDevelopment: process.env.NODE_ENV !== 'production',
        isProduction: process.env.NODE_ENV === 'production',
        totalVariables: Object.keys(process.env).length,
        phaseStatus: {
          available: false,
          success: false,
          variableCount: 0,
          error: 'Runtime fallback stub',
          source: 'runtime-stub',
          tokenSource: null
        },
        diagnostics: {
          summary: 'Runtime fallback stub',
          tokenSourceDiagnostics: null
        }
      }),
      validateConfig: () => ({ valid: true, errors: [], isValid: true }),
      createTestConfig: (vars: any) => vars || {},
      getDiagnosticInfo: () => ({ summary: 'Runtime fallback stub' })
    }
  }
}
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "C9N.AI - Unlock Deeper Insights",
  description:
    "Leverage AI for relevant information, better analysis, and coordination of disparate, opaque relationships.",
    generator: 'v0.dev'
}

/**
 * Initialize application configuration with Phase.dev SDK integration and token loading
 */
async function initializeConfiguration(): Promise<{
  success: boolean;
  error?: Error;
  envConfig: EnvironmentConfig;
  configurationIssues?: string[];
}> {
  try {
    console.log('[Layout] Starting application configuration initialization with Phase.dev SDK...');
    
    // Use the new EnvironmentFallbackManager with SDK-based configuration
    const envConfig = await EnvironmentFallbackManager.loadWithFallback({
      appName: 'AI.C9d.Web',
      environment: process.env.NODE_ENV || 'development',
      enablePhaseIntegration: true,
      fallbackToLocal: true,
      forceReload: false
    });
    
    // Validate the configuration
    const validation = EnvironmentFallbackManager.validateConfig(envConfig, [
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ]);
    
    // Get diagnostic information
    const diagnostics = EnvironmentFallbackManager.getDiagnosticInfo(envConfig);
    
    // Log comprehensive configuration status
    console.log('[Layout] Configuration initialization completed:', {
      summary: diagnostics.summary,
      nodeEnv: envConfig.nodeEnv,
      isDevelopment: envConfig.isDevelopment,
      isProduction: envConfig.isProduction,
      phaseAvailable: envConfig.phaseAvailable,
      phaseConfigLoaded: envConfig.phaseConfigLoaded,
      phaseVariableCount: envConfig.phaseVariableCount,
      loadedFiles: envConfig.loadedFiles,
      totalVariables: envConfig.totalVariables,
      phaseStatus: envConfig.phaseStatus,
      tokenSource: envConfig.phaseStatus.tokenSource?.source,
      validation: {
        isValid: validation.isValid,
        missingVars: validation.missingVars,
        warnings: validation.warnings
      }
    });
    
    // Log token source information for debugging
    if (envConfig.phaseStatus.tokenSource) {
      console.log(`[Layout] Phase.dev token loaded from: ${envConfig.phaseStatus.tokenSource.source}`);
      if (envConfig.phaseStatus.tokenSource.path) {
        console.log(`[Layout] Token file path: ${envConfig.phaseStatus.tokenSource.path}`);
      }
    } else if (envConfig.diagnostics.tokenSourceDiagnostics) {
      console.log('[Layout] Token source diagnostics:', envConfig.diagnostics.tokenSourceDiagnostics);
    }
    
    // Collect configuration issues for user display
    const configurationIssues: string[] = [];
    
    if (!validation.isValid) {
      configurationIssues.push(`Missing required variables: ${validation.missingVars.join(', ')}`);
    }
    
    if (validation.warnings.length > 0) {
      configurationIssues.push(...validation.warnings);
    }
    
    if (envConfig.phaseStatus.error && envConfig.phaseStatus.available) {
      configurationIssues.push(`Phase.dev error: ${envConfig.phaseStatus.error}`);
    }
    
    if (!envConfig.phaseStatus.available && envConfig.isDevelopment) {
      configurationIssues.push('Phase.dev not available - add PHASE_SERVICE_TOKEN for cloud configuration');
    }
    
    // Add recommendations for better configuration
    if (diagnostics.recommendations.length > 0) {
      console.log('[Layout] Configuration recommendations:', diagnostics.recommendations);
    }
    
    return { 
      success: true, 
      envConfig, 
      configurationIssues: configurationIssues.length > 0 ? configurationIssues : undefined 
    };
    
  } catch (error) {
    const configError = error instanceof Error ? error : new Error('Unknown configuration error');
    
    console.error('[Layout] Configuration initialization failed:', {
      name: configError.name,
      message: configError.message,
      stack: configError.stack,
      timestamp: new Date().toISOString()
    });
    
    // Create minimal fallback configuration
    const fallbackConfig = EnvironmentFallbackManager.createTestConfig(
      {
        NODE_ENV: process.env.NODE_ENV || 'development',
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '',
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      },
      {
        phaseStatus: {
          available: false,
          success: false,
          variableCount: 0,
          error: configError.message,
          source: 'fallback'
        }
      }
    );
    
    return { 
      success: false, 
      error: configError, 
      envConfig: fallbackConfig,
      configurationIssues: [`Configuration initialization failed: ${configError.message}`]
    };
  }
}

/**
 * Configuration Error Display Component
 */
function ConfigurationErrorDisplay({ 
  error, 
  configurationIssues, 
  envConfig 
}: { 
  error?: Error; 
  configurationIssues?: string[];
  envConfig: EnvironmentConfig;
}) {
  const isDevelopment = envConfig.isDevelopment;
  
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }}>
      <body className={`${inter.className} bg-c9n-blue-dark text-gray-200 antialiased`}>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-4 text-red-400">Configuration Error</h1>
              <p className="text-gray-400 mb-6">
                {error ? 'Application configuration failed to initialize.' : 'Configuration issues detected.'}
              </p>
            </div>
            
            {/* Configuration Issues */}
            {configurationIssues && configurationIssues.length > 0 && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 mb-6">
                <h2 className="text-lg font-semibold text-red-300 mb-4">Configuration Issues:</h2>
                <ul className="space-y-2">
                  {configurationIssues.map((issue, index) => (
                    <li key={index} className="text-red-200 flex items-start">
                      <span className="text-red-400 mr-2">•</span>
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Phase.dev Status */}
            <div className="bg-gray-800/50 border border-gray-600/30 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-300 mb-4">Phase.dev Status:</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Available:</span>
                  <span className={envConfig.phaseStatus.available ? 'text-green-400' : 'text-red-400'}>
                    {envConfig.phaseStatus.available ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className={envConfig.phaseStatus.success ? 'text-green-400' : 'text-yellow-400'}>
                    {envConfig.phaseStatus.success ? 'Success' : 'Fallback'}
                  </span>
                </div>
                {envConfig.phaseStatus.tokenSource && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Token Source:</span>
                    <span className="text-blue-400">{envConfig.phaseStatus.tokenSource.source}</span>
                  </div>
                )}
                {envConfig.phaseStatus.error && (
                  <div className="mt-2 p-2 bg-red-900/20 rounded text-red-300 text-xs">
                    {envConfig.phaseStatus.error}
                  </div>
                )}
              </div>
            </div>
            
            {/* Environment Details */}
            <div className="bg-gray-800/50 border border-gray-600/30 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-300 mb-4">Environment Details:</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Environment:</span>
                  <span className="ml-2 text-blue-400">{envConfig.nodeEnv}</span>
                </div>
                <div>
                  <span className="text-gray-400">Total Variables:</span>
                  <span className="ml-2 text-green-400">{envConfig.totalVariables}</span>
                </div>
                <div>
                  <span className="text-gray-400">Loaded Files:</span>
                  <span className="ml-2 text-yellow-400">{envConfig.loadedFiles.length}</span>
                </div>
                <div>
                  <span className="text-gray-400">Phase Variables:</span>
                  <span className="ml-2 text-purple-400">{envConfig.phaseVariableCount}</span>
                </div>
              </div>
              
              {envConfig.loadedFiles.length > 0 && (
                <div className="mt-4">
                  <span className="text-gray-400 text-sm">Loaded Files:</span>
                  <div className="mt-1 text-xs text-gray-500">
                    {envConfig.loadedFiles.join(', ')}
                  </div>
                </div>
              )}
            </div>
            
            {/* Development Mode Instructions */}
            {isDevelopment && (
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-blue-300 mb-4">Development Setup:</h2>
                <div className="space-y-3 text-sm text-blue-200">
                  <p>To resolve configuration issues:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Add PHASE_SERVICE_TOKEN to your .env.local file</li>
                    <li>Ensure NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set</li>
                    <li>Verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
                    <li>Check Phase.dev console for app configuration</li>
                  </ol>
                </div>
              </div>
            )}
            
            {/* Error Details (Development Only) */}
            {error && isDevelopment && (
              <div className="mt-6 bg-gray-900/50 border border-gray-700/30 rounded-lg p-4">
                <details className="text-sm">
                  <summary className="text-gray-400 cursor-pointer hover:text-gray-300">
                    Error Details (Development)
                  </summary>
                  <div className="mt-2 p-2 bg-black/30 rounded text-xs text-gray-500 font-mono overflow-auto">
                    <div className="text-red-400">{error.name}: {error.message}</div>
                    {error.stack && (
                      <pre className="mt-2 whitespace-pre-wrap">{error.stack}</pre>
                    )}
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}

/**
 * Development Configuration Banner Component
 */
function DevelopmentBanner({ 
  envConfig, 
  configurationIssues 
}: { 
  envConfig: EnvironmentConfig;
  configurationIssues?: string[];
}) {
  if (!envConfig.isDevelopment) return null;
  
  const hasIssues = configurationIssues && configurationIssues.length > 0;
  const phaseStatus = envConfig.phaseStatus;
  
  return (
    <div className={`px-4 py-2 text-sm ${hasIssues ? 'bg-yellow-600 text-yellow-100' : 'bg-blue-600 text-blue-100'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="font-semibold">Development Mode</span>
          <span>•</span>
          <span>Phase.dev: {phaseStatus.success ? '✓ Active' : '⚠ Fallback'}</span>
          {phaseStatus.tokenSource && (
            <>
              <span>•</span>
              <span>Token: {phaseStatus.tokenSource.source}</span>
            </>
          )}
          <span>•</span>
          <span>Variables: {envConfig.totalVariables}</span>
        </div>
        
        {hasIssues && (
          <div className="text-xs">
            {configurationIssues.length} issue{configurationIssues.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
      
      {hasIssues && (
        <div className="mt-1 text-xs opacity-90">
          Issues: {configurationIssues.slice(0, 2).join(', ')}
          {configurationIssues.length > 2 && ` (+${configurationIssues.length - 2} more)`}
        </div>
      )}
    </div>
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Initialize configuration with comprehensive error handling and token loading
  const configResult = await initializeConfiguration();
  
  if (!configResult.success && configResult.error) {
    console.error('[Layout] Configuration initialization failed, showing error display');
  }

  const { envConfig, configurationIssues } = configResult;

  // Get Clerk configuration from the loaded environment
  const clerkPublishableKey = envConfig.variables.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const hasValidClerkKeys = clerkPublishableKey?.startsWith('pk_');

  // Validate critical configuration
  const criticalConfig = {
    clerkPublishableKey,
    supabaseUrl: envConfig.variables.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: envConfig.variables.NEXT_PUBLIC_SUPABASE_ANON_KEY
  };

  // Log configuration status for debugging
  console.log('[Layout] Final configuration status:', {
    hasClerkKey: !!clerkPublishableKey,
    hasValidClerkKey: hasValidClerkKeys,
    hasSupabaseUrl: !!criticalConfig.supabaseUrl,
    hasSupabaseAnonKey: !!criticalConfig.supabaseAnonKey,
    phaseStatus: envConfig.phaseStatus.success ? 'active' : 'fallback',
    tokenSource: envConfig.phaseStatus.tokenSource?.source,
    totalVariables: envConfig.totalVariables,
    configurationIssues: configurationIssues?.length || 0
  });

  // Check if we're in development with test keys
  const isDevelopment = envConfig.isDevelopment;
  const isTestKey = clerkPublishableKey?.includes('test') || clerkPublishableKey?.includes('development');
  const isValidProductionKey = clerkPublishableKey?.startsWith('pk_live_');
  
  // Show configuration error display for critical issues in production
  if (!isDevelopment) {
    const missingCriticalVars = [];
    if (!clerkPublishableKey) missingCriticalVars.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
    if (!criticalConfig.supabaseUrl) missingCriticalVars.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!criticalConfig.supabaseAnonKey) missingCriticalVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    
    // In production, require live keys
    if (clerkPublishableKey && !isValidProductionKey) {
      missingCriticalVars.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (production key required)');
    }
    
    if (missingCriticalVars.length > 0) {
      const productionError = new Error(`Critical environment variables missing in production: ${missingCriticalVars.join(', ')}`);
      console.error('[Layout] Critical configuration missing in production:', productionError);
      
      return (
        <ConfigurationErrorDisplay 
          error={productionError}
          configurationIssues={[`Missing critical variables: ${missingCriticalVars.join(', ')}`]}
          envConfig={envConfig}
        />
      );
    }
  }
  
  // Show configuration error display for development issues that prevent startup
  if (configResult.error && (!clerkPublishableKey || !criticalConfig.supabaseUrl)) {
    return (
      <ConfigurationErrorDisplay 
        error={configResult.error}
        configurationIssues={configurationIssues}
        envConfig={envConfig}
      />
    );
  }
  
  // Determine if Clerk should be enabled
  // In development: allow test keys (pk_test_) or live keys (pk_live_)
  // In production: only allow live keys (pk_live_)
  const shouldEnableClerk = hasValidClerkKeys && (isDevelopment || isValidProductionKey);
  
  if (!shouldEnableClerk) {
    const reason = !hasValidClerkKeys 
      ? 'Invalid or missing Clerk publishable key'
      : !isDevelopment && !isValidProductionKey
      ? 'Production environment requires live Clerk key (pk_live_)'
      : 'Unknown Clerk configuration issue';
      
    console.warn(`[Layout] Clerk disabled: ${reason}`);
    
    return (
      <html lang="en" className="dark" style={{ colorScheme: "dark" }}>
        <body className={`${inter.className} bg-c9n-blue-dark text-gray-200 antialiased`}>
          <div className="min-h-screen">
            <DevelopmentBanner envConfig={envConfig} configurationIssues={configurationIssues} />
            <AuthProvider>
              {/* <OrganizationProvider> */}
                {children}
              {/* </OrganizationProvider> */}
            </AuthProvider>
          </div>
        </body>
      </html>
    );
  }

  // Render with ClerkProvider for properly configured authentication
  console.log(`[Layout] Enabling Clerk authentication with ${isTestKey ? 'test' : 'live'} key`);
  
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }}>
      <body className={`${inter.className} bg-c9n-blue-dark text-gray-200 antialiased`}>
        {await ClerkProvider({ publishableKey: clerkPublishableKey, children: (
          <>
            <DevelopmentBanner envConfig={envConfig} configurationIssues={configurationIssues} />
            <AuthProvider>
              {/* <OrganizationProvider> */}
              {children}
              {/* </OrganizationProvider> */}
            </AuthProvider>
          </>
        ) })}
      </body>
    </html>
  );
}
