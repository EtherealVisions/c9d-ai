import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ClerkProvider } from '@clerk/nextjs'
import { AuthProvider } from '@/lib/contexts/auth-context'
import { OrganizationProvider } from '@/lib/contexts/organization-context'
import { getAppConfigSync, initializeAppConfig, isConfigInitialized } from '@/lib/config/init'
import { getConfigManager } from '@/lib/config/manager'
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "C9N.AI - Unlock Deeper Insights",
  description:
    "Leverage AI for relevant information, better analysis, and coordination of disparate, opaque relationships.",
    generator: 'v0.dev'
}

/**
 * Initialize application configuration with comprehensive error handling
 */
async function initializeConfiguration(): Promise<{
  success: boolean;
  error?: Error;
  configManager?: any;
}> {
  try {
    console.log('[Layout] Starting application configuration initialization...');
    
    // Initialize the configuration manager with Phase.dev integration
    await initializeAppConfig();
    
    const configManager = getConfigManager();
    const stats = configManager.getStats();
    
    console.log('[Layout] Configuration initialization completed:', {
      initialized: stats.initialized,
      configCount: stats.configCount,
      phaseConfigured: stats.phaseConfigured,
      healthy: stats.healthy
    });
    
    return { success: true, configManager };
    
  } catch (error) {
    const configError = error instanceof Error ? error : new Error('Unknown configuration error');
    
    console.error('[Layout] Configuration initialization failed:', {
      name: configError.name,
      message: configError.message,
      stack: configError.stack,
      timestamp: new Date().toISOString()
    });
    
    return { success: false, error: configError };
  }
}

/**
 * Get configuration value with fallback handling
 */
function getConfigWithFallback(key: string, fallbackValue?: string): string | undefined {
  try {
    if (isConfigInitialized()) {
      return getAppConfigSync(key) || process.env[key] || fallbackValue;
    }
    return process.env[key] || fallbackValue;
  } catch (error) {
    console.warn(`[Layout] Failed to get config '${key}', using fallback:`, error);
    return process.env[key] || fallbackValue;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Initialize configuration with comprehensive error handling
  const configResult = await initializeConfiguration();
  
  if (!configResult.success && configResult.error) {
    // Log the error but continue with fallback configuration
    console.error('[Layout] Continuing with fallback configuration due to initialization failure');
  }

  // Get Clerk configuration with fallback support
  const clerkPublishableKey = getConfigWithFallback('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
  const hasValidClerkKeys = clerkPublishableKey?.startsWith('pk_');

  // Validate critical configuration
  const criticalConfig = {
    clerkPublishableKey,
    supabaseUrl: getConfigWithFallback('NEXT_PUBLIC_SUPABASE_URL'),
    supabaseAnonKey: getConfigWithFallback('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  };

  // Log configuration status for debugging
  console.log('[Layout] Configuration status:', {
    hasClerkKey: !!clerkPublishableKey,
    hasValidClerkKey: hasValidClerkKeys,
    hasSupabaseUrl: !!criticalConfig.supabaseUrl,
    hasSupabaseAnonKey: !!criticalConfig.supabaseAnonKey,
    configInitialized: isConfigInitialized()
  });

  if (!hasValidClerkKeys) {
    // During build time or when Clerk is not configured, render without ClerkProvider
    console.warn('[Layout] Clerk not properly configured, rendering without authentication');
    
    return (
      <html lang="en" className="dark" style={{ colorScheme: "dark" }}>
        <body className={`${inter.className} bg-c9n-blue-dark text-gray-200 antialiased`}>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Configuration Required</h1>
              <p className="text-gray-400 mb-4">
                The application requires proper configuration to function.
              </p>
              <p className="text-sm text-gray-500">
                Please ensure NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is properly set.
              </p>
            </div>
          </div>
        </body>
      </html>
    )
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <html lang="en" className="dark" style={{ colorScheme: "dark" }}>
        <body className={`${inter.className} bg-c9n-blue-dark text-gray-200 antialiased`}>
          <AuthProvider>
            <OrganizationProvider>
              {children}
            </OrganizationProvider>
          </AuthProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
