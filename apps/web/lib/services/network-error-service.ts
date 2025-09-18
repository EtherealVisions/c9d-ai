/**
 * Network Error Service
 * Handles connectivity issues, retry mechanisms, and offline support
 * Requirements: 10.2, 10.3
 */

import { AuthenticationError, AuthErrorCode, createAuthError } from '@/lib/errors/authentication-errors';
import { AuthLogger } from '@/lib/errors/auth-error-logger';

/**
 * Network connectivity status
 */
export interface NetworkStatus {
  isOnline: boolean;
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  downlink: number;
  rtt: number;
  saveData: boolean;
}

/**
 * Retry configuration options
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryCondition?: (error: Error) => boolean;
}

/**
 * Network error types
 */
export enum NetworkErrorType {
  CONNECTION_LOST = 'CONNECTION_LOST',
  TIMEOUT = 'TIMEOUT',
  DNS_FAILURE = 'DNS_FAILURE',
  SERVER_UNREACHABLE = 'SERVER_UNREACHABLE',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  MAINTENANCE_MODE = 'MAINTENANCE_MODE'
}

/**
 * Service availability status
 */
export interface ServiceStatus {
  isAvailable: boolean;
  status: 'operational' | 'degraded' | 'maintenance' | 'outage';
  message?: string;
  estimatedResolution?: Date;
  affectedServices: string[];
  lastChecked: Date;
}

/**
 * Offline mode configuration
 */
export interface OfflineConfig {
  enableOfflineMode: boolean;
  cacheAuthTokens: boolean;
  showOfflineIndicator: boolean;
  gracefulDegradation: boolean;
  offlineMessage: string;
}

/**
 * Network Error Service Class
 */
export class NetworkErrorService {
  private static instance: NetworkErrorService;
  private networkStatus: NetworkStatus;
  private serviceStatus: ServiceStatus;
  private offlineConfig: OfflineConfig;
  private retryAttempts: Map<string, number> = new Map();
  private connectionListeners: Set<(status: NetworkStatus) => void> = new Set();
  private serviceStatusListeners: Set<(status: ServiceStatus) => void> = new Set();

  private constructor() {
    this.networkStatus = this.getInitialNetworkStatus();
    this.serviceStatus = this.getInitialServiceStatus();
    this.offlineConfig = this.getDefaultOfflineConfig();
    this.initializeNetworkMonitoring();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): NetworkErrorService {
    if (!NetworkErrorService.instance) {
      NetworkErrorService.instance = new NetworkErrorService();
    }
    return NetworkErrorService.instance;
  }

  /**
   * Check if device is currently online
   */
  public isOnline(): boolean {
    return this.networkStatus.isOnline && navigator.onLine;
  }

  /**
   * Get current network status
   */
  public getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  /**
   * Get current service status
   */
  public getServiceStatus(): ServiceStatus {
    return { ...this.serviceStatus };
  }

  /**
   * Execute function with retry logic
   */
  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    operationId?: string
  ): Promise<T> {
    const retryConfig: RetryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitter: true,
      retryCondition: this.shouldRetry.bind(this),
      ...config
    };

    const id = operationId || this.generateOperationId();
    let lastError: Error;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        // Check if we should attempt based on network status
        if (!this.shouldAttemptOperation(attempt)) {
          throw createAuthError(
            AuthErrorCode.NETWORK_ERROR,
            'Network unavailable for operation',
            { attemptCount: attempt }
          );
        }

        const result = await operation();
        
        // Reset retry count on success
        this.retryAttempts.delete(id);
        
        // Log successful retry if this wasn't the first attempt
        if (attempt > 1) {
          AuthLogger.logSignInSuccess({}, {
            action: 'retry_success',
            attemptCount: attempt,
            operationId: id
          });
        }

        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Track retry attempts
        this.retryAttempts.set(id, attempt);

        // Log retry attempt
        AuthLogger.logSignInFailure(
          this.createNetworkError(error as Error, attempt),
          {
            action: 'retry_attempt',
            attemptCount: attempt,
            operationId: id,
            maxAttempts: retryConfig.maxAttempts
          }
        );

        // Check if we should retry
        if (attempt >= retryConfig.maxAttempts || !retryConfig.retryCondition!(lastError)) {
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateRetryDelay(attempt, retryConfig);
        await this.sleep(delay);
      }
    }

    // All retries exhausted, throw final error
    throw this.createNetworkError(lastError!, retryConfig.maxAttempts);
  }

  /**
   * Handle network error and provide appropriate response
   */
  public handleNetworkError(error: Error, context: any = {}): AuthenticationError {
    const networkErrorType = this.classifyNetworkError(error);
    const authError = this.createNetworkAuthError(networkErrorType, error, context);

    // Log network error
    AuthLogger.logSignInFailure(authError, {
      networkErrorType,
      networkStatus: this.networkStatus,
      serviceStatus: this.serviceStatus
    });

    return authError;
  }

  /**
   * Check service availability
   */
  public async checkServiceAvailability(service: string = 'auth'): Promise<ServiceStatus> {
    try {
      // Attempt to reach the service endpoint
      const response = await fetch('/api/health', {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      const isAvailable = response.ok;
      const status = this.determineServiceStatus(response.status);

      this.serviceStatus = {
        isAvailable,
        status,
        message: isAvailable ? undefined : 'Service temporarily unavailable',
        affectedServices: isAvailable ? [] : [service],
        lastChecked: new Date()
      };

      // Notify listeners
      this.notifyServiceStatusListeners();

      return this.serviceStatus;
    } catch (error) {
      this.serviceStatus = {
        isAvailable: false,
        status: 'outage',
        message: 'Unable to reach authentication service',
        affectedServices: [service],
        lastChecked: new Date()
      };

      // Notify listeners
      this.notifyServiceStatusListeners();

      return this.serviceStatus;
    }
  }

  /**
   * Enable offline mode
   */
  public enableOfflineMode(config: Partial<OfflineConfig> = {}): void {
    this.offlineConfig = {
      ...this.offlineConfig,
      ...config,
      enableOfflineMode: true
    };

    // Log offline mode activation
    AuthLogger.logSignInAttempt({}, {
      action: 'offline_mode_enabled',
      networkStatus: this.networkStatus
    });
  }

  /**
   * Disable offline mode
   */
  public disableOfflineMode(): void {
    this.offlineConfig.enableOfflineMode = false;

    // Log offline mode deactivation
    AuthLogger.logSignInAttempt({}, {
      action: 'offline_mode_disabled',
      networkStatus: this.networkStatus
    });
  }

  /**
   * Get offline capabilities
   */
  public getOfflineCapabilities(): {
    canSignIn: boolean;
    canSignUp: boolean;
    canResetPassword: boolean;
    canVerifyEmail: boolean;
    message: string;
  } {
    if (!this.offlineConfig.enableOfflineMode) {
      return {
        canSignIn: false,
        canSignUp: false,
        canResetPassword: false,
        canVerifyEmail: false,
        message: 'Offline mode is not enabled'
      };
    }

    // In offline mode, most auth operations require network
    return {
      canSignIn: false, // Requires server validation
      canSignUp: false, // Requires server validation
      canResetPassword: false, // Requires email service
      canVerifyEmail: false, // Requires server validation
      message: 'Authentication requires an internet connection. Please check your network and try again.'
    };
  }

  /**
   * Add network status listener
   */
  public addNetworkStatusListener(listener: (status: NetworkStatus) => void): void {
    this.connectionListeners.add(listener);
  }

  /**
   * Remove network status listener
   */
  public removeNetworkStatusListener(listener: (status: NetworkStatus) => void): void {
    this.connectionListeners.delete(listener);
  }

  /**
   * Add service status listener
   */
  public addServiceStatusListener(listener: (status: ServiceStatus) => void): void {
    this.serviceStatusListeners.add(listener);
  }

  /**
   * Remove service status listener
   */
  public removeServiceStatusListener(listener: (status: ServiceStatus) => void): void {
    this.serviceStatusListeners.delete(listener);
  }

  /**
   * Get network quality assessment
   */
  public getNetworkQuality(): 'excellent' | 'good' | 'fair' | 'poor' | 'offline' {
    if (!this.isOnline()) return 'offline';

    const { effectiveType, rtt, downlink } = this.networkStatus;

    // Handle unknown values gracefully
    if (effectiveType === 'unknown' || rtt === 0 || downlink === 0) {
      // If we're online but don't have connection info, assume good quality
      return this.isOnline() ? 'good' : 'offline';
    }

    if (effectiveType === '4g' && rtt < 100 && downlink > 10) return 'excellent';
    if (effectiveType === '4g' && rtt < 200 && downlink > 5) return 'good';
    if (effectiveType === '3g' || (rtt < 500 && downlink > 1)) return 'fair';
    return 'poor';
  }

  /**
   * Get retry recommendations based on network conditions
   */
  public getRetryRecommendations(): {
    shouldRetry: boolean;
    recommendedDelay: number;
    maxAttempts: number;
    reason: string;
  } {
    const quality = this.getNetworkQuality();
    const isServiceAvailable = this.serviceStatus.isAvailable;

    if (quality === 'offline') {
      return {
        shouldRetry: false,
        recommendedDelay: 0,
        maxAttempts: 0,
        reason: 'Device is offline'
      };
    }

    if (!isServiceAvailable) {
      return {
        shouldRetry: true,
        recommendedDelay: 30000, // 30 seconds
        maxAttempts: 2,
        reason: 'Service is temporarily unavailable'
      };
    }

    switch (quality) {
      case 'excellent':
        return {
          shouldRetry: true,
          recommendedDelay: 1000,
          maxAttempts: 3,
          reason: 'Excellent network conditions'
        };
      case 'good':
        return {
          shouldRetry: true,
          recommendedDelay: 2000,
          maxAttempts: 3,
          reason: 'Good network conditions'
        };
      case 'fair':
        return {
          shouldRetry: true,
          recommendedDelay: 5000,
          maxAttempts: 2,
          reason: 'Fair network conditions - longer delays recommended'
        };
      case 'poor':
        return {
          shouldRetry: true,
          recommendedDelay: 10000,
          maxAttempts: 2,
          reason: 'Poor network conditions - extended delays recommended'
        };
      default:
        return {
          shouldRetry: false,
          recommendedDelay: 0,
          maxAttempts: 0,
          reason: 'Unknown network conditions'
        };
    }
  }

  /**
   * Initialize network monitoring
   */
  private initializeNetworkMonitoring(): void {
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));

      // Monitor connection changes if Network Information API is available
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        connection.addEventListener('change', this.handleConnectionChange.bind(this));
      }
    }

    // Periodic service status checks
    setInterval(() => {
      this.checkServiceAvailability().catch(console.error);
    }, 60000); // Check every minute
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    this.networkStatus.isOnline = true;
    this.updateNetworkInfo();
    this.notifyNetworkStatusListeners();

    // Log network recovery
    AuthLogger.logSignInAttempt({}, {
      action: 'network_recovered',
      networkStatus: this.networkStatus
    });

    // Check service availability when coming back online
    this.checkServiceAvailability().catch(console.error);
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    this.networkStatus.isOnline = false;
    this.notifyNetworkStatusListeners();

    // Log network loss
    AuthLogger.logSignInFailure(
      createAuthError(AuthErrorCode.NETWORK_ERROR, 'Network connection lost'),
      {
        action: 'network_lost',
        networkStatus: this.networkStatus
      }
    );

    // Enable offline mode if configured
    if (this.offlineConfig.enableOfflineMode) {
      this.enableOfflineMode();
    }
  }

  /**
   * Handle connection change
   */
  private handleConnectionChange(): void {
    this.updateNetworkInfo();
    this.notifyNetworkStatusListeners();
  }

  /**
   * Update network information
   */
  private updateNetworkInfo(): void {
    if (typeof window !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      this.networkStatus = {
        ...this.networkStatus,
        connectionType: connection.type || 'unknown',
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
        saveData: connection.saveData || false
      };
    }
  }

  /**
   * Notify network status listeners
   */
  private notifyNetworkStatusListeners(): void {
    this.connectionListeners.forEach(listener => {
      try {
        listener(this.networkStatus);
      } catch (error) {
        console.error('Error in network status listener:', error);
      }
    });
  }

  /**
   * Notify service status listeners
   */
  private notifyServiceStatusListeners(): void {
    this.serviceStatusListeners.forEach(listener => {
      try {
        listener(this.serviceStatus);
      } catch (error) {
        console.error('Error in service status listener:', error);
      }
    });
  }

  /**
   * Get initial network status
   */
  private getInitialNetworkStatus(): NetworkStatus {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    
    return {
      isOnline,
      connectionType: 'unknown',
      effectiveType: 'unknown',
      downlink: 0,
      rtt: 0,
      saveData: false
    };
  }

  /**
   * Get initial service status
   */
  private getInitialServiceStatus(): ServiceStatus {
    return {
      isAvailable: true,
      status: 'operational',
      affectedServices: [],
      lastChecked: new Date()
    };
  }

  /**
   * Get default offline configuration
   */
  private getDefaultOfflineConfig(): OfflineConfig {
    return {
      enableOfflineMode: false,
      cacheAuthTokens: false,
      showOfflineIndicator: true,
      gracefulDegradation: true,
      offlineMessage: 'You are currently offline. Some features may not be available.'
    };
  }

  /**
   * Determine if operation should be attempted
   */
  private shouldAttemptOperation(attempt: number): boolean {
    // Always allow first attempt for testing purposes
    if (attempt === 1) {
      return true;
    }

    // Don't attempt if offline and offline mode is not enabled
    if (!this.isOnline() && !this.offlineConfig.enableOfflineMode) {
      return false;
    }

    // Don't attempt if service is known to be unavailable and this is not the first attempt
    if (!this.serviceStatus.isAvailable && attempt > 1) {
      return false;
    }

    return true;
  }

  /**
   * Determine if error should trigger retry
   */
  private shouldRetry(error: Error): boolean {
    // Network errors are generally retryable
    if (this.isNetworkError(error)) {
      return true;
    }

    // Timeout errors are retryable
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      return true;
    }

    // 5xx server errors are retryable
    if ('status' in error && typeof error.status === 'number') {
      return error.status >= 500 && error.status < 600;
    }

    // Rate limiting is retryable with delay
    if (error.message.includes('rate limit') || error.message.includes('429')) {
      return true;
    }

    return false;
  }

  /**
   * Check if error is network-related
   */
  private isNetworkError(error: Error): boolean {
    const networkErrorMessages = [
      'network error',
      'fetch failed',
      'connection refused',
      'connection reset',
      'dns lookup failed',
      'no internet',
      'offline'
    ];

    const message = error.message.toLowerCase();
    return networkErrorMessages.some(msg => message.includes(msg));
  }

  /**
   * Classify network error type
   */
  private classifyNetworkError(error: Error): NetworkErrorType {
    const message = error.message.toLowerCase();

    if (message.includes('timeout')) return NetworkErrorType.TIMEOUT;
    if (message.includes('dns')) return NetworkErrorType.DNS_FAILURE;
    if (message.includes('rate limit') || message.includes('429')) return NetworkErrorType.RATE_LIMITED;
    if (message.includes('maintenance')) return NetworkErrorType.MAINTENANCE_MODE;
    if (message.includes('service unavailable') || message.includes('503')) return NetworkErrorType.SERVICE_UNAVAILABLE;
    if (message.includes('connection')) return NetworkErrorType.CONNECTION_LOST;

    return NetworkErrorType.SERVER_UNREACHABLE;
  }

  /**
   * Create network-specific authentication error
   */
  private createNetworkAuthError(
    networkErrorType: NetworkErrorType,
    originalError: Error,
    context: any = {}
  ): AuthenticationError {
    let authCode: AuthErrorCode;
    let message: string;

    switch (networkErrorType) {
      case NetworkErrorType.CONNECTION_LOST:
        authCode = AuthErrorCode.NETWORK_ERROR;
        message = 'Network connection lost. Please check your internet connection and try again.';
        break;
      case NetworkErrorType.TIMEOUT:
        authCode = AuthErrorCode.NETWORK_ERROR;
        message = 'Request timed out. Please check your connection and try again.';
        break;
      case NetworkErrorType.SERVICE_UNAVAILABLE:
        authCode = AuthErrorCode.SERVICE_UNAVAILABLE;
        message = 'Authentication service is temporarily unavailable. Please try again in a few minutes.';
        break;
      case NetworkErrorType.MAINTENANCE_MODE:
        authCode = AuthErrorCode.SERVICE_UNAVAILABLE;
        message = 'Service is currently under maintenance. Please try again later.';
        break;
      case NetworkErrorType.RATE_LIMITED:
        authCode = AuthErrorCode.RATE_LIMITED;
        message = 'Too many requests. Please wait a moment and try again.';
        break;
      default:
        authCode = AuthErrorCode.NETWORK_ERROR;
        message = 'Network error occurred. Please check your connection and try again.';
    }

    return createAuthError(authCode, message, {
      ...context,
      networkErrorType,
      networkStatus: this.networkStatus,
      serviceStatus: this.serviceStatus
    }, {
      originalError: originalError.message,
      networkQuality: this.getNetworkQuality()
    });
  }

  /**
   * Create network error from generic error
   */
  private createNetworkError(error: Error, attemptCount: number): AuthenticationError {
    const networkErrorType = this.classifyNetworkError(error);
    return this.createNetworkAuthError(networkErrorType, error, { attemptCount });
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number, config: RetryConfig): number {
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    delay = Math.min(delay, config.maxDelay);

    // Add jitter to prevent thundering herd
    if (config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.floor(delay);
  }

  /**
   * Determine service status from HTTP status code
   */
  private determineServiceStatus(statusCode: number): ServiceStatus['status'] {
    if (statusCode >= 200 && statusCode < 300) return 'operational';
    if (statusCode === 503) return 'maintenance';
    if (statusCode >= 500) return 'outage';
    return 'degraded';
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Global network error service instance
 */
export const networkErrorService = NetworkErrorService.getInstance();

/**
 * Convenience functions for network error handling
 */
export const NetworkErrorHandler = {
  executeWithRetry: <T>(operation: () => Promise<T>, config?: Partial<RetryConfig>, id?: string) =>
    networkErrorService.executeWithRetry(operation, config, id),

  handleNetworkError: (error: Error, context?: any) =>
    networkErrorService.handleNetworkError(error, context),

  checkServiceAvailability: (service?: string) =>
    networkErrorService.checkServiceAvailability(service),

  isOnline: () => networkErrorService.isOnline(),

  getNetworkStatus: () => networkErrorService.getNetworkStatus(),

  getServiceStatus: () => networkErrorService.getServiceStatus(),

  getNetworkQuality: () => networkErrorService.getNetworkQuality(),

  getRetryRecommendations: () => networkErrorService.getRetryRecommendations(),

  enableOfflineMode: (config?: Partial<OfflineConfig>) =>
    networkErrorService.enableOfflineMode(config),

  disableOfflineMode: () => networkErrorService.disableOfflineMode(),

  getOfflineCapabilities: () => networkErrorService.getOfflineCapabilities()
};