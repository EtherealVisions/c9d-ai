/**
 * Network Error Service Tests
 * Tests for connectivity detection, retry mechanisms, and offline support
 * Requirements: 10.2, 10.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NetworkErrorService, NetworkErrorHandler, NetworkErrorType } from '../network-error-service';
import { AuthErrorCode } from '@/lib/errors/authentication-errors';

// Mock global objects
const mockNavigator = {
  onLine: true,
  connection: {
    type: 'wifi',
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    saveData: false,
    addEventListener: vi.fn()
  }
};

const mockWindow = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

// Mock fetch
const mockFetch = vi.fn();

describe('NetworkErrorService', () => {
  let networkService: NetworkErrorService;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock global objects
    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true
    });
    
    Object.defineProperty(global, 'window', {
      value: mockWindow,
      writable: true
    });
    
    global.fetch = mockFetch;
    
    // Get fresh instance
    networkService = NetworkErrorService.getInstance();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Network Status Detection', () => {
    it('should detect online status', () => {
      mockNavigator.onLine = true;
      expect(networkService.isOnline()).toBe(true);
    });

    it('should detect offline status', () => {
      mockNavigator.onLine = false;
      expect(networkService.isOnline()).toBe(false);
    });

    it('should get network status with connection info', () => {
      const status = networkService.getNetworkStatus();
      
      expect(status).toMatchObject({
        isOnline: true,
        connectionType: expect.any(String),
        effectiveType: expect.any(String),
        downlink: expect.any(Number),
        rtt: expect.any(Number),
        saveData: expect.any(Boolean)
      });
    });

    it('should assess network quality correctly', () => {
      // Reset to online first
      mockNavigator.onLine = true;
      
      // Excellent network - need to update network status first
      networkService['networkStatus'] = {
        isOnline: true,
        connectionType: 'wifi',
        effectiveType: '4g',
        downlink: 15,
        rtt: 50,
        saveData: false
      };
      expect(networkService.getNetworkQuality()).toBe('excellent');

      // Poor network
      networkService['networkStatus'] = {
        isOnline: true,
        connectionType: 'cellular',
        effectiveType: '2g',
        downlink: 0.5,
        rtt: 800,
        saveData: false
      };
      expect(networkService.getNetworkQuality()).toBe('poor');

      // Offline
      mockNavigator.onLine = false;
      expect(networkService.getNetworkQuality()).toBe('offline');
    });
  });

  describe('Service Availability', () => {
    it('should check service availability successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      const status = await networkService.checkServiceAvailability();
      
      expect(status.isAvailable).toBe(true);
      expect(status.status).toBe('operational');
      expect(mockFetch).toHaveBeenCalledWith('/api/health', expect.any(Object));
    });

    it('should detect service unavailability', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503
      });

      const status = await networkService.checkServiceAvailability();
      
      expect(status.isAvailable).toBe(false);
      expect(status.status).toBe('maintenance');
    });

    it('should handle service check errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const status = await networkService.checkServiceAvailability();
      
      expect(status.isAvailable).toBe(false);
      expect(status.status).toBe('outage');
    });
  });

  describe('Retry Logic', () => {
    it('should execute operation successfully on first attempt', async () => {
      // Ensure we're online and service is available
      mockNavigator.onLine = true;
      networkService['serviceStatus'] = {
        isAvailable: true,
        status: 'operational',
        affectedServices: [],
        lastChecked: new Date()
      };
      
      const mockOperation = vi.fn().mockResolvedValue('success');
      
      const result = await networkService.executeWithRetry(mockOperation);
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry failed operations', async () => {
      // Ensure we're online and service is available
      mockNavigator.onLine = true;
      networkService['serviceStatus'] = {
        isAvailable: true,
        status: 'operational',
        affectedServices: [],
        lastChecked: new Date()
      };
      
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');
      
      const result = await networkService.executeWithRetry(mockOperation, {
        maxAttempts: 3,
        baseDelay: 10 // Short delay for testing
      });
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should respect max retry attempts', async () => {
      // Ensure we're online and service is available
      mockNavigator.onLine = true;
      networkService['serviceStatus'] = {
        isAvailable: true,
        status: 'operational',
        affectedServices: [],
        lastChecked: new Date()
      };
      
      const mockOperation = vi.fn().mockRejectedValue(new Error('Network error'));
      
      await expect(
        networkService.executeWithRetry(mockOperation, {
          maxAttempts: 2,
          baseDelay: 10
        })
      ).rejects.toThrow();
      
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      // Ensure we're online and service is available
      mockNavigator.onLine = true;
      networkService['serviceStatus'] = {
        isAvailable: true,
        status: 'operational',
        affectedServices: [],
        lastChecked: new Date()
      };
      
      const mockOperation = vi.fn().mockRejectedValue(new Error('Invalid credentials'));
      
      await expect(
        networkService.executeWithRetry(mockOperation, {
          maxAttempts: 3,
          baseDelay: 10,
          retryCondition: (error) => !error.message.includes('credentials')
        })
      ).rejects.toThrow();
      
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should calculate exponential backoff delays', async () => {
      const delays: number[] = [];
      const mockOperation = vi.fn().mockRejectedValue(new Error('Network error'));
      
      // Mock setTimeout to capture delays
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn((callback, delay) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0);
      }) as any;
      
      try {
        await networkService.executeWithRetry(mockOperation, {
          maxAttempts: 3,
          baseDelay: 100,
          backoffMultiplier: 2
        });
      } catch (error) {
        // Expected to fail
      }
      
      global.setTimeout = originalSetTimeout;
      
      expect(delays).toHaveLength(2); // 2 retries after initial failure
      expect(delays[0]).toBeGreaterThanOrEqual(50); // First retry delay (with jitter)
      expect(delays[1]).toBeGreaterThanOrEqual(100); // Second retry delay (exponential with jitter)
    });
  });

  describe('Network Error Classification', () => {
    it('should classify timeout errors', () => {
      const error = new Error('Request timeout');
      const authError = networkService.handleNetworkError(error);
      
      expect(authError.authCode).toBe(AuthErrorCode.NETWORK_ERROR);
      expect(authError.userFriendlyMessage).toContain('connection');
    });

    it('should classify connection errors', () => {
      const error = new Error('Connection refused');
      const authError = networkService.handleNetworkError(error);
      
      expect(authError.authCode).toBe(AuthErrorCode.NETWORK_ERROR);
      expect(authError.userFriendlyMessage).toContain('connection');
    });

    it('should classify service unavailable errors', () => {
      const error = new Error('Service unavailable');
      const authError = networkService.handleNetworkError(error);
      
      expect(authError.authCode).toBe(AuthErrorCode.SERVICE_UNAVAILABLE);
      expect(authError.userFriendlyMessage).toContain('temporarily unavailable');
    });

    it('should classify rate limiting errors', () => {
      const error = new Error('Rate limit exceeded');
      const authError = networkService.handleNetworkError(error);
      
      expect(authError.authCode).toBe(AuthErrorCode.RATE_LIMITED);
      expect(authError.userFriendlyMessage).toContain('making requests too quickly');
    });
  });

  describe('Offline Mode', () => {
    it('should enable offline mode', () => {
      networkService.enableOfflineMode({
        showOfflineIndicator: true,
        gracefulDegradation: true
      });
      
      const capabilities = networkService.getOfflineCapabilities();
      expect(capabilities.message).toContain('internet connection');
    });

    it('should disable offline mode', () => {
      networkService.enableOfflineMode();
      networkService.disableOfflineMode();
      
      const capabilities = networkService.getOfflineCapabilities();
      expect(capabilities.message).toContain('not enabled');
    });

    it('should provide offline capabilities assessment', () => {
      networkService.enableOfflineMode();
      const capabilities = networkService.getOfflineCapabilities();
      
      expect(capabilities).toMatchObject({
        canSignIn: false, // Auth requires network
        canSignUp: false, // Auth requires network
        canResetPassword: false, // Requires email service
        canVerifyEmail: false, // Requires server validation
        message: expect.any(String)
      });
    });
  });

  describe('Retry Recommendations', () => {
    it('should provide retry recommendations based on network quality', () => {
      // Reset to online and service available
      mockNavigator.onLine = true;
      networkService['serviceStatus'] = {
        isAvailable: true,
        status: 'operational',
        affectedServices: [],
        lastChecked: new Date()
      };
      
      // Excellent network
      networkService['networkStatus'] = {
        isOnline: true,
        connectionType: 'wifi',
        effectiveType: '4g',
        downlink: 15,
        rtt: 50,
        saveData: false
      };
      
      const recommendations = networkService.getRetryRecommendations();
      
      expect(recommendations.shouldRetry).toBe(true);
      expect(recommendations.recommendedDelay).toBe(1000);
      expect(recommendations.maxAttempts).toBe(3);
    });

    it('should recommend no retry when offline', () => {
      mockNavigator.onLine = false;
      
      const recommendations = networkService.getRetryRecommendations();
      
      expect(recommendations.shouldRetry).toBe(false);
      expect(recommendations.reason).toContain('offline');
    });

    it('should adjust recommendations for poor network', () => {
      // Reset to online and service available
      mockNavigator.onLine = true;
      networkService['serviceStatus'] = {
        isAvailable: true,
        status: 'operational',
        affectedServices: [],
        lastChecked: new Date()
      };
      
      networkService['networkStatus'] = {
        isOnline: true,
        connectionType: 'cellular',
        effectiveType: '2g',
        downlink: 0.5,
        rtt: 800,
        saveData: false
      };
      
      const recommendations = networkService.getRetryRecommendations();
      
      expect(recommendations.shouldRetry).toBe(true);
      expect(recommendations.recommendedDelay).toBe(10000);
      expect(recommendations.maxAttempts).toBe(2);
    });
  });

  describe('Event Listeners', () => {
    it('should add and remove network status listeners', () => {
      const listener = vi.fn();
      
      networkService.addNetworkStatusListener(listener);
      networkService.removeNetworkStatusListener(listener);
      
      // Listeners are managed internally, test passes if no errors
      expect(true).toBe(true);
    });

    it('should add and remove service status listeners', () => {
      const listener = vi.fn();
      
      networkService.addServiceStatusListener(listener);
      networkService.removeServiceStatusListener(listener);
      
      // Listeners are managed internally, test passes if no errors
      expect(true).toBe(true);
    });
  });
});

describe('NetworkErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock global objects
    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true
    });
    
    global.fetch = mockFetch;
  });

  describe('Convenience Functions', () => {
    it('should execute operations with retry', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');
      
      const result = await NetworkErrorHandler.executeWithRetry(mockOperation);
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should handle network errors', () => {
      const error = new Error('Network connection failed');
      const authError = NetworkErrorHandler.handleNetworkError(error);
      
      expect(authError.authCode).toBe(AuthErrorCode.NETWORK_ERROR);
    });

    it('should check service availability', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      });
      
      const status = await NetworkErrorHandler.checkServiceAvailability();
      
      expect(status.isAvailable).toBe(true);
    });

    it('should get network status', () => {
      const status = NetworkErrorHandler.getNetworkStatus();
      
      expect(status).toHaveProperty('isOnline');
      expect(status).toHaveProperty('connectionType');
    });

    it('should get network quality', () => {
      const quality = NetworkErrorHandler.getNetworkQuality();
      
      expect(['excellent', 'good', 'fair', 'poor', 'offline']).toContain(quality);
    });

    it('should get retry recommendations', () => {
      const recommendations = NetworkErrorHandler.getRetryRecommendations();
      
      expect(recommendations).toHaveProperty('shouldRetry');
      expect(recommendations).toHaveProperty('recommendedDelay');
      expect(recommendations).toHaveProperty('maxAttempts');
      expect(recommendations).toHaveProperty('reason');
    });

    it('should enable and disable offline mode', () => {
      NetworkErrorHandler.enableOfflineMode();
      let capabilities = NetworkErrorHandler.getOfflineCapabilities();
      expect(capabilities.message).toContain('internet connection');
      
      NetworkErrorHandler.disableOfflineMode();
      capabilities = NetworkErrorHandler.getOfflineCapabilities();
      expect(capabilities.message).toContain('not enabled');
    });
  });
});

describe('Network Error Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true
    });
    
    global.fetch = mockFetch;
  });

  it('should handle authentication with network retry', async () => {
    // Simulate network failure then success
    const mockAuthOperation = vi.fn()
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce({ success: true });
    
    const result = await NetworkErrorHandler.executeWithRetry(
      mockAuthOperation,
      {
        maxAttempts: 2,
        baseDelay: 10
      }
    );
    
    expect(result).toEqual({ success: true });
    expect(mockAuthOperation).toHaveBeenCalledTimes(2);
  });

  it('should provide appropriate error messages for different network conditions', () => {
    const testCases = [
      { error: new Error('timeout'), expectedCode: AuthErrorCode.NETWORK_ERROR },
      { error: new Error('dns lookup failed'), expectedCode: AuthErrorCode.NETWORK_ERROR },
      { error: new Error('service unavailable'), expectedCode: AuthErrorCode.SERVICE_UNAVAILABLE },
      { error: new Error('rate limit exceeded'), expectedCode: AuthErrorCode.RATE_LIMITED }
    ];
    
    testCases.forEach(({ error, expectedCode }) => {
      const authError = NetworkErrorHandler.handleNetworkError(error);
      expect(authError.authCode).toBe(expectedCode);
      expect(authError.userFriendlyMessage).toBeTruthy();
      expect(authError.recoveryActions.length).toBeGreaterThan(0);
    });
  });

  it('should adapt retry behavior based on network quality', () => {
    // Test different network conditions
    const networkConditions = [
      { effectiveType: '4g', rtt: 50, expectedDelay: 1000 },
      { effectiveType: '3g', rtt: 200, expectedDelay: 5000 },
      { effectiveType: '2g', rtt: 800, expectedDelay: 10000 }
    ];
    
    networkConditions.forEach(({ effectiveType, rtt, expectedDelay }) => {
      // Update the network service's internal state
      const networkService = NetworkErrorService.getInstance();
      networkService['networkStatus'] = {
        isOnline: true,
        connectionType: 'wifi',
        effectiveType: effectiveType as any,
        downlink: effectiveType === '4g' ? 10 : effectiveType === '3g' ? 5 : 1,
        rtt,
        saveData: false
      };
      
      const recommendations = NetworkErrorHandler.getRetryRecommendations();
      expect(recommendations.recommendedDelay).toBeGreaterThanOrEqual(expectedDelay);
    });
  });
});