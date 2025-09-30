import React from 'react'

interface EnvironmentConfig {
  isDevelopment: boolean
  phaseStatus: {
    success: boolean
    tokenSource?: string | null
    variableCount?: number
  }
  totalVariables: number
}

interface DevelopmentBannerProps {
  envConfig: EnvironmentConfig
  configurationIssues?: string[]
}

export function DevelopmentBanner({ 
  envConfig, 
  configurationIssues 
}: DevelopmentBannerProps) {
  // Add logging to debug the issue
  if (typeof window === 'undefined') {
    console.log('[DevelopmentBanner] Server-side render:', {
      envConfig: envConfig ? 'defined' : 'undefined',
      isDevelopment: envConfig?.isDevelopment,
      phaseStatus: envConfig?.phaseStatus,
      totalVariables: envConfig?.totalVariables
    });
  }

  if (!envConfig?.isDevelopment) return null
  
  const hasIssues = configurationIssues && configurationIssues.length > 0
  const phaseStatus = envConfig.phaseStatus || { success: false }
  
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
              <span>Token: {phaseStatus.tokenSource}</span>
            </>
          )}
          <span>•</span>
          <span>Variables: {envConfig.totalVariables}</span>
        </div>
        
        {hasIssues && (
          <div className="text-xs">
            <span className="font-semibold">Configuration Issues:</span>
            <ul className="list-disc list-inside ml-2">
              {configurationIssues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {hasIssues && (
        <div className="mt-2 text-xs">
          <p>⚠️ Some features may be limited. Check your environment configuration.</p>
        </div>
      )}
    </div>
  )
}
