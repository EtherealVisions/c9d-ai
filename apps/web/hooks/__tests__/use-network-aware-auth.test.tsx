/**
 * Network-Aware Authentication Hook Tests
 * Tests for authentication with network error handling and retry logic
 * Requirements: 10.2, 10.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNetworkAwareAuth, useNetworkStatus, useNetworkErrorHandler } from '../use-network-aware-auth';
import { NetworkErrorHandler } from '@/lib/services/network-error-service';
import { AuthErrorCode } from '@/lib/errors/authentication-errors';

// Mock Clerk hooks
const mockUseAuth = vi.fn();
const mockUseSignIn = vi.fn();
const mockUseSignUp = vi.fn();

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => mockUseAuth(),
  useSignIn: () => mockUseSignIn(),
  useSignUp: () => mockUseSignUp()
}));

// Mock network error service
vi.mock('@/lib/services/network-error-service', () => ({
  NetworkErrorHandler: {
    isOnline: vi.fn(),
    getNetworkStatus: vi.fn(),
    getNetworkQuality: vi.fn(),
    getServiceStatus: vi.fn(),
    getRetryRecommendations: vi.fn(),
    getOfflineCapabilities: vi.fn(),
    executeWithRetry: vi.fn(),
    handleNetworkError: vi.fn(),
    checkServiceAvailability: vi.fn(),
    enableOfflineMode: vi.fn(),
    disableOfflineMode: vi.fn()
  },
  networkErrorService: {
    getNetworkStatus: vi.fn(),
    getServiceStatus: vi.fn(),
    addNetworkStatusListener: vi.fn(),
    removeNetworkStatusListener: vi.fn(),
    addServiceStatusListener: vi.fn(),
    removeServiceStatusListener: vi.fn(),
    checkServiceAvailability: vi.fn(),
    enableOfflineMode: vi.fn(),
    disableOfflineMode: vi.fn()
  }
}));

// Mock auth error service
vi.mock('@/lib/services/auth-error-service', () => ({
  AuthErrorHandler: {
    handleSignInError: vi.fn(),
    handleSignUpError: vi.fn()
  }
}));

describe('useNetworkAwareAuth', () => {
  const mockSignIn = {
    create: vi.fn(),
    isLoaded: true
  };
  
  const mockSignUp = {
    create: vi.fn(),
    isLoaded: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock returns
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      userId: null
    });
    
    mockUseSignIn.mockReturnValue({
      signIn: mockSignIn,
      isLoaded: true
    });
    
    mockUseSignUp.mockReturnValue({
      signUp: mockSignUp,
      isLoaded: true
    });
    
    NetworkErrorHandler.isOnline.mockReturnValue(true);
    NetworkErrorHandler.getNetworkStatus.mockReturnValue({
      isOnline: true,
      connectionType: 'wifi',
      effectiveType: '4g',
      downlink: 10,
      rtt: 50,
      saveData: false
    });
    NetworkErrorHandler.getNetworkQuality.mockReturnValue('excellent');
    NetworkErrorHandler.getServiceStatus.mockReturnValue({
      isAvailable: true,
      status: 'operational',
      affectedServices: [],
      lastChecked: new Date()
    });
    NetworkErrorHandler.getRetryRecommendations.mockReturnValue({
      shouldRetry: true,
      recommendedDelay: 1000,
      maxAttempts: 3,
      reason: 'Good network conditions'
    });
    NetworkErrorHandler.getOfflineCapabilities.mockReturnValue({
      canSignIn: false,
      canSignUp: false,
      canResetPassword: false,
      canVerifyEmail: false,
      message: 'Authentication requires an internet connection'
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should provide initial authentication state', () => {
      const { result } = renderHook(() => useNetworkAwareAuth());
      
      expect(result.current.isLoaded).toBe(true);
      expect(result.current.isSignedIn).toBe(false);
      expect(result.current.userId).toBe(null);
      expect(result.current.isOnline).toBe(true);
      expect(result.current.networkQuality).toBe('excellent');
      expect(result.current.serviceAvailable).toBe(true);
    });

    it('should provide operation states', () => {
      const { result } = renderHook(() => useNetworkAwareAuth());
      
      expect(result.current.isSigningIn).toBe(false);
      expect(result.current.isSigningUp).toBe(false);
      expect(result.current.isRetrying).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.retryCount).toBe(0);
    });

    it('should provide offline capabilities', () => {
      const { result } = renderHook(() => useNetworkAwareAuth());
      
      expect(result.current.offlineCapabilities).toMatchObject({
        canSignIn: false,
        canSignUp: false,
        canResetPassword: false,
        canVerifyEmail: false,
        message: expect.any(String)
      });
    });
  });

  describe('Sign In with Retry', () => {
    it('should sign in successfully on first attempt', async () => {
      const mockSignInResult = { status: 'complete', user: { id: 'user123' } };
      mockSignIn.create.mockResolvedValue(mockSignInResult);
      NetworkErrorHandler.executeWithRetry.mockImplementation(async (operation) => {
        return await operation();
      });
      
      const { result } = renderHook(() => useNetworkAwareAuth());
      
      await act(async () => {
        const signInResult = await result.current.signInWithRetry('test@example.com', 'password');
        expect(signInResult).toEqual(mockSignInResult);
      });
      
      expect(mockSignIn.create).toHaveBeenCalledWith({
        identifier: 'test@example.com',
        password: 'password'
      });
      expect(NetworkErrorHandler.executeWithRetry).toHaveBeenCalled();
    });

    it('should handle sign in with network retry', async () => {
      const mockSignInResult = { status: 'complete', user: { id: 'user123' } };
      NetworkErrorHandler.executeWithRetry.mockImplementation(async (operation) => {
        // Simulate retry logic
        try {
          throw new Error('Network error');
        } catch (error) {
          // Second attempt succeeds
          return await operation();
        }
      });
      mockSignIn.create.mockResolvedValue(mockSignInResult);
      
      const { result } = renderHook(() => useNetworkAwareAuth());
      
      await act(async () => {
        const signInResult = await result.current.signInWithRetry('test@example.com', 'password');
        expect(signInResult).toEqual(mockSignInResult);
      });
    });

    it('should handle sign in failure when offline', async () => {
      NetworkErrorHandler.isOnline.mockReturnValue(false);
      NetworkErrorHandler.getNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionType: 'unknown',
        effectiveType: 'unknown',
        downlink: 0,
        rtt: 0,
        saveData: false
      });
      
      const { result } = renderHook(() => useNetworkAwareAuth());
      
      await act(async () => {
        try {
          await result.current.signInWithRetry('test@example.com', 'password');
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });

    it('should handle sign in failure when service unavailable', async () => {
      NetworkErrorHandler.getServiceStatus.mockReturnValue({
        isAvailable: false,
        status: 'outage',
        affectedServices: ['auth'],
        lastChecked: new Date()
      });
      
      const { result } = renderHook(() => useNetworkAwareAuth());
      
      await act(async () => {
        try {
          await result.current.signInWithRetry('test@example.com', 'password');
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });

    it('should respect retry options', async () => {
      const mockSignInResult = { status: 'complete', user: { id: 'user123' } };
      mockSignIn.create.mockResolvedValue(mockSignInResult);
      
      const { result } = renderHook(() => useNetworkAwareAuth());
      
      await act(async () => {
        await result.current.signInWithRetry('test@example.com', 'password', {
          enableRetry: false,
          maxRetries: 1,
          retryDelay: 500
        });
      });
      
      expect(NetworkErrorHandler.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          maxAttempts: 1,
          baseDelay: 500
        }),
        expect.any(String)
      );
    });
  });

  describe('Sign Up with Retry', () => {
    it('should sign up successfully', async () => {
      const mockSignUpResult = { status: 'missing_requirements', user: { id: 'user123' } };
      mockSignUp.create.mockResolvedValue(mockSignUpResult);
      NetworkErrorHandler.executeWithRetry.mockImplementation(async (operation) => {
        return await operation();
      });
      
      const { result } = renderHook(() => useNetworkAwareAuth());
      
      await act(async () => {
        const signUpResult = await result.current.signUpWithRetry('test@example.com', 'password');
        expect(signUpResult).toEqual(mockSignUpResult);
      });
      
      expect(mockSignUp.create).toHaveBeenCalledWith({
        emailAddress: 'test@example.com',
        password: 'password'
      });
    });

    it('should handle sign up with network retry', async () => {
      const mockSignUpResult = { status: 'missing_requirements', user: { id: 'user123' } };
      NetworkErrorHandler.executeWithRetry.mockImplementation(async (operation) => {
        return await operation();
      });
      mockSignUp.create.mockResolvedValue(mockSignUpResult);
      
      const { result } = renderHook(() => useNetworkAwareAuth());
      
      await act(async () => {
        const signUpResult = await result.current.signUpWithRetry('test@example.com', 'password', {
          maxRetries: 2,
          retryDelay: 100
        });
        expect(signUpResult).toEqual(mockSignUpResult);
      });
    });
  });

  describe('Error Handling', () => {
    it('should set error state on sign in failure', async () => {
      const mockError = new Error('Authentication failed');
      NetworkErrorHandler.executeWithRetry.mockRejectedValue(mockError);
      
      const { result } = renderHook(() => useNetworkAwareAuth());
      
      await act(async () => {
        try {
          await result.current.signInWithRetry('test@example.com', 'password');
        } catch (error) {
          // Expected to fail
        }
      });
      
      expect(result.current.error).toBeDefined();
    });

    it('should clear error state', async () => {
      const mockError = new Error('Authentication failed');
      NetworkErrorHandler.executeWithRetry.mockRejectedValue(mockError);
      
      const { result } = renderHook(() => useNetworkAwareAuth());
      
      // Set error
      await act(async () => {
        try {
          await result.current.signInWithRetry('test@example.com', 'password');
        } catch (error) {
          // Expected to fail
        }
      });
      
      expect(result.current.error).toBeDefined();
      
      // Clear error
      act(() => {
        result.current.clearError();
      });
      
      expect(result.current.error).toBe(null);
      expect(result.current.retryCount).toBe(0);
    });
  });

  describe('Retry Operations', () => {
    it('should provide retry recommendations', () => {
      const { result } = renderHook(() => useNetworkAwareAuth());
      
      const recommendations = result.current.getRetryRecommendation();
      expect(recommendations).toBe(null); // No error, so no recommendations
    });

    it('should handle retry last operation', async () => {
      const { result } = renderHook(() => useNetworkAwareAuth());
      
      await act(async () => {
        await result.current.retryLastOperation();
      });
      
      expect(NetworkErrorHandler.checkServiceAvailability).toHaveBeenCalled();
    });
  });

  describe('Utility Functions', () => {
    it('should provide network quality assessment', () => {
      const { result } = renderHook(() => useNetworkAwareAuth());
      
      const quality = result.current.getNetworkQuality();
      expect(quality).toBe('excellent');
    });

    it('should provide offline capabilities', () => {
      const { result } = renderHook(() => useNetworkAwareAuth());
      
      const capabilities = result.current.getOfflineCapabilities();
      expect(capabilities).toMatchObject({
        canSignIn: false,
        canSignUp: false,
        canResetPassword: false,
        canVerifyEmail: false,
        message: expect.any(String)
      });
    });

    it('should check service availability', async () => {
      const { result } = renderHook(() => useNetworkAwareAuth());
      
      await act(async () => {
        await result.current.checkServiceAvailability();
      });
      
      expect(NetworkErrorHandler.checkServiceAvailability).toHaveBeenCalled();
    });

    it('should enable and disable offline mode', () => {
      const { result } = renderHook(() => useNetworkAwareAuth());
      
      act(() => {
        result.current.enableOfflineMode({ showOfflineIndicator: true });
      });
      
      expect(NetworkErrorHandler.enableOfflineMode).toHaveBeenCalledWith({
        showOfflineIndicator: true
      });
      
      act(() => {
        result.current.disableOfflineMode();
      });
      
      expect(NetworkErrorHandler.disableOfflineMode).toHaveBeenCalled();
    });
  });
});

describe('useNetworkStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    NetworkErrorHandler.getNetworkQuality.mockReturnValue('good');
    NetworkErrorHandler.getRetryRecommendations.mockReturnValue({
      shouldRetry: true,
      recommendedDelay: 2000,
      maxAttempts: 2,
      reason: 'Good network conditions'
    });
    NetworkErrorHandler.getOfflineCapabilities.mockReturnValue({
      canSignIn: false,
      canSignUp: false,
      canResetPassword: false,
      canVerifyEmail: false,
      message: 'Authentication requires an internet connection'
    });
  });

  it('should provide network status information', () => {
    const { result } = renderHook(() => useNetworkStatus());
    
    expect(result.current.isOnline).toBeDefined();
    expect(result.current.networkQuality).toBe('good');
    expect(result.current.serviceAvailable).toBeDefined();
    expect(result.current.retryRecommendations).toBeDefined();
    expect(result.current.offlineCapabilities).toBeDefined();
  });
});

describe('useNetworkErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle errors and provide retry functionality', async () => {
    const mockError = new Error('Network error');
    const mockAuthError = {
      authCode: AuthErrorCode.NETWORK_ERROR,
      message: 'Network error occurred'
    };
    
    NetworkErrorHandler.handleNetworkError.mockReturnValue(mockAuthError);
    NetworkErrorHandler.executeWithRetry.mockResolvedValue('success');
    
    const { result } = renderHook(() => useNetworkErrorHandler());
    
    // Handle error
    act(() => {
      const authError = result.current.handleError(mockError);
      expect(authError).toEqual(mockAuthError);
    });
    
    expect(result.current.error).toEqual(mockAuthError);
    
    // Retry operation
    const mockOperation = vi.fn().mockResolvedValue('success');
    
    await act(async () => {
      const retryResult = await result.current.retry(mockOperation);
      expect(retryResult).toBe('success');
    });
    
    expect(result.current.error).toBe(null);
    expect(NetworkErrorHandler.executeWithRetry).toHaveBeenCalledWith(
      mockOperation,
      undefined
    );
  });

  it('should handle retry failures', async () => {
    const mockError = new Error('Retry failed');
    const mockAuthError = {
      authCode: AuthErrorCode.NETWORK_ERROR,
      message: 'Network error occurred'
    };
    
    NetworkErrorHandler.executeWithRetry.mockRejectedValue(mockError);
    NetworkErrorHandler.handleNetworkError.mockReturnValue(mockAuthError);
    
    const { result } = renderHook(() => useNetworkErrorHandler());
    
    const mockOperation = vi.fn();
    
    await act(async () => {
      try {
        await result.current.retry(mockOperation);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toEqual(mockAuthError);
      }
    });
    
    expect(result.current.error).toEqual(mockAuthError);
    expect(result.current.isRetrying).toBe(false);
  });

  it('should clear errors', () => {
    const mockError = new Error('Network error');
    const mockAuthError = {
      authCode: AuthErrorCode.NETWORK_ERROR,
      message: 'Network error occurred'
    };
    
    NetworkErrorHandler.handleNetworkError.mockReturnValue(mockAuthError);
    
    const { result } = renderHook(() => useNetworkErrorHandler());
    
    // Set error
    act(() => {
      result.current.handleError(mockError);
    });
    
    expect(result.current.error).toEqual(mockAuthError);
    
    // Clear error
    act(() => {
      result.current.clearError();
    });
    
    expect(result.current.error).toBe(null);
  });
});