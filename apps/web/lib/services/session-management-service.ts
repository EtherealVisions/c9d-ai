/**
 * Session Management Service
 * Handles secure session management, automatic token refresh, and cross-device synchronization
 */

import { useAuth, useSession } from '@clerk/nextjs'

export interface SessionInfo {
  sessionId: string
  userId: string
  organizationId?: string
  deviceInfo: DeviceInfo
  lastActivity: Date
  expiresAt: Date
  isActive: boolean
}

export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet'
  os: string
  browser: string
  userAgent: string
  ipAddress?: string
  location?: string
}

export interface SessionEvent {
  type: 'session_created' | 'session_updated' | 'session_expired' | 'session_revoked'
  sessionId: string
  userId: string
  timestamp: Date
  metadata?: Record<string, any>
}

export class SessionManagementService {
  private getDatabase() {
    const { getDatabase } = require('@/lib/db/connection')
    return getDatabase()
  }
  
  private sessionCheckInterval: NodeJS.Timeout | null = null
  private readonly SESSION_CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes
  private readonly SESSION_REFRESH_THRESHOLD = 10 * 60 * 1000 // 10 minutes before expiry

  /**
   * Initialize session management for the current user
   */
  async initializeSession(userId: string, sessionId: string, organizationId?: string): Promise<void> {
    try {
      const deviceInfo = this.getDeviceInfo()
      
      // Record session in database with error handling
      try {
        await this.recordSession({
          sessionId,
          userId,
          organizationId,
          deviceInfo,
          lastActivity: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          isActive: true
        })
      } catch (recordError) {
        console.warn('[SessionManagement] Failed to record session in database:', recordError)
        // Continue with session initialization even if database recording fails
      }

      // Start session monitoring
      this.startSessionMonitoring()

      // Log session event
      await this.logSessionEvent({
        type: 'session_created',
        sessionId,
        userId,
        timestamp: new Date(),
        metadata: { deviceInfo, organizationId }
      })

    } catch (error) {
      console.error('Error initializing session:', error)
      throw error
    }
  }

  /**
   * Update session activity and refresh if needed
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      const now = new Date()
      
      // Update last activity
      const { error } = await this.supabase
        .from('user_sessions')
        .update({
          last_activity: now.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('session_id', sessionId)
        .eq('is_active', true)

      if (error) {
        console.error('Error updating session activity:', error)
      }

    } catch (error) {
      console.error('Error updating session activity:', error)
    }
  }

  /**
   * Check if session needs refresh and handle it
   */
  async checkAndRefreshSession(sessionId: string): Promise<boolean> {
    try {
      const { data: session } = await this.supabase
        .from('user_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .single()

      if (!session) {
        return false
      }

      const expiresAt = new Date(session.expires_at)
      const now = new Date()
      const timeUntilExpiry = expiresAt.getTime() - now.getTime()

      // If session expires within threshold, attempt refresh
      if (timeUntilExpiry <= this.SESSION_REFRESH_THRESHOLD) {
        return await this.refreshSession(sessionId)
      }

      return true
    } catch (error) {
      console.error('Error checking session:', error)
      return false
    }
  }

  /**
   * Refresh session with Clerk and update database
   */
  async refreshSession(sessionId: string): Promise<boolean> {
    try {
      // Note: Clerk handles token refresh automatically
      // We just need to update our database record
      const newExpiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

      const { error } = await this.supabase
        .from('user_sessions')
        .update({
          expires_at: newExpiryTime.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .eq('is_active', true)

      if (error) {
        console.error('Error refreshing session:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error refreshing session:', error)
      return false
    }
  }

  /**
   * Revoke session (sign out)
   */
  async revokeSession(sessionId: string, reason: string = 'user_logout'): Promise<void> {
    try {
      // Mark session as inactive
      const { error } = await this.supabase
        .from('user_sessions')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoke_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)

      if (error) {
        console.error('Error revoking session:', error)
      }

      // Log session event
      const { data: session } = await this.supabase
        .from('user_sessions')
        .select('user_id')
        .eq('session_id', sessionId)
        .single()

      if (session) {
        await this.logSessionEvent({
          type: 'session_revoked',
          sessionId,
          userId: session.user_id,
          timestamp: new Date(),
          metadata: { reason }
        })
      }

      // Stop session monitoring
      this.stopSessionMonitoring()

    } catch (error) {
      console.error('Error revoking session:', error)
      throw error
    }
  }

  /**
   * Get all active sessions for a user (cross-device support)
   */
  async getUserActiveSessions(userId: string): Promise<SessionInfo[]> {
    try {
      const { data: sessions, error } = await this.supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('last_activity', { ascending: false })

      if (error) {
        console.error('Error getting user sessions:', error)
        return []
      }

      return sessions.map((session: any) => ({
        sessionId: session.session_id,
        userId: session.user_id,
        organizationId: session.organization_id,
        deviceInfo: session.device_info,
        lastActivity: new Date(session.last_activity),
        expiresAt: new Date(session.expires_at),
        isActive: session.is_active
      }))

    } catch (error) {
      console.error('Error getting user sessions:', error)
      return []
    }
  }

  /**
   * Revoke all sessions for a user except current one
   */
  async revokeOtherSessions(userId: string, currentSessionId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('user_sessions')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoke_reason: 'revoked_by_user',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('is_active', true)
        .neq('session_id', currentSessionId)

      if (error) {
        console.error('Error revoking other sessions:', error)
        throw error
      }

      // Log session event
      await this.logSessionEvent({
        type: 'session_revoked',
        sessionId: 'multiple',
        userId,
        timestamp: new Date(),
        metadata: { reason: 'revoked_by_user', currentSession: currentSessionId }
      })

    } catch (error) {
      console.error('Error revoking other sessions:', error)
      throw error
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const now = new Date()
      
      // Mark expired sessions as inactive
      const { error } = await this.supabase
        .from('user_sessions')
        .update({
          is_active: false,
          revoked_at: now.toISOString(),
          revoke_reason: 'expired',
          updated_at: now.toISOString()
        })
        .eq('is_active', true)
        .lt('expires_at', now.toISOString())

      if (error) {
        console.error('Error cleaning up expired sessions:', error)
      }

    } catch (error) {
      console.error('Error cleaning up expired sessions:', error)
    }
  }

  /**
   * Start automatic session monitoring
   */
  private startSessionMonitoring(): void {
    if (this.sessionCheckInterval) {
      return // Already monitoring
    }

    this.sessionCheckInterval = setInterval(async () => {
      try {
        // Clean up expired sessions
        await this.cleanupExpiredSessions()
        
        // Check current session if available
        if (typeof window !== 'undefined') {
          const sessionId = localStorage.getItem('clerk-session-id')
          if (sessionId) {
            await this.updateSessionActivity(sessionId)
            await this.checkAndRefreshSession(sessionId)
          }
        }
      } catch (error) {
        console.error('Error in session monitoring:', error)
      }
    }, this.SESSION_CHECK_INTERVAL)
  }

  /**
   * Stop session monitoring
   */
  private stopSessionMonitoring(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval)
      this.sessionCheckInterval = null
    }
  }

  /**
   * Record session in database
   */
  private async recordSession(sessionInfo: SessionInfo): Promise<void> {
    try {
      // Check if we're in a test environment and skip database operations
      if (process.env.NODE_ENV === 'test' && !process.env.SUPABASE_URL) {
        console.log('[SessionManagement] Skipping database recording in test environment')
        return
      }

      const { error } = await this.supabase
        .from('user_sessions')
        .upsert({
          session_id: sessionInfo.sessionId,
          user_id: sessionInfo.userId,
          organization_id: sessionInfo.organizationId,
          device_info: sessionInfo.deviceInfo,
          last_activity: sessionInfo.lastActivity.toISOString(),
          expires_at: sessionInfo.expiresAt.toISOString(),
          is_active: sessionInfo.isActive,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.warn('[SessionManagement] Database error recording session:', error)
        // Don't throw in production to avoid breaking user experience
        if (process.env.NODE_ENV === 'development') {
          throw error
        }
      }
    } catch (error) {
      console.warn('[SessionManagement] Failed to record session:', error)
      // Don't throw in production to avoid breaking user experience
      if (process.env.NODE_ENV === 'development') {
        throw error
      }
    }
  }

  /**
   * Log session event for audit trail
   */
  private async logSessionEvent(event: SessionEvent): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('session_events')
        .insert({
          event_type: event.type,
          session_id: event.sessionId,
          user_id: event.userId,
          timestamp: event.timestamp.toISOString(),
          metadata: event.metadata || {},
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error logging session event:', error)
      }
    } catch (error) {
      console.error('Error logging session event:', error)
    }
  }

  /**
   * Validate session ID format
   */
  validateSessionId(sessionId: string): void {
    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error('Session ID is required')
    }
    if (sessionId.length < 3) {
      throw new Error('Session ID must be at least 3 characters')
    }
  }

  /**
   * Validate user ID format
   */
  validateUserId(userId: string): void {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required')
    }
  }

  /**
   * Calculate session expiry time
   */
  calculateSessionExpiry(durationMs: number = 24 * 60 * 60 * 1000): Date {
    return new Date(Date.now() + durationMs)
  }

  /**
   * Check if session is near expiry (within 1 hour)
   */
  isSessionNearExpiry(expiresAt: Date): boolean {
    const now = Date.now()
    const expiry = expiresAt.getTime()
    const oneHour = 60 * 60 * 1000
    return (expiry - now) <= oneHour
  }

  /**
   * Parse user agent string
   */
  parseUserAgent(userAgent: string): { browser: string; os: string; deviceType: string } {
    if (!userAgent || typeof userAgent !== 'string' || userAgent.trim() === '') {
      return { browser: 'Unknown', os: 'Unknown', deviceType: 'unknown' }
    }

    // Detect device type
    let deviceType = 'desktop'
    if (/Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      deviceType = /iPad|tablet/i.test(userAgent) ? 'tablet' : 'mobile'
    }

    // Detect OS
    let os = 'Unknown'
    if (/Windows/i.test(userAgent)) os = 'Windows'
    else if (/Mac/i.test(userAgent)) os = 'macOS'
    else if (/Linux/i.test(userAgent)) os = 'Linux'
    else if (/Android/i.test(userAgent)) os = 'Android'
    else if (/iOS|iPhone|iPad/i.test(userAgent)) os = 'iOS'

    // Detect browser
    let browser = 'Unknown'
    if (/Chrome/i.test(userAgent)) browser = 'Chrome'
    else if (/Firefox/i.test(userAgent)) browser = 'Firefox'
    else if (/Safari/i.test(userAgent)) browser = 'Safari'
    else if (/Edge/i.test(userAgent)) browser = 'Edge'
    else if (/Opera/i.test(userAgent)) browser = 'Opera'

    return { browser, os, deviceType }
  }

  /**
   * Validate IP address format
   */
  isValidIPAddress(ip: string): boolean {
    if (!ip || typeof ip !== 'string') return false
    
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    return ipv4Regex.test(ip)
  }

  /**
   * Get default session duration in milliseconds
   */
  getDefaultSessionDuration(): number {
    return 24 * 60 * 60 * 1000 // 24 hours
  }

  /**
   * Get session refresh threshold in milliseconds
   */
  getSessionRefreshThreshold(): number {
    return 60 * 60 * 1000 // 1 hour
  }

  /**
   * Get maximum concurrent sessions allowed
   */
  getMaxConcurrentSessions(): number {
    return 5
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): DeviceInfo {
    if (typeof window === 'undefined') {
      return {
        type: 'desktop',
        os: 'unknown',
        browser: 'unknown',
        userAgent: 'server'
      }
    }

    const userAgent = navigator.userAgent
    
    // Detect device type
    let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop'
    if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      deviceType = /iPad|tablet/i.test(userAgent) ? 'tablet' : 'mobile'
    }

    // Detect OS
    let os = 'unknown'
    if (/Windows/i.test(userAgent)) os = 'Windows'
    else if (/Mac/i.test(userAgent)) os = 'macOS'
    else if (/Linux/i.test(userAgent)) os = 'Linux'
    else if (/Android/i.test(userAgent)) os = 'Android'
    else if (/iOS|iPhone|iPad/i.test(userAgent)) os = 'iOS'

    // Detect browser
    let browser = 'unknown'
    if (/Chrome/i.test(userAgent)) browser = 'Chrome'
    else if (/Firefox/i.test(userAgent)) browser = 'Firefox'
    else if (/Safari/i.test(userAgent)) browser = 'Safari'
    else if (/Edge/i.test(userAgent)) browser = 'Edge'
    else if (/Opera/i.test(userAgent)) browser = 'Opera'

    return {
      type: deviceType,
      os,
      browser,
      userAgent
    }
  }
}

// Export singleton instance
export const sessionManagementService = new SessionManagementService()

/**
 * React hook for session management
 */
export function useSessionManagement() {
  const { userId, sessionId, orgId } = useAuth()
  const { session } = useSession()

  const initializeSession = async () => {
    if (userId && sessionId) {
      await sessionManagementService.initializeSession(userId, sessionId, orgId || undefined)
    }
  }

  const updateActivity = async () => {
    if (sessionId) {
      await sessionManagementService.updateSessionActivity(sessionId)
    }
  }

  const revokeSession = async (reason?: string) => {
    if (sessionId) {
      await sessionManagementService.revokeSession(sessionId, reason)
    }
  }

  const getUserSessions = async () => {
    if (userId) {
      return await sessionManagementService.getUserActiveSessions(userId)
    }
    return []
  }

  const revokeOtherSessions = async () => {
    if (userId && sessionId) {
      await sessionManagementService.revokeOtherSessions(userId, sessionId)
    }
  }

  return {
    initializeSession,
    updateActivity,
    revokeSession,
    getUserSessions,
    revokeOtherSessions,
    isSessionActive: session?.status === 'active'
  }
}