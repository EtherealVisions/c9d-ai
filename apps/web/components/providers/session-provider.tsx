'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuth, useSession } from '@clerk/nextjs'
import { sessionManagementService, type SessionInfo } from '@/lib/services/session-management-service'

interface SessionContextValue {
  isSessionActive: boolean
  sessionInfo: SessionInfo | null
  activeSessions: SessionInfo[]
  initializeSession: () => Promise<void>
  updateActivity: () => Promise<void>
  revokeSession: (reason?: string) => Promise<void>
  revokeOtherSessions: () => Promise<void>
  refreshSessions: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

interface SessionProviderProps {
  children: React.ReactNode
}

/**
 * Session Provider Component
 * Manages session state and provides session management functionality
 */
export function SessionProvider({ children }: SessionProviderProps) {
  const { userId, sessionId, orgId, isLoaded } = useAuth()
  const { session } = useSession()
  
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null)
  const [activeSessions, setActiveSessions] = useState<SessionInfo[]>([])
  const [isSessionActive, setIsSessionActive] = useState(false)

  /**
   * Initialize session when user is authenticated
   */
  const initializeSession = async () => {
    if (!userId || !sessionId) return

    try {
      await sessionManagementService.initializeSession(userId, sessionId, orgId || undefined)
      setIsSessionActive(true)
      await refreshSessions()
    } catch (error) {
      console.error('Failed to initialize session:', error)
    }
  }

  /**
   * Update session activity
   */
  const updateActivity = async () => {
    if (!sessionId) return

    try {
      await sessionManagementService.updateSessionActivity(sessionId)
    } catch (error) {
      console.error('Failed to update session activity:', error)
    }
  }

  /**
   * Revoke current session
   */
  const revokeSession = async (reason?: string) => {
    if (!sessionId) return

    try {
      await sessionManagementService.revokeSession(sessionId, reason)
      setIsSessionActive(false)
      setSessionInfo(null)
      setActiveSessions([])
    } catch (error) {
      console.error('Failed to revoke session:', error)
    }
  }

  /**
   * Revoke all other sessions
   */
  const revokeOtherSessions = async () => {
    if (!userId || !sessionId) return

    try {
      await sessionManagementService.revokeOtherSessions(userId, sessionId)
      await refreshSessions()
    } catch (error) {
      console.error('Failed to revoke other sessions:', error)
    }
  }

  /**
   * Refresh session information
   */
  const refreshSessions = async () => {
    if (!userId) return

    try {
      const sessions = await sessionManagementService.getUserActiveSessions(userId)
      setActiveSessions(sessions)
      
      // Find current session
      const currentSession = sessions.find(s => s.sessionId === sessionId)
      setSessionInfo(currentSession || null)
    } catch (error) {
      console.error('Failed to refresh sessions:', error)
    }
  }

  /**
   * Initialize session when authentication is loaded
   */
  useEffect(() => {
    if (isLoaded && userId && sessionId && session?.status === 'active') {
      initializeSession()
    }
  }, [isLoaded, userId, sessionId, session?.status])

  /**
   * Update session activity on user interaction
   */
  useEffect(() => {
    if (!isSessionActive || !sessionId) return

    const handleUserActivity = () => {
      updateActivity()
    }

    // Track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    // Throttle activity updates to avoid excessive API calls
    let lastUpdate = 0
    const throttledUpdate = () => {
      const now = Date.now()
      if (now - lastUpdate > 60000) { // Update at most once per minute
        lastUpdate = now
        handleUserActivity()
      }
    }

    events.forEach(event => {
      document.addEventListener(event, throttledUpdate, { passive: true })
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledUpdate)
      })
    }
  }, [isSessionActive, sessionId])

  /**
   * Periodic session refresh
   */
  useEffect(() => {
    if (!isSessionActive || !userId) return

    const interval = setInterval(() => {
      refreshSessions()
    }, 5 * 60 * 1000) // Refresh every 5 minutes

    return () => clearInterval(interval)
  }, [isSessionActive, userId])

  /**
   * Handle session status changes
   */
  useEffect(() => {
    if (session?.status === 'active') {
      setIsSessionActive(true)
    } else if (session && session.status === 'pending') {
      setIsSessionActive(false)
      setSessionInfo(null)
      setActiveSessions([])
    }
  }, [session?.status])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Cleanup any ongoing operations
      if (sessionId) {
        sessionManagementService.updateSessionActivity(sessionId).catch(console.error)
      }
    }
  }, [sessionId])

  const contextValue: SessionContextValue = {
    isSessionActive,
    sessionInfo,
    activeSessions,
    initializeSession,
    updateActivity,
    revokeSession,
    revokeOtherSessions,
    refreshSessions
  }

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  )
}

/**
 * Hook to use session management context
 */
export function useSessionContext() {
  const context = useContext(SessionContext)
  
  if (!context) {
    throw new Error('useSessionContext must be used within a SessionProvider')
  }
  
  return context
}

/**
 * Hook for session management with automatic initialization
 */
export function useSessionManagement() {
  const context = useSessionContext()
  const { userId, sessionId } = useAuth()

  return {
    ...context,
    isAuthenticated: !!userId,
    currentSessionId: sessionId
  }
}