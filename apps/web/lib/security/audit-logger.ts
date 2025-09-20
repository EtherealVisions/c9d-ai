/**
 * Security Audit Logger
 * 
 * This module provides comprehensive audit logging for all authentication events
 * with security monitoring, compliance features, and incident detection.
 */

import { z } from 'zod'

// Types for audit logging
export interface AuditEvent {
  id: string
  timestamp: number
  eventType: AuditEventType
  severity: AuditSeverity
  userId?: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string
  resource?: string
  action: string
  outcome: AuditOutcome
  details: Record<string, any>
  riskScore: number
  complianceFlags: ComplianceFlag[]
  metadata: AuditMetadata
}

export interface AuditMetadata {
  requestId?: string
  correlationId?: string
  source: string
  version: string
  environment: string
  geolocation?: {
    country?: string
    region?: string
    city?: string
    coordinates?: [number, number]
  }
  deviceFingerprint?: string
  threatIntelligence?: ThreatIntelligence
}

export interface ThreatIntelligence {
  ipReputation?: 'clean' | 'suspicious' | 'malicious'
  knownAttacker?: boolean
  botDetection?: 'human' | 'bot' | 'suspicious'
  vpnDetection?: boolean
  torDetection?: boolean
}

export interface ComplianceFlag {
  regulation: ComplianceRegulation
  requirement: string
  status: 'compliant' | 'non_compliant' | 'requires_review'
  details?: string
}

export enum AuditEventType {
  // Authentication Events
  AUTHENTICATION_ATTEMPT = 'authentication_attempt',
  AUTHENTICATION_SUCCESS = 'authentication_success',
  AUTHENTICATION_FAILURE = 'authentication_failure',
  LOGOUT = 'logout',
  SESSION_CREATED = 'session_created',
  SESSION_EXPIRED = 'session_expired',
  SESSION_TERMINATED = 'session_terminated',
  
  // Account Management
  ACCOUNT_CREATED = 'account_created',
  ACCOUNT_UPDATED = 'account_updated',
  ACCOUNT_DELETED = 'account_deleted',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  ACCOUNT_SUSPENDED = 'account_suspended',
  
  // Password Management
  PASSWORD_CHANGED = 'password_changed',
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  PASSWORD_RESET_COMPLETED = 'password_reset_completed',
  PASSWORD_POLICY_VIOLATION = 'password_policy_violation',
  
  // Multi-Factor Authentication
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  MFA_CHALLENGE_SENT = 'mfa_challenge_sent',
  MFA_CHALLENGE_SUCCESS = 'mfa_challenge_success',
  MFA_CHALLENGE_FAILURE = 'mfa_challenge_failure',
  MFA_BACKUP_CODE_USED = 'mfa_backup_code_used',
  
  // Security Events
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  BRUTE_FORCE_ATTEMPT = 'brute_force_attempt',
  ACCOUNT_TAKEOVER_ATTEMPT = 'account_takeover_attempt',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  UNAUTHORIZED_ACCESS_ATTEMPT = 'unauthorized_access_attempt',
  
  // Data Access
  SENSITIVE_DATA_ACCESS = 'sensitive_data_access',
  DATA_EXPORT = 'data_export',
  DATA_DELETION = 'data_deletion',
  GDPR_REQUEST = 'gdpr_request',
  
  // System Events
  SECURITY_POLICY_CHANGE = 'security_policy_change',
  CONFIGURATION_CHANGE = 'configuration_change',
  SECURITY_INCIDENT = 'security_incident',
  COMPLIANCE_VIOLATION = 'compliance_violation'
}

export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum AuditOutcome {
  SUCCESS = 'success',
  FAILURE = 'failure',
  BLOCKED = 'blocked',
  PENDING = 'pending'
}

export enum ComplianceRegulation {
  GDPR = 'gdpr',
  CCPA = 'ccpa',
  SOX = 'sox',
  HIPAA = 'hipaa',
  PCI_DSS = 'pci_dss',
  ISO_27001 = 'iso_27001',
  SOC2 = 'soc2'
}

/**
 * Security Audit Logger Service
 */
export class SecurityAuditLogger {
  private static instance: SecurityAuditLogger
  private eventQueue: AuditEvent[] = []
  private batchSize: number = 50
  private flushInterval: number = 10000 // 10 seconds
  private flushTimer?: NodeJS.Timeout
  private riskThreshold: number = 7 // Out of 10

  constructor() {
    this.startBatchFlush()
  }

  static getInstance(): SecurityAuditLogger {
    if (!SecurityAuditLogger.instance) {
      SecurityAuditLogger.instance = new SecurityAuditLogger()
    }
    return SecurityAuditLogger.instance
  }

  /**
   * Log authentication event with security analysis
   */
  async logAuthEvent(
    eventType: AuditEventType,
    action: string,
    outcome: AuditOutcome,
    details: Record<string, any> = {},
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    const event = await this.createAuditEvent(
      eventType,
      action,
      outcome,
      details,
      userId,
      sessionId
    )

    // Perform real-time security analysis
    await this.performSecurityAnalysis(event)

    // Add to queue for batch processing
    this.eventQueue.push(event)

    // Check for immediate security concerns
    if (event.severity === AuditSeverity.CRITICAL || event.riskScore >= this.riskThreshold) {
      await this.handleSecurityIncident(event)
    }

    // Flush if queue is full
    if (this.eventQueue.length >= this.batchSize) {
      await this.flush()
    }
  }

  /**
   * Log account management event
   */
  async logAccountEvent(
    eventType: AuditEventType,
    action: string,
    outcome: AuditOutcome,
    details: Record<string, any> = {},
    userId?: string
  ): Promise<void> {
    await this.logAuthEvent(eventType, action, outcome, details, userId)
  }

  /**
   * Log security incident
   */
  async logSecurityIncident(
    incidentType: string,
    severity: AuditSeverity,
    details: Record<string, any> = {},
    userId?: string
  ): Promise<void> {
    await this.logAuthEvent(
      AuditEventType.SECURITY_INCIDENT,
      incidentType,
      AuditOutcome.BLOCKED,
      {
        ...details,
        incidentType,
        automated: true
      },
      userId
    )
  }

  /**
   * Log compliance event
   */
  async logComplianceEvent(
    regulation: ComplianceRegulation,
    requirement: string,
    status: 'compliant' | 'non_compliant' | 'requires_review',
    details: Record<string, any> = {},
    userId?: string
  ): Promise<void> {
    await this.logAuthEvent(
      AuditEventType.COMPLIANCE_VIOLATION,
      `${regulation}_${requirement}`,
      status === 'compliant' ? AuditOutcome.SUCCESS : AuditOutcome.FAILURE,
      {
        ...details,
        regulation,
        requirement,
        complianceStatus: status
      },
      userId
    )
  }

  /**
   * Log GDPR data request
   */
  async logGDPRRequest(
    requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction',
    userId: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.logAuthEvent(
      AuditEventType.GDPR_REQUEST,
      `gdpr_${requestType}`,
      AuditOutcome.PENDING,
      {
        ...details,
        requestType,
        gdprArticle: this.getGDPRArticle(requestType)
      },
      userId
    )
  }

  /**
   * Create comprehensive audit event
   */
  private async createAuditEvent(
    eventType: AuditEventType,
    action: string,
    outcome: AuditOutcome,
    details: Record<string, any>,
    userId?: string,
    sessionId?: string
  ): Promise<AuditEvent> {
    const timestamp = Date.now()
    const id = this.generateEventId(timestamp)
    
    // Get request context if available
    const context = await this.getRequestContext()
    
    // Calculate risk score
    const riskScore = await this.calculateRiskScore(eventType, outcome, details, context)
    
    // Determine severity
    const severity = this.determineSeverity(eventType, outcome, riskScore)
    
    // Check compliance flags
    const complianceFlags = await this.checkComplianceFlags(eventType, details, userId)
    
    // Get threat intelligence
    const threatIntelligence = await this.getThreatIntelligence(context.ipAddress)

    return {
      id,
      timestamp,
      eventType,
      severity,
      userId,
      sessionId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      resource: context.resource,
      action,
      outcome,
      details,
      riskScore,
      complianceFlags,
      metadata: {
        requestId: context.requestId,
        correlationId: context.correlationId,
        source: 'auth-system',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        geolocation: context.geolocation,
        deviceFingerprint: context.deviceFingerprint,
        threatIntelligence
      }
    }
  }

  /**
   * Perform real-time security analysis
   */
  private async performSecurityAnalysis(event: AuditEvent): Promise<void> {
    // Check for brute force attacks
    if (event.eventType === AuditEventType.AUTHENTICATION_FAILURE) {
      await this.checkBruteForceAttack(event)
    }

    // Check for account takeover attempts
    if (event.eventType === AuditEventType.AUTHENTICATION_SUCCESS) {
      await this.checkAccountTakeoverAttempt(event)
    }

    // Check for suspicious activity patterns
    await this.checkSuspiciousActivity(event)

    // Check for privilege escalation
    if (event.details.roleChange || event.details.permissionChange) {
      await this.checkPrivilegeEscalation(event)
    }
  }

  /**
   * Check for brute force attack patterns
   */
  private async checkBruteForceAttack(event: AuditEvent): Promise<void> {
    if (!event.ipAddress) return

    // Get recent failed attempts from same IP
    const recentFailures = await this.getRecentFailedAttempts(event.ipAddress, 15 * 60 * 1000) // 15 minutes
    
    if (recentFailures >= 5) {
      await this.logSecurityIncident(
        'brute_force_attack',
        AuditSeverity.HIGH,
        {
          ipAddress: event.ipAddress,
          failedAttempts: recentFailures,
          timeWindow: '15_minutes'
        },
        event.userId
      )

      // Trigger automatic blocking
      await this.triggerIPBlock(event.ipAddress, 'brute_force_attack')
    }
  }

  /**
   * Check for account takeover attempts
   */
  private async checkAccountTakeoverAttempt(event: AuditEvent): Promise<void> {
    if (!event.userId) return

    // Check for unusual login patterns
    const userHistory = await this.getUserLoginHistory(event.userId, 7 * 24 * 60 * 60 * 1000) // 7 days
    
    // Check for new device/location
    const isNewDevice = !userHistory.some(h => h.deviceFingerprint === event.metadata.deviceFingerprint)
    const isNewLocation = event.metadata.geolocation && 
      !userHistory.some(h => this.isSimilarLocation(h.geolocation, event.metadata.geolocation))

    if (isNewDevice && isNewLocation) {
      await this.logSecurityIncident(
        'potential_account_takeover',
        AuditSeverity.MEDIUM,
        {
          newDevice: isNewDevice,
          newLocation: isNewLocation,
          previousLocations: userHistory.map(h => h.geolocation).filter(Boolean)
        },
        event.userId
      )
    }
  }

  /**
   * Check for suspicious activity patterns
   */
  private async checkSuspiciousActivity(event: AuditEvent): Promise<void> {
    const suspiciousIndicators = []

    // Check threat intelligence
    if (event.metadata.threatIntelligence?.ipReputation === 'malicious') {
      suspiciousIndicators.push('malicious_ip')
    }

    if (event.metadata.threatIntelligence?.botDetection === 'bot') {
      suspiciousIndicators.push('bot_detected')
    }

    if (event.metadata.threatIntelligence?.torDetection) {
      suspiciousIndicators.push('tor_usage')
    }

    // Check for unusual timing patterns
    if (this.isUnusualTime(event.timestamp)) {
      suspiciousIndicators.push('unusual_time')
    }

    // Check for rapid successive actions
    if (await this.hasRapidSuccessiveActions(event)) {
      suspiciousIndicators.push('rapid_actions')
    }

    if (suspiciousIndicators.length > 0) {
      await this.logSecurityIncident(
        'suspicious_activity',
        suspiciousIndicators.length > 2 ? AuditSeverity.HIGH : AuditSeverity.MEDIUM,
        {
          indicators: suspiciousIndicators,
          riskScore: event.riskScore
        },
        event.userId
      )
    }
  }

  /**
   * Check for privilege escalation
   */
  private async checkPrivilegeEscalation(event: AuditEvent): Promise<void> {
    if (!event.userId || !event.details.roleChange) return

    const previousRole = event.details.previousRole
    const newRole = event.details.newRole

    // Check if this is an elevation in privileges
    if (this.isPrivilegeElevation(previousRole, newRole)) {
      await this.logSecurityIncident(
        'privilege_escalation',
        AuditSeverity.HIGH,
        {
          previousRole,
          newRole,
          escalationType: 'role_elevation'
        },
        event.userId
      )
    }
  }

  /**
   * Handle security incidents
   */
  private async handleSecurityIncident(event: AuditEvent): Promise<void> {
    // Send immediate alert
    await this.sendSecurityAlert(event)

    // Log to security information and event management (SIEM) system
    await this.sendToSIEM(event)

    // Trigger automated response if configured
    await this.triggerAutomatedResponse(event)

    // Create incident ticket if severity is high or critical
    if (event.severity === AuditSeverity.HIGH || event.severity === AuditSeverity.CRITICAL) {
      await this.createIncidentTicket(event)
    }
  }

  /**
   * Calculate risk score for event
   */
  private async calculateRiskScore(
    eventType: AuditEventType,
    outcome: AuditOutcome,
    details: Record<string, any>,
    context: any
  ): Promise<number> {
    let score = 0

    // Base score by event type
    const eventTypeScores = {
      [AuditEventType.AUTHENTICATION_FAILURE]: 3,
      [AuditEventType.ACCOUNT_LOCKED]: 6,
      [AuditEventType.SUSPICIOUS_ACTIVITY]: 8,
      [AuditEventType.BRUTE_FORCE_ATTEMPT]: 9,
      [AuditEventType.ACCOUNT_TAKEOVER_ATTEMPT]: 10,
      [AuditEventType.PRIVILEGE_ESCALATION]: 9,
      [AuditEventType.UNAUTHORIZED_ACCESS_ATTEMPT]: 8
    }

    score += eventTypeScores[eventType] || 1

    // Adjust for outcome
    if (outcome === AuditOutcome.FAILURE) score += 2
    if (outcome === AuditOutcome.BLOCKED) score += 1

    // Adjust for threat intelligence
    if (context.threatIntelligence?.ipReputation === 'malicious') score += 4
    if (context.threatIntelligence?.ipReputation === 'suspicious') score += 2
    if (context.threatIntelligence?.botDetection === 'bot') score += 3
    if (context.threatIntelligence?.torDetection) score += 2
    if (context.threatIntelligence?.vpnDetection) score += 1

    // Adjust for unusual patterns
    if (details.unusualLocation) score += 2
    if (details.newDevice) score += 1
    if (details.rapidActions) score += 2

    return Math.min(score, 10) // Cap at 10
  }

  /**
   * Determine event severity based on type and risk score
   */
  private determineSeverity(
    eventType: AuditEventType,
    outcome: AuditOutcome,
    riskScore: number
  ): AuditSeverity {
    // Critical events
    const criticalEvents = [
      AuditEventType.ACCOUNT_TAKEOVER_ATTEMPT,
      AuditEventType.PRIVILEGE_ESCALATION,
      AuditEventType.SECURITY_INCIDENT
    ]

    if (criticalEvents.includes(eventType) || riskScore >= 9) {
      return AuditSeverity.CRITICAL
    }

    // High severity events
    const highSeverityEvents = [
      AuditEventType.BRUTE_FORCE_ATTEMPT,
      AuditEventType.SUSPICIOUS_ACTIVITY,
      AuditEventType.UNAUTHORIZED_ACCESS_ATTEMPT
    ]

    if (highSeverityEvents.includes(eventType) || riskScore >= 7) {
      return AuditSeverity.HIGH
    }

    // Medium severity
    if (riskScore >= 4 || outcome === AuditOutcome.FAILURE) {
      return AuditSeverity.MEDIUM
    }

    return AuditSeverity.LOW
  }

  /**
   * Check compliance flags for event
   */
  private async checkComplianceFlags(
    eventType: AuditEventType,
    details: Record<string, any>,
    userId?: string
  ): Promise<ComplianceFlag[]> {
    const flags: ComplianceFlag[] = []

    // GDPR compliance checks
    if (eventType === AuditEventType.DATA_EXPORT || eventType === AuditEventType.DATA_DELETION) {
      flags.push({
        regulation: ComplianceRegulation.GDPR,
        requirement: 'data_portability',
        status: 'compliant',
        details: 'User data access/deletion logged as required'
      })
    }

    // SOX compliance for privileged access
    if (eventType === AuditEventType.PRIVILEGE_ESCALATION) {
      flags.push({
        regulation: ComplianceRegulation.SOX,
        requirement: 'privileged_access_control',
        status: 'requires_review',
        details: 'Privilege escalation requires management approval'
      })
    }

    // PCI DSS for payment-related access
    if (details.paymentData || details.cardData) {
      flags.push({
        regulation: ComplianceRegulation.PCI_DSS,
        requirement: 'cardholder_data_access',
        status: 'compliant',
        details: 'Payment data access logged and monitored'
      })
    }

    return flags
  }

  /**
   * Get threat intelligence for IP address
   */
  private async getThreatIntelligence(ipAddress?: string): Promise<ThreatIntelligence | undefined> {
    if (!ipAddress) return undefined

    // In a real implementation, this would query threat intelligence APIs
    // For now, return mock data based on IP patterns
    const threatIntel: ThreatIntelligence = {
      ipReputation: 'clean',
      knownAttacker: false,
      botDetection: 'human',
      vpnDetection: false,
      torDetection: false
    }

    // Mock some threat detection logic
    if (ipAddress.startsWith('10.') || ipAddress.startsWith('192.168.')) {
      // Private IP ranges are generally safe
      return threatIntel
    }

    // Simulate threat intelligence lookup
    const hash = this.simpleHash(ipAddress)
    if (hash % 100 < 5) { // 5% chance of suspicious IP
      threatIntel.ipReputation = 'suspicious'
    }
    if (hash % 1000 < 1) { // 0.1% chance of malicious IP
      threatIntel.ipReputation = 'malicious'
      threatIntel.knownAttacker = true
    }

    return threatIntel
  }

  /**
   * Get request context information
   */
  private async getRequestContext(): Promise<any> {
    // In a real implementation, this would extract context from the current request
    // For now, return mock context
    return {
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0...',
      resource: '/api/auth',
      requestId: this.generateId(),
      correlationId: this.generateId(),
      geolocation: {
        country: 'US',
        region: 'CA',
        city: 'San Francisco',
        coordinates: [-122.4194, 37.7749] as [number, number]
      },
      deviceFingerprint: this.generateId()
    }
  }

  /**
   * Flush events to storage
   */
  private async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return

    const eventsToFlush = [...this.eventQueue]
    this.eventQueue = []

    try {
      // Store events in secure audit log storage
      await this.storeAuditEvents(eventsToFlush)
      
      // Send to external SIEM if configured
      await this.sendToExternalSIEM(eventsToFlush)
      
    } catch (error) {
      console.error('Failed to flush audit events:', error)
      // Re-add events to queue for retry
      this.eventQueue.unshift(...eventsToFlush)
    }
  }

  /**
   * Store audit events in secure storage
   */
  private async storeAuditEvents(events: AuditEvent[]): Promise<void> {
    // In a real implementation, this would store in a secure audit database
    console.log(`Storing ${events.length} audit events`)
    
    // Example implementation with database (using lazy import)
    // const { createSupabaseClient } = await import('@/lib/database')
    // const supabase = createSupabaseClient()
    // 
    // const { error } = await supabase
    //   .from('audit_events')
    //   .insert(events)
    // 
    // if (error) {
    //   throw new Error(`Failed to store audit events: ${error.message}`)
    // }
  }

  /**
   * Send events to external SIEM system
   */
  private async sendToExternalSIEM(events: AuditEvent[]): Promise<void> {
    // Implementation would send to external SIEM like Splunk, ELK, etc.
    console.log(`Sending ${events.length} events to SIEM`)
  }

  /**
   * Send security alert
   */
  private async sendSecurityAlert(event: AuditEvent): Promise<void> {
    // Implementation would send alerts via email, Slack, PagerDuty, etc.
    console.log(`Security alert: ${event.eventType} - ${event.severity}`)
  }

  /**
   * Send event to SIEM
   */
  private async sendToSIEM(event: AuditEvent): Promise<void> {
    // Implementation would send to SIEM system
    console.log(`SIEM event: ${event.id}`)
  }

  /**
   * Trigger automated response
   */
  private async triggerAutomatedResponse(event: AuditEvent): Promise<void> {
    // Implementation would trigger automated security responses
    console.log(`Automated response triggered for: ${event.eventType}`)
  }

  /**
   * Create incident ticket
   */
  private async createIncidentTicket(event: AuditEvent): Promise<void> {
    // Implementation would create ticket in incident management system
    console.log(`Incident ticket created for: ${event.id}`)
  }

  /**
   * Utility methods
   */
  private generateEventId(timestamp: number): string {
    return `audit_${timestamp}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }

  private simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  private getGDPRArticle(requestType: string): string {
    const articles = {
      access: 'Article 15',
      rectification: 'Article 16',
      erasure: 'Article 17',
      portability: 'Article 20',
      restriction: 'Article 18'
    }
    return articles[requestType as keyof typeof articles] || 'Unknown'
  }

  private startBatchFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.flushInterval)
  }

  // Mock implementations for demonstration
  private async getRecentFailedAttempts(ipAddress: string, timeWindow: number): Promise<number> {
    return Math.floor(Math.random() * 10)
  }

  private async getUserLoginHistory(userId: string, timeWindow: number): Promise<any[]> {
    return []
  }

  private async triggerIPBlock(ipAddress: string, reason: string): Promise<void> {
    console.log(`IP blocked: ${ipAddress} - ${reason}`)
  }

  private isSimilarLocation(loc1: any, loc2: any): boolean {
    return loc1?.country === loc2?.country && loc1?.region === loc2?.region
  }

  private isUnusualTime(timestamp: number): boolean {
    const hour = new Date(timestamp).getHours()
    return hour < 6 || hour > 22 // Outside normal business hours
  }

  private async hasRapidSuccessiveActions(event: AuditEvent): Promise<boolean> {
    return false // Mock implementation
  }

  private isPrivilegeElevation(previousRole: string, newRole: string): boolean {
    const roleHierarchy = ['user', 'moderator', 'admin', 'super_admin']
    const prevIndex = roleHierarchy.indexOf(previousRole)
    const newIndex = roleHierarchy.indexOf(newRole)
    return newIndex > prevIndex
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    this.flush() // Final flush
  }
}

// Export singleton instance
export const securityAuditLogger = SecurityAuditLogger.getInstance()