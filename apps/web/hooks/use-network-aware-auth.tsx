/**
 * Network-Aware Authentication Hook
 * Provides authentication functionality with network error handling and retry logic
 * Requirements: 10.2, 10.3
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth, useSignIn, useSignUp } from '@clerk/nextjs';
import { 
  NetworkErrorHandler, 
  NetworkStatus, 
  ServiceStatus,
  networkErrorService 
} from '@/lib/services/network-error-service';
import { AuthErrorHandler } from '@/lib/services/auth-error-service';
import { AuthenticationError } from '@/lib/errors/authentication-errors';

/**
 * Network-aware authentication state
 */
export interface NetworkAwareAuthState {
  // Network status
  isOnline: boolean;
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  serviceAvailable: boolean;
  
  // Authentication state
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  
  // Operation states
  isSigningIn: boolean;
  isSigningUp: boolean;
  isRetrying: boolean;
  
  // Error state
  error: AuthenticationError | null;
  retryCount: number;
  canRetry: boolean;
  
  // Offline capabilities
  offlineCapabilities: {
    canSignIn: boolean;
    canSignUp: boolean;
    canResetPassword: boolean;
    canVerifyEmail: boolean;
    message: string;
  };
}

/**
 * Authentication operation options
 */
export interface AuthOperationOptions {
  enableRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  showOfflineMessage?: boolean;
  fallbackToOffline?: boolean;
}

/**
 * Network-aware authentication hook
 */
export function useNetworkAwareAuth() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();

  // Network and service status
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(
    networkErrorService.getNetworkStatus()
  );
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>(
    networkErrorService.getServiceStatus()
  );

  // Operation states
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<AuthenticationError | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Listen for network and service status changes
  useEffect(() => {
    const handleNetworkChange = (status: NetworkStatus) => {
      setNetworkStatus(status);
      
      // Clear errors when network comes back online
      if (status.isOnline && error) {
        setError(null);
        setRetryCount(0);
      }
    };

    const handleServiceChange = (status: ServiceStatus) => {
      setServiceStatus(status);
      
      // Clear errors when service becomes available
      if (status.isAvailable && error) {
        setError(null);
        setRetryCount(0);
      }
    };

    networkErrorService.addNetworkStatusListener(handleNetworkChange);
    networkErrorService.addServiceStatusListener(handleServiceChange);

    return () => {
      networkErrorService.removeNetworkStatusListener(handleNetworkChange);
      networkErrorService.removeServiceStatusListener(handleServiceChange);
    };
  }, [error]);

  /**
   * Sign in with network error handling
   */
  const signInWithRetry = useCallback(async (
    emailAddress: string,
    password: string,
    options: AuthOperationOptions = {}
  ) => {
    const {
      enableRetry = true,
      maxRetries = 3,
      retryDelay = 1000,
      showOfflineMessage = true,
      fallbackToOffline = false
    } = options;

    setIsSigningIn(true);
    setError(null);
    setRetryCount(0);

    try {
      // Check if operation should be attempted
      if (!networkStatus.isOnline && !fallbackToOffline) {
        throw NetworkErrorHandler.handleNetworkError(
          new Error('Device is offline'),
          { action: 'sign-in', email: emailAddress }
        );
      }

      if (!serviceStatus.isAvailable) {
        throw NetworkErrorHandler.handleNetworkError(
          new Error('Authentication service unavailable'),
          { action: 'sign-in', email: emailAddress }
        );
      }

      // Execute sign-in with retry logic
      const result = await NetworkErrorHandler.executeWithRetry(
        async () => {
          if (!signIn) throw new Error('Sign-in not initialized');
          
          const signInResult = await signIn.create({
            identifier: emailAddress,
            password
          });

          if (signInResult.status === 'complete') {
            return signInResult;
          } else {
            throw new Error('Sign-in incomplete');
          }
        },
        {
          maxAttempts: enableRetry ? maxRetries : 1,
          baseDelay: retryDelay,
          retryCondition: (error) => {
            // Don't retry credential errors
            if (error.message.includes('credential') || error.message.includes('password')) {
              return false;
            }
            return true;
          }
        },
        `signin_${emailAddress}_${Date.now()}`
      );

      return result;
    } catch (error) {
      const authError = AuthErrorHandler.handleSignInError(error, emailAddress, {
        metadata: {
          networkStatus,
          serviceStatus: serviceStatus.status
        }
      });
      
      setError(authError);
      throw authError;
    } finally {
      setIsSigningIn(false);
    }
  }, [signIn, networkStatus, serviceStatus]);

  /**
   * Sign up with network error handling
   */
  const signUpWithRetry = useCallback(async (
    emailAddress: string,
    password: string,
    options: AuthOperationOptions = {}
  ) => {
    const {
      enableRetry = true,
      maxRetries = 3,
      retryDelay = 1000,
      showOfflineMessage = true,
      fallbackToOffline = false
    } = options;

    setIsSigningUp(true);
    setError(null);
    setRetryCount(0);

    try {
      // Check if operation should be attempted
      if (!networkStatus.isOnline && !fallbackToOffline) {
        throw NetworkErrorHandler.handleNetworkError(
          new Error('Device is offline'),
          { action: 'sign-up', email: emailAddress }
        );
      }

      if (!serviceStatus.isAvailable) {
        throw NetworkErrorHandler.handleNetworkError(
          new Error('Authentication service unavailable'),
          { action: 'sign-up', email: emailAddress }
        );
      }

      // Execute sign-up with retry logic
      const result = await NetworkErrorHandler.executeWithRetry(
        async () => {
          if (!signUp) throw new Error('Sign-up not initialized');
          
          const signUpResult = await signUp.create({
            emailAddress,
            password
          });

          return signUpResult;
        },
        {
          maxAttempts: enableRetry ? maxRetries : 1,
          baseDelay: retryDelay
        },
        `signup_${emailAddress}_${Date.now()}`
      );

      return result;
    } catch (error) {
      const authError = AuthErrorHandler.handleSignUpError(error, emailAddress, {
        metadata: {
          networkStatus,
          serviceStatus: serviceStatus.status
        }
      });
      
      setError(authError);
      throw authError;
    } finally {
      setIsSigningUp(false);
    }
  }, [signUp, networkStatus, serviceStatus]);

  /**
   * Retry last failed operation
   */
  const retryLastOperation = useCallback(async () => {
    if (!error || isRetrying) return;

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      // Check service availability first
      await networkErrorService.checkServiceAvailability();
      
      // Clear error to allow retry
      setError(null);
      
      // The actual retry would need to be handled by the calling component
      // since we don't store the original operation parameters
      
    } catch (retryError) {
      const authError = NetworkErrorHandler.handleNetworkError(retryError as Error);
      setError(authError);
    } finally {
      setIsRetrying(false);
    }
  }, [error, isRetrying]);

  /**
   * Clear current error
   */
  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  /**
   * Check if retry is recommended
   */
  const getRetryRecommendation = useCallback(() => {
    if (!error) return null;
    
    const recommendations = NetworkErrorHandler.getRetryRecommendations();
    return {
      ...recommendations,
      currentAttempts: retryCount
    };
  }, [error, retryCount]);

  /**
   * Get network quality assessment
   */
  const getNetworkQuality = useCallback(() => {
    return NetworkErrorHandler.getNetworkQuality();
  }, []);

  /**
   * Get offline capabilities
   */
  const getOfflineCapabilities = useCallback(() => {
    return NetworkErrorHandler.getOfflineCapabilities();
  }, []);

  // Compute derived state
  const isOnline = NetworkErrorHandler.isOnline();
  const networkQuality = getNetworkQuality();
  const serviceAvailable = serviceStatus.isAvailable;
  const offlineCapabilities = getOfflineCapabilities();
  const canRetry = error && NetworkErrorHandler.getRetryRecommendations().shouldRetry;

  const state: NetworkAwareAuthState = {
    // Network status
    isOnline,
    networkQuality,
    serviceAvailable,
    
    // Authentication state
    isLoaded: isLoaded && signInLoaded && signUpLoaded,
    isSignedIn: isSignedIn || false,
    userId: userId || null,
    
    // Operation states
    isSigningIn,
    isSigningUp,
    isRetrying,
    
    // Error state
    error,
    retryCount,
    canRetry: canRetry || false,
    
    // Offline capabilities
    offlineCapabilities
  };

  return {
    // State
    ...state,
    
    // Network status
    networkStatus,
    serviceStatus,
    
    // Operations
    signInWithRetry,
    signUpWithRetry,
    retryLastOperation,
    clearError,
    
    // Utilities
    getRetryRecommendation,
    getNetworkQuality,
    getOfflineCapabilities,
    
    // Network service methods
    checkServiceAvailability: () => networkErrorService.checkServiceAvailability(),
    enableOfflineMode: (config?: any) => networkErrorService.enableOfflineMode(config),
    disableOfflineMode: () => networkErrorService.disableOfflineMode()
  };
}

/**
 * Hook for monitoring network status only
 */
export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(
    networkErrorService.getNetworkStatus()
  );
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>(
    networkErrorService.getServiceStatus()
  );

  useEffect(() => {
    const handleNetworkChange = (status: NetworkStatus) => {
      setNetworkStatus(status);
    };

    const handleServiceChange = (status: ServiceStatus) => {
      setServiceStatus(status);
    };

    networkErrorService.addNetworkStatusListener(handleNetworkChange);
    networkErrorService.addServiceStatusListener(handleServiceChange);

    return () => {
      networkErrorService.removeNetworkStatusListener(handleNetworkChange);
      networkErrorService.removeServiceStatusListener(handleServiceChange);
    };
  }, []);

  return {
    networkStatus,
    serviceStatus,
    isOnline: networkStatus.isOnline,
    networkQuality: networkErrorService.getNetworkQuality(),
    serviceAvailable: serviceStatus.isAvailable,
    retryRecommendations: networkErrorService.getRetryRecommendations(),
    offlineCapabilities: networkErrorService.getOfflineCapabilities()
  };
}

/**
 * Hook for handling network errors in components
 */
export function useNetworkErrorHandler() {
  const [error, setError] = useState<AuthenticationError | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleError = useCallback((error: Error, context?: any) => {
    const networkError = NetworkErrorHandler.handleNetworkError(error, context);
    setError(networkError);
    return networkError;
  }, []);

  const retry = useCallback(async (operation: () => Promise<any>, options?: any) => {
    setIsRetrying(true);
    try {
      const result = await NetworkErrorHandler.executeWithRetry(operation, options);
      setError(null);
      return result;
    } catch (retryError) {
      const networkError = NetworkErrorHandler.handleNetworkError(retryError as Error);
      setError(networkError);
      throw networkError;
    } finally {
      setIsRetrying(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    isRetrying,
    handleError,
    retry,
    clearError
  };
}