/**
 * Compliance Manager
 * 
 * This module provides comprehensive compliance features for GDPR, CCPA, and other
 * data protection regulations with automated compliance checking and reporting.
 */

import { z } from 'zod'
import { securityAuditLogger, ComplianceRegulation } from './audit-logger'

// Types for compliance management
export interface ComplianceRequest {
  id: string
  userId: string
  requestType: ComplianceRequestType
  regulation: ComplianceRegulation
  status: ComplianceStatus
  requestedAt: number
  completedAt?: number
  details: Record<string, any>
  verificationToken?: string
  expiresAt?: number
}

export interface DataSubject {
  userId: string
  email: string
  firstName?: string
  lastName?: string
  dateOfBirth?: string
  country?: string
  consentRecords: ConsentRecord[]
  dataProcessingActivities: DataProcessingActivity[]
}

export interface ConsentRecord {
  id: string
  userId: string
  consentType: ConsentType
  purpose: string
  granted: boolean
  grantedAt?: number
  revokedAt?: number
  legalBasis: LegalBasis
  version: string
  metadata: Record<string, any>
}

export interface DataProcessingActivity {
  id: string
  userId: string
  activity: string
  purpose: string
  legalBasis: LegalBasis
  dataCategories: DataCategory[]
  retentionPeriod: number
  processingDate: number
  metadata: Record<string, any>
}

export interface ComplianceReport {
  id: string
  regulation: ComplianceRegulation
  reportType: ComplianceReportType
  generatedAt: number
  period: {
    start: number
    end: number
  }
  summary: ComplianceReportSummary
  details: Record<string, any>
  recommendations: ComplianceRecommendation[]
}

export interface ComplianceReportSummary {
  totalRequests: number
  completedRequests: number
  pendingRequests: number
  averageResponseTime: number
  complianceScore: number
  violations: number
}

export interface ComplianceRecommendation {
  priority: 'high' | 'medium' | 'low'
  category: string
  title: string
  description: string
  action: string
  impact: string
}

export enum ComplianceRequestType {
  DATA_ACCESS = 'data_access',           // GDPR Article 15
  DATA_RECTIFICATION = 'data_rectification', // GDPR Article 16
  DATA_ERASURE = 'data_erasure',         // GDPR Article 17
  DATA_PORTABILITY = 'data_portability', // GDPR Article 20
  PROCESSING_RESTRICTION = 'processing_restriction', // GDPR Article 18
  OBJECTION_TO_PROCESSING = 'objection_to_processing', // GDPR Article 21
  CONSENT_WITHDRAWAL = 'consent_withdrawal',
  CCPA_OPT_OUT = 'ccpa_opt_out',
  CCPA_DELETE = 'ccpa_delete',
  CCPA_KNOW = 'ccpa_know'
}

export enum ComplianceStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

export enum ConsentType {
  MARKETING = 'marketing',
  ANALYTICS = 'analytics',
  FUNCTIONAL = 'functional',
  NECESSARY = 'necessary',
  THIRD_PARTY = 'third_party'
}

export enum LegalBasis {
  CONSENT = 'consent',
  CONTRACT = 'contract',
  LEGAL_OBLIGATION = 'legal_obligation',
  VITAL_INTERESTS = 'vital_interests',
  PUBLIC_TASK = 'public_task',
  LEGITIMATE_INTERESTS = 'legitimate_interests'
}

export enum DataCategory {
  PERSONAL_IDENTIFIERS = 'personal_identifiers',
  CONTACT_INFORMATION = 'contact_information',
  DEMOGRAPHIC_DATA = 'demographic_data',
  BEHAVIORAL_DATA = 'behavioral_data',
  TECHNICAL_DATA = 'technical_data',
  FINANCIAL_DATA = 'financial_data',
  HEALTH_DATA = 'health_data',
  BIOMETRIC_DATA = 'biometric_data'
}

export enum ComplianceReportType {
  GDPR_COMPLIANCE = 'gdpr_compliance',
  CCPA_COMPLIANCE = 'ccpa_compliance',
  DATA_BREACH = 'data_breach',
  CONSENT_MANAGEMENT = 'consent_management',
  DATA_RETENTION = 'data_retention'
}

// Validation schemas
const ComplianceRequestSchema = z.object({
  userId: z.string(),
  requestType: z.nativeEnum(ComplianceRequestType),
  regulation: z.nativeEnum(ComplianceRegulation),
  details: z.record(z.any()).optional().default({})
})

/**
 * Compliance Manager Service
 */
export class ComplianceManager {
  private static instance: ComplianceManager
  private requests: Map<string, ComplianceRequest> = new Map()
  private dataSubjects: Map<string, DataSubject> = new Map()

  static getInstance(): ComplianceManager {
    if (!ComplianceManager.instance) {
      ComplianceManager.instance = new ComplianceManager()
    }
    return ComplianceManager.instance
  }

  /**
   * Submit a compliance request
   */
  async submitComplianceRequest(
    userId: string,
    requestType: ComplianceRequestType,
    regulation: ComplianceRegulation,
    details: Record<string, any> = {}
  ): Promise<ComplianceRequest> {
    // Validate request
    const validatedData = ComplianceRequestSchema.parse({
      userId,
      requestType,
      regulation,
      details
    })

    // Generate request ID and verification token
    const requestId = this.generateRequestId()
    const verificationToken = this.generateVerificationToken()
    
    // Calculate expiration (30 days for most requests)
    const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000)

    const request: ComplianceRequest = {
      id: requestId,
      userId: validatedData.userId,
      requestType: validatedData.requestType,
      regulation: validatedData.regulation,
      status: ComplianceStatus.PENDING,
      requestedAt: Date.now(),
      details: validatedData.details,
      verificationToken,
      expiresAt
    }

    // Store request
    this.requests.set(requestId, request)

    // Log compliance event
    await securityAuditLogger.logComplianceEvent(
      regulation,
      requestType,
      'requires_review',
      {
        requestId,
        requestType,
        userId
      },
      userId
    )

    // Send verification email if required
    if (this.requiresVerification(requestType)) {
      await this.sendVerificationEmail(request)
    }

    // Start processing for automated requests
    if (this.canAutoProcess(requestType)) {
      await this.processRequest(requestId)
    }

    return request
  }

  /**
   * Verify compliance request
   */
  async verifyComplianceRequest(
    requestId: string,
    verificationToken: string
  ): Promise<boolean> {
    const request = this.requests.get(requestId)
    if (!request) {
      throw new Error('Compliance request not found')
    }

    if (request.verificationToken !== verificationToken) {
      await securityAuditLogger.logSecurityIncident(
        'invalid_verification_token',
        'medium',
        { requestId, providedToken: verificationToken },
        request.userId
      )
      return false
    }

    if (request.expiresAt && Date.now() > request.expiresAt) {
      request.status = ComplianceStatus.EXPIRED
      return false
    }

    // Mark as verified and start processing
    request.status = ComplianceStatus.IN_PROGRESS
    await this.processRequest(requestId)

    return true
  }

  /**
   * Process compliance request
   */
  async processRequest(requestId: string): Promise<void> {
    const request = this.requests.get(requestId)
    if (!request) {
      throw new Error('Compliance request not found')
    }

    try {
      request.status = ComplianceStatus.IN_PROGRESS

      switch (request.requestType) {
        case ComplianceRequestType.DATA_ACCESS:
          await this.processDataAccessRequest(request)
          break
        case ComplianceRequestType.DATA_RECTIFICATION:
          await this.processDataRectificationRequest(request)
          break
        case ComplianceRequestType.DATA_ERASURE:
          await this.processDataErasureRequest(request)
          break
        case ComplianceRequestType.DATA_PORTABILITY:
          await this.processDataPortabilityRequest(request)
          break
        case ComplianceRequestType.PROCESSING_RESTRICTION:
          await this.processProcessingRestrictionRequest(request)
          break
        case ComplianceRequestType.CONSENT_WITHDRAWAL:
          await this.processConsentWithdrawalRequest(request)
          break
        case ComplianceRequestType.CCPA_OPT_OUT:
          await this.processCCPAOptOutRequest(request)
          break
        case ComplianceRequestType.CCPA_DELETE:
          await this.processCCPADeleteRequest(request)
          break
        case ComplianceRequestType.CCPA_KNOW:
          await this.processCCPAKnowRequest(request)
          break
        default:
          throw new Error(`Unsupported request type: ${request.requestType}`)
      }

      request.status = ComplianceStatus.COMPLETED
      request.completedAt = Date.now()

      // Log completion
      await securityAuditLogger.logComplianceEvent(
        request.regulation,
        request.requestType,
        'compliant',
        {
          requestId,
          processingTime: request.completedAt - request.requestedAt
        },
        request.userId
      )

      // Send completion notification
      await this.sendCompletionNotification(request)

    } catch (error) {
      request.status = ComplianceStatus.REJECTED
      
      await securityAuditLogger.logComplianceEvent(
        request.regulation,
        request.requestType,
        'non_compliant',
        {
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        request.userId
      )

      throw error
    }
  }

  /**
   * Process GDPR data access request (Article 15)
   */
  private async processDataAccessRequest(request: ComplianceRequest): Promise<void> {
    const userData = await this.collectUserData(request.userId)
    
    // Generate comprehensive data export
    const dataExport = {
      personalData: userData.personalData,
      processingActivities: userData.processingActivities,
      consentRecords: userData.consentRecords,
      dataRetention: userData.dataRetention,
      thirdPartySharing: userData.thirdPartySharing,
      exportedAt: new Date().toISOString(),
      regulation: 'GDPR Article 15'
    }

    // Store export for download
    const exportId = await this.storeDataExport(request.userId, dataExport)
    
    request.details.exportId = exportId
    request.details.dataCategories = Object.keys(userData.personalData)
  }

  /**
   * Process GDPR data rectification request (Article 16)
   */
  private async processDataRectificationRequest(request: ComplianceRequest): Promise<void> {
    const corrections = request.details.corrections
    if (!corrections) {
      throw new Error('No corrections specified')
    }

    // Apply corrections to user data
    await this.updateUserData(request.userId, corrections)
    
    // Log data changes
    await securityAuditLogger.logAuthEvent(
      'account_updated',
      'data_rectification',
      'success',
      {
        corrections,
        regulation: 'GDPR Article 16'
      },
      request.userId
    )
  }

  /**
   * Process GDPR data erasure request (Article 17)
   */
  private async processDataErasureRequest(request: ComplianceRequest): Promise<void> {
    // Check if erasure is legally required
    const canErase = await this.checkErasureEligibility(request.userId)
    if (!canErase.eligible) {
      throw new Error(`Data erasure not permitted: ${canErase.reason}`)
    }

    // Perform data erasure
    await this.eraseUserData(request.userId, request.details.categories || 'all')
    
    // Log erasure
    await securityAuditLogger.logAuthEvent(
      'data_deletion',
      'gdpr_erasure',
      'success',
      {
        categories: request.details.categories,
        regulation: 'GDPR Article 17'
      },
      request.userId
    )
  }

  /**
   * Process GDPR data portability request (Article 20)
   */
  private async processDataPortabilityRequest(request: ComplianceRequest): Promise<void> {
    const portableData = await this.extractPortableData(request.userId)
    
    // Generate machine-readable export
    const exportFormat = request.details.format || 'json'
    const exportId = await this.createPortableExport(request.userId, portableData, exportFormat)
    
    request.details.exportId = exportId
    request.details.format = exportFormat
  }

  /**
   * Process consent withdrawal request
   */
  private async processConsentWithdrawalRequest(request: ComplianceRequest): Promise<void> {
    const consentTypes = request.details.consentTypes || []
    
    for (const consentType of consentTypes) {
      await this.withdrawConsent(request.userId, consentType)
    }

    // Stop processing based on withdrawn consent
    await this.stopConsentBasedProcessing(request.userId, consentTypes)
  }

  /**
   * Manage user consent
   */
  async recordConsent(
    userId: string,
    consentType: ConsentType,
    purpose: string,
    granted: boolean,
    legalBasis: LegalBasis = LegalBasis.CONSENT,
    metadata: Record<string, any> = {}
  ): Promise<ConsentRecord> {
    const consentRecord: ConsentRecord = {
      id: this.generateId(),
      userId,
      consentType,
      purpose,
      granted,
      grantedAt: granted ? Date.now() : undefined,
      revokedAt: !granted ? Date.now() : undefined,
      legalBasis,
      version: '1.0',
      metadata
    }

    // Store consent record
    const dataSubject = await this.getOrCreateDataSubject(userId)
    dataSubject.consentRecords.push(consentRecord)

    // Log consent event
    await securityAuditLogger.logAuthEvent(
      granted ? 'consent_granted' : 'consent_revoked',
      `consent_${consentType}`,
      'success',
      {
        consentType,
        purpose,
        legalBasis,
        granted
      },
      userId
    )

    return consentRecord
  }

  /**
   * Check if user has valid consent
   */
  async hasValidConsent(
    userId: string,
    consentType: ConsentType,
    purpose?: string
  ): Promise<boolean> {
    const dataSubject = this.dataSubjects.get(userId)
    if (!dataSubject) return false

    const relevantConsents = dataSubject.consentRecords.filter(consent => 
      consent.consentType === consentType &&
      (!purpose || consent.purpose === purpose) &&
      consent.granted &&
      !consent.revokedAt
    )

    return relevantConsents.length > 0
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    regulation: ComplianceRegulation,
    reportType: ComplianceReportType,
    startDate: Date,
    endDate: Date
  ): Promise<ComplianceReport> {
    const reportId = this.generateId()
    const period = {
      start: startDate.getTime(),
      end: endDate.getTime()
    }

    // Collect compliance data for the period
    const requests = Array.from(this.requests.values()).filter(req =>
      req.regulation === regulation &&
      req.requestedAt >= period.start &&
      req.requestedAt <= period.end
    )

    const summary: ComplianceReportSummary = {
      totalRequests: requests.length,
      completedRequests: requests.filter(r => r.status === ComplianceStatus.COMPLETED).length,
      pendingRequests: requests.filter(r => r.status === ComplianceStatus.PENDING).length,
      averageResponseTime: this.calculateAverageResponseTime(requests),
      complianceScore: this.calculateComplianceScore(requests),
      violations: requests.filter(r => r.status === ComplianceStatus.REJECTED).length
    }

    const recommendations = await this.generateComplianceRecommendations(regulation, requests)

    const report: ComplianceReport = {
      id: reportId,
      regulation,
      reportType,
      generatedAt: Date.now(),
      period,
      summary,
      details: {
        requests: requests.map(r => ({
          id: r.id,
          type: r.requestType,
          status: r.status,
          requestedAt: r.requestedAt,
          completedAt: r.completedAt
        }))
      },
      recommendations
    }

    return report
  }

  /**
   * Check data retention compliance
   */
  async checkDataRetentionCompliance(): Promise<{
    compliant: boolean
    expiredData: Array<{
      userId: string
      dataType: string
      retentionExpiry: number
    }>
  }> {
    const expiredData: Array<{
      userId: string
      dataType: string
      retentionExpiry: number
    }> = []

    // Check each data subject's retention periods
    for (const [userId, dataSubject] of this.dataSubjects) {
      for (const activity of dataSubject.dataProcessingActivities) {
        const expiryDate = activity.processingDate + activity.retentionPeriod
        if (Date.now() > expiryDate) {
          expiredData.push({
            userId,
            dataType: activity.activity,
            retentionExpiry: expiryDate
          })
        }
      }
    }

    return {
      compliant: expiredData.length === 0,
      expiredData
    }
  }

  /**
   * Utility methods
   */
  private generateRequestId(): string {
    return `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateVerificationToken(): string {
    return Math.random().toString(36).substr(2, 32)
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }

  private requiresVerification(requestType: ComplianceRequestType): boolean {
    const verificationRequired = [
      ComplianceRequestType.DATA_ERASURE,
      ComplianceRequestType.DATA_PORTABILITY,
      ComplianceRequestType.CCPA_DELETE
    ]
    return verificationRequired.includes(requestType)
  }

  private canAutoProcess(requestType: ComplianceRequestType): boolean {
    const autoProcessable = [
      ComplianceRequestType.DATA_ACCESS,
      ComplianceRequestType.CONSENT_WITHDRAWAL,
      ComplianceRequestType.CCPA_OPT_OUT
    ]
    return autoProcessable.includes(requestType)
  }

  private async getOrCreateDataSubject(userId: string): Promise<DataSubject> {
    let dataSubject = this.dataSubjects.get(userId)
    if (!dataSubject) {
      dataSubject = {
        userId,
        email: '', // Would be populated from user data
        consentRecords: [],
        dataProcessingActivities: []
      }
      this.dataSubjects.set(userId, dataSubject)
    }
    return dataSubject
  }

  private calculateAverageResponseTime(requests: ComplianceRequest[]): number {
    const completedRequests = requests.filter(r => r.completedAt)
    if (completedRequests.length === 0) return 0

    const totalTime = completedRequests.reduce((sum, req) => 
      sum + (req.completedAt! - req.requestedAt), 0)
    
    return totalTime / completedRequests.length
  }

  private calculateComplianceScore(requests: ComplianceRequest[]): number {
    if (requests.length === 0) return 100

    const completedOnTime = requests.filter(r => 
      r.status === ComplianceStatus.COMPLETED &&
      r.completedAt &&
      (r.completedAt - r.requestedAt) <= (30 * 24 * 60 * 60 * 1000) // 30 days
    ).length

    return (completedOnTime / requests.length) * 100
  }

  private async generateComplianceRecommendations(
    regulation: ComplianceRegulation,
    requests: ComplianceRequest[]
  ): Promise<ComplianceRecommendation[]> {
    const recommendations: ComplianceRecommendation[] = []

    // Analyze request patterns and generate recommendations
    const avgResponseTime = this.calculateAverageResponseTime(requests)
    if (avgResponseTime > 25 * 24 * 60 * 60 * 1000) { // More than 25 days
      recommendations.push({
        priority: 'high',
        category: 'response_time',
        title: 'Improve Response Time',
        description: 'Average response time exceeds recommended 30-day limit',
        action: 'Implement automated processing for common request types',
        impact: 'Reduce compliance risk and improve user satisfaction'
      })
    }

    return recommendations
  }

  // Mock implementations for demonstration
  private async sendVerificationEmail(request: ComplianceRequest): Promise<void> {
    console.log(`Verification email sent for request ${request.id}`)
  }

  private async sendCompletionNotification(request: ComplianceRequest): Promise<void> {
    console.log(`Completion notification sent for request ${request.id}`)
  }

  private async collectUserData(userId: string): Promise<any> {
    return {
      personalData: {},
      processingActivities: [],
      consentRecords: [],
      dataRetention: {},
      thirdPartySharing: []
    }
  }

  private async storeDataExport(userId: string, dataExport: any): Promise<string> {
    return `export_${userId}_${Date.now()}`
  }

  private async updateUserData(userId: string, corrections: any): Promise<void> {
    console.log(`User data updated for ${userId}`)
  }

  private async checkErasureEligibility(userId: string): Promise<{ eligible: boolean; reason?: string }> {
    return { eligible: true }
  }

  private async eraseUserData(userId: string, categories: string): Promise<void> {
    console.log(`User data erased for ${userId}`)
  }

  private async extractPortableData(userId: string): Promise<any> {
    return {}
  }

  private async createPortableExport(userId: string, data: any, format: string): Promise<string> {
    return `portable_${userId}_${Date.now()}`
  }

  private async withdrawConsent(userId: string, consentType: ConsentType): Promise<void> {
    console.log(`Consent withdrawn: ${userId} - ${consentType}`)
  }

  private async stopConsentBasedProcessing(userId: string, consentTypes: ConsentType[]): Promise<void> {
    console.log(`Processing stopped for ${userId}`)
  }

  private async processCCPAOptOutRequest(request: ComplianceRequest): Promise<void> {
    console.log(`CCPA opt-out processed for ${request.userId}`)
  }

  private async processCCPADeleteRequest(request: ComplianceRequest): Promise<void> {
    console.log(`CCPA delete processed for ${request.userId}`)
  }

  private async processCCPAKnowRequest(request: ComplianceRequest): Promise<void> {
    console.log(`CCPA know request processed for ${request.userId}`)
  }

  private async processProcessingRestrictionRequest(request: ComplianceRequest): Promise<void> {
    console.log(`Processing restriction applied for ${request.userId}`)
  }
}

// Export singleton instance
export const complianceManager = ComplianceManager.getInstance()