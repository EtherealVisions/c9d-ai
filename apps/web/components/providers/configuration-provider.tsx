'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { EnvironmentFallbackManager, type EnvironmentConfig } from '@c9d/config'

interface ConfigurationState {
  isLoading: boolean
  isLoaded: boolean
  config: EnvironmentConfig | null
  error: Error | null
}

const ConfigurationContext = createContext<ConfigurationState>({
  isLoading: true,
  isLoaded: false,
  config: null,
  error: null
})

export function useConfiguration() {
  return useContext(ConfigurationContext)
}

interface ConfigurationProviderProps {
  children: React.ReactNode
  fallbackConfig?: EnvironmentConfig
}

export function ConfigurationProvider({ 
  children, 
  fallbackConfig 
}: ConfigurationProviderProps) {
  const [state, setState] = useState<ConfigurationState>({
    isLoading: true,
    isLoaded: false,
    config: fallbackConfig || null,
    error: null
  })

  useEffect(() => {
    let mounted = true

    async function loadConfiguration() {
      try {
        console.log('[ConfigurationProvider] Loading client-side configuration...')
        
        const envConfig = await EnvironmentFallbackManager.loadWithFallback({
          appName: 'AI.C9d.Web',
          environment: process.env.NODE_ENV || 'development',
          enablePhaseIntegration: true,
          fallbackToLocal: true,
          forceReload: false
        })

        if (mounted) {
          setState({
            isLoading: false,
            isLoaded: true,
            config: envConfig,
            error: null
          })
          console.log('[ConfigurationProvider] Configuration loaded successfully')
        }
      } catch (error) {
        console.error('[ConfigurationProvider] Configuration loading failed:', error)
        
        if (mounted) {
          setState({
            isLoading: false,
            isLoaded: false,
            config: fallbackConfig || null,
            error: error instanceof Error ? error : new Error('Configuration loading failed')
          })
        }
      }
    }

    // Only load if we don't have a config or if we're in development
    if (!state.config || process.env.NODE_ENV === 'development') {
      loadConfiguration()
    } else {
      setState(prev => ({ ...prev, isLoading: false, isLoaded: true }))
    }

    return () => {
      mounted = false
    }
  }, [fallbackConfig])

  return (
    <ConfigurationContext.Provider value={state}>
      {children}
    </ConfigurationContext.Provider>
  )
}