/**
 * Authentication Error Handler Component
 * Provides comprehensive error display and recovery actions
 * Requirements: 10.1, 10.2, 10.5
 */

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  RefreshCw, 
  Mail, 
  Key, 
  Shield, 
  Clock, 
  Home, 
  LogIn,
  UserPlus,
  HelpCircle,
  Wifi,
  Activity,
  ArrowLeft,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { AuthenticationError, RecoveryAction } from '@/lib/errors/authentication-errors';
import { AuthLogger } from '@/lib/errors/auth-error-logger';
import { NetworkErrorHandler } from '@/lib/services/network-error-service';
import { cn } from '@/lib/utils';

interface AuthErrorHandlerProps {
  error: AuthenticationError;
  onRetry?: () => void;
  onRecoveryAction?: (action: string) => void;
  className?: string;
  showDebugInfo?: boolean;
  autoRetry?: boolean;
  retryDelay?: number;
}

/**
 * Icon mapping for recovery actions
 */
const RECOVERY_ACTION_ICONS: Record<string, React.ComponentType<any>> = {
  'refresh': RefreshCw,
  'mail': Mail,
  'key': Key,
  'shield': Shield,
  'clock': Clock,
  'home': Home,
  'log-in': LogIn,
  'user-plus': UserPlus,
  'help-circle': HelpCircle,
  'wifi': Wifi,
  'activity': Activity,
  'arrow-left': ArrowLeft
};

/**
 * Get appropriate icon for error type
 */
function getErrorIcon(error: AuthenticationError): React.ComponentType<any> {
  switch (error.authCode) {
    case 'INVALID_CREDENTIALS':
    case 'AUTHENTICATION_FAILED':
      return XCircle;
    case 'EMAIL_NOT_VERIFIED':
    case 'VERIFICATION_CODE_INVALID':
      return Mail;
    case 'ACCOUNT_LOCKED':
    case 'ACCOUNT_SUSPENDED':
      return Shield;
    case 'SESSION_EXPIRED':
    case 'TOKEN_EXPIRED':
      return Clock;
    case 'TWO_FACTOR_REQUIRED':
      return Shield;
    case 'NETWORK_ERROR':
      return Wifi;
    case 'SERVICE_UNAVAILABLE':
      return Activity;
    default:
      return AlertTriangle;
  }
}

/**
 * Get error severity level for styling
 */
function getErrorSeverity(error: AuthenticationError): 'low' | 'medium' | 'high' | 'critical' {
  switch (error.authCode) {
    case 'ACCOUNT_LOCKED':
    case 'ACCOUNT_SUSPENDED':
    case 'TOO_MANY_ATTEMPTS':
      return 'critical';
    case 'INVALID_CREDENTIALS':
    case 'AUTHENTICATION_FAILED':
    case 'SESSION_EXPIRED':
      return 'high';
    case 'EMAIL_NOT_VERIFIED':
    case 'TWO_FACTOR_REQUIRED':
    case 'VERIFICATION_CODE_INVALID':
      return 'medium';
    default:
      return 'low';
  }
}

/**
 * Authentication Error Handler Component
 */
export const AuthErrorHandler: React.FC<AuthErrorHandlerProps> = ({
  error,
  onRetry,
  onRecoveryAction,
  className,
  showDebugInfo = false,
  autoRetry = false,
  retryDelay = 3000
}) => {
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [timeUntilRetry, setTimeUntilRetry] = useState(0);

  const ErrorIcon = getErrorIcon(error);
  const severity = getErrorSeverity(error);

  // Auto-retry logic
  useEffect(() => {
    if (autoRetry && onRetry && retryCount < 3) {
      const timer = setTimeout(() => {
        handleRetry();
      }, retryDelay);

      // Countdown timer
      const countdownInterval = setInterval(() => {
        setTimeUntilRetry(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setTimeUntilRetry(Math.ceil(retryDelay / 1000));

      return () => {
        clearTimeout(timer);
        clearInterval(countdownInterval);
      };
    }
  }, [autoRetry, onRetry, retryCount, retryDelay]);

  // Log error when component mounts
  useEffect(() => {
    AuthLogger.logSignInFailure(error, {
      component: 'AuthErrorHandler',
      severity,
      retryCount
    });
  }, [error, severity, retryCount]);

  /**
   * Handle retry action
   */
  const handleRetry = useCallback(async () => {
    if (!onRetry || isRetrying) return;

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      await onRetry();
    } catch (retryError) {
      console.error('Retry failed:', retryError);
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry, isRetrying]);

  /**
   * Handle recovery action
   */
  const handleRecoveryAction = useCallback((action: RecoveryAction) => {
    // Log recovery action
    AuthLogger.logSignInAttempt({
      userId: error.context.userId,
      clerkUserId: error.context.clerkUserId
    }, {
      action: 'recovery_action',
      recoveryType: action.type,
      recoveryAction: action.action
    });

    if (onRecoveryAction) {
      onRecoveryAction(action.action);
      return;
    }

    // Default recovery action handling
    switch (action.action) {
      case 'retry':
        handleRetry();
        break;
      case 'resend-verification':
        // Handle resend verification
        break;
      case 'resend-code':
        // Handle resend code
        break;
      case 'show-2fa':
        // Handle show 2FA
        break;
      case 'use-backup-code':
        // Handle backup code
        break;
      case 'check-spam':
        // Show spam folder instructions
        break;
      case 'retry-later':
        // Show retry later message
        break;
      case 'check-connection':
        // Show connection check instructions
        break;
      default:
        // Navigate to URL
        if (action.action.startsWith('/')) {
          router.push(action.action);
        } else if (action.action.startsWith('http')) {
          window.open(action.action, '_blank');
        }
    }
  }, [error, onRecoveryAction, router, handleRetry]);

  /**
   * Get severity-based styling
   */
  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          cardClass: 'border-red-200 bg-red-50',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          titleColor: 'text-red-900',
          descColor: 'text-red-700'
        };
      case 'high':
        return {
          cardClass: 'border-orange-200 bg-orange-50',
          iconBg: 'bg-orange-100',
          iconColor: 'text-orange-600',
          titleColor: 'text-orange-900',
          descColor: 'text-orange-700'
        };
      case 'medium':
        return {
          cardClass: 'border-yellow-200 bg-yellow-50',
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          titleColor: 'text-yellow-900',
          descColor: 'text-yellow-700'
        };
      default:
        return {
          cardClass: 'border-blue-200 bg-blue-50',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          titleColor: 'text-blue-900',
          descColor: 'text-blue-700'
        };
    }
  };

  const styles = getSeverityStyles(severity);

  return (
    <Card className={cn('w-full max-w-md mx-auto', styles.cardClass, className)}>
      <CardHeader className="text-center pb-4">
        <div className={cn('mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4', styles.iconBg)}>
          <ErrorIcon className={cn('w-6 h-6', styles.iconColor)} />
        </div>
        
        <div className="flex items-center justify-center gap-2 mb-2">
          <CardTitle className={cn('text-xl font-semibold', styles.titleColor)}>
            Authentication Error
          </CardTitle>
          <Badge variant={severity === 'critical' ? 'destructive' : 'secondary'}>
            {error.authCode}
          </Badge>
        </div>
        
        <CardDescription className={cn('text-sm', styles.descColor)}>
          {error.userFriendlyMessage}
        </CardDescription>

        {autoRetry && timeUntilRetry > 0 && (
          <div className="mt-3">
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Auto-retry in {timeUntilRetry} seconds... (Attempt {retryCount + 1}/3)
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Recovery Actions */}
        {error.recoveryActions.length > 0 && (
          <div className="space-y-3">
            {error.recoveryActions.map((action, index) => {
              const ActionIcon = RECOVERY_ACTION_ICONS[action.icon || 'help-circle'] || HelpCircle;
              const isPrimary = action.type === 'primary';
              const isSecondary = action.type === 'secondary';

              return (
                <div key={index} className="space-y-1">
                  <Button
                    onClick={() => handleRecoveryAction(action)}
                    disabled={isRetrying}
                    variant={isPrimary ? 'default' : isSecondary ? 'outline' : 'ghost'}
                    className="w-full justify-start"
                    size="sm"
                  >
                    <ActionIcon className="w-4 h-4 mr-2" />
                    {action.label}
                    {isRetrying && action.action === 'retry' && (
                      <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                    )}
                  </Button>
                  
                  {action.description && (
                    <p className="text-xs text-gray-500 ml-6">
                      {action.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Debug Information */}
        {showDebugInfo && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 mb-2">
              Technical Details
            </summary>
            <div className="space-y-2 p-3 bg-gray-100 rounded text-xs font-mono">
              <div><strong>Error Code:</strong> {error.authCode}</div>
              <div><strong>Request ID:</strong> {error.requestId || 'N/A'}</div>
              <div><strong>Timestamp:</strong> {error.timestamp.toISOString()}</div>
              {error.context.sessionId && (
                <div><strong>Session ID:</strong> {error.context.sessionId}</div>
              )}
              {error.context.userId && (
                <div><strong>User ID:</strong> {error.context.userId}</div>
              )}
              {error.context.attemptCount && (
                <div><strong>Attempt Count:</strong> {error.context.attemptCount}</div>
              )}
              {error.debugInfo && Object.keys(error.debugInfo).length > 0 && (
                <div>
                  <strong>Debug Info:</strong>
                  <pre className="mt-1 text-xs overflow-auto max-h-32">
                    {JSON.stringify(error.debugInfo, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}

        {/* Retry Information */}
        {retryCount > 0 && (
          <div className="text-xs text-gray-500 text-center">
            Retry attempts: {retryCount}/3
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Simplified authentication error display
 */
export const SimpleAuthError: React.FC<{
  error: AuthenticationError;
  onRetry?: () => void;
  className?: string;
}> = ({ error, onRetry, className }) => {
  return (
    <Alert variant="destructive" className={className}>
      <XCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{error.userFriendlyMessage}</span>
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            size="sm"
            className="ml-2"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};

/**
 * Authentication error toast notification
 */
export const AuthErrorToast: React.FC<{
  error: AuthenticationError;
  onDismiss?: () => void;
  onAction?: (action: string) => void;
}> = ({ error, onDismiss, onAction }) => {
  const primaryAction = error.recoveryActions.find(action => action.type === 'primary');

  return (
    <div className="flex items-start space-x-3 p-4 bg-white border border-red-200 rounded-lg shadow-lg">
      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">
          Authentication Error
        </p>
        <p className="text-sm text-gray-600">
          {error.userFriendlyMessage}
        </p>
        {primaryAction && (
          <div className="mt-2">
            <Button
              onClick={() => onAction?.(primaryAction.action)}
              variant="outline"
              size="sm"
            >
              {primaryAction.label}
            </Button>
          </div>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <XCircle className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};