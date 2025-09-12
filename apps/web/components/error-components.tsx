'use client';

import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { 
  AlertTriangle, 
  Lock, 
  RefreshCw, 
  Home, 
  LogIn,
  Shield,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { BaseError } from '@/lib/errors/custom-errors';
import { getUserFriendlyMessage } from '@/lib/errors/error-utils';

interface ErrorComponentProps {
  error?: BaseError | Error | string;
  title?: string;
  description?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
  showDetails?: boolean;
  className?: string;
}

/**
 * Generic error display component
 */
export const ErrorDisplay: React.FC<ErrorComponentProps> = ({
  error,
  title = 'Something went wrong',
  description,
  onRetry,
  onGoHome,
  showDetails = false,
  className = '',
}) => {
  const errorMessage = React.useMemo(() => {
    if (!error) return description || 'An unexpected error occurred';
    
    if (typeof error === 'string') return error;
    
    if (error instanceof BaseError) {
      return description || getUserFriendlyMessage(error);
    }
    
    return description || error.message || 'An unexpected error occurred';
  }, [error, description]);

  return (
    <Card className={`w-full max-w-md mx-auto ${className}`}>
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <CardTitle className="text-xl font-semibold text-gray-900">
          {title}
        </CardTitle>
        <CardDescription className="text-gray-600">
          {errorMessage}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          {onRetry && (
            <Button onClick={onRetry} className="flex-1" variant="default">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
          {onGoHome && (
            <Button onClick={onGoHome} className="flex-1" variant="outline">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          )}
        </div>
        
        {showDetails && error && typeof error !== 'string' && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Technical Details
            </summary>
            <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-700 overflow-auto max-h-32">
              <div><strong>Error:</strong> {error.message}</div>
              {error instanceof BaseError && (
                <>
                  <div><strong>Code:</strong> {error.code}</div>
                  <div><strong>Timestamp:</strong> {error.timestamp}</div>
                  {error.requestId && (
                    <div><strong>Request ID:</strong> {error.requestId}</div>
                  )}
                </>
              )}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Authentication error component
 */
export const AuthenticationError: React.FC<{
  onSignIn?: () => void;
  onGoHome?: () => void;
  message?: string;
}> = ({ 
  onSignIn = () => window.location.href = '/sign-in',
  onGoHome = () => window.location.href = '/',
  message = 'You need to sign in to access this page.'
}) => (
  <Card className="w-full max-w-md mx-auto">
    <CardHeader className="text-center">
      <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
        <LogIn className="w-6 h-6 text-blue-600" />
      </div>
      <CardTitle className="text-xl font-semibold text-gray-900">
        Authentication Required
      </CardTitle>
      <CardDescription className="text-gray-600">
        {message}
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <Button onClick={onSignIn} className="flex-1" variant="default">
          <LogIn className="w-4 h-4 mr-2" />
          Sign In
        </Button>
        <Button onClick={onGoHome} className="flex-1" variant="outline">
          <Home className="w-4 h-4 mr-2" />
          Go Home
        </Button>
      </div>
    </CardContent>
  </Card>
);

/**
 * Authorization error component
 */
export const AuthorizationError: React.FC<{
  onGoBack?: () => void;
  onGoHome?: () => void;
  message?: string;
}> = ({ 
  onGoBack = () => window.history.back(),
  onGoHome = () => window.location.href = '/',
  message = 'You don\'t have permission to access this page.'
}) => (
  <Card className="w-full max-w-md mx-auto">
    <CardHeader className="text-center">
      <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
        <Shield className="w-6 h-6 text-orange-600" />
      </div>
      <CardTitle className="text-xl font-semibold text-gray-900">
        Access Denied
      </CardTitle>
      <CardDescription className="text-gray-600">
        {message}
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <Button onClick={onGoBack} className="flex-1" variant="default">
          Go Back
        </Button>
        <Button onClick={onGoHome} className="flex-1" variant="outline">
          <Home className="w-4 h-4 mr-2" />
          Go Home
        </Button>
      </div>
    </CardContent>
  </Card>
);

/**
 * Not found error component
 */
export const NotFoundError: React.FC<{
  resource?: string;
  onGoHome?: () => void;
  onGoBack?: () => void;
}> = ({ 
  resource = 'page',
  onGoHome = () => window.location.href = '/',
  onGoBack = () => window.history.back()
}) => (
  <Card className="w-full max-w-md mx-auto">
    <CardHeader className="text-center">
      <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6 text-gray-600" />
      </div>
      <CardTitle className="text-xl font-semibold text-gray-900">
        {resource.charAt(0).toUpperCase() + resource.slice(1)} Not Found
      </CardTitle>
      <CardDescription className="text-gray-600">
        The {resource} you're looking for doesn't exist or has been moved.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <Button onClick={onGoBack} className="flex-1" variant="default">
          Go Back
        </Button>
        <Button onClick={onGoHome} className="flex-1" variant="outline">
          <Home className="w-4 h-4 mr-2" />
          Go Home
        </Button>
      </div>
    </CardContent>
  </Card>
);

/**
 * Validation error alert component
 */
export const ValidationErrorAlert: React.FC<{
  errors: Record<string, string[]>;
  title?: string;
  className?: string;
}> = ({ 
  errors, 
  title = 'Please fix the following errors:',
  className = ''
}) => {
  const errorList = Object.entries(errors).flatMap(([field, messages]) =>
    messages.map(message => ({ field, message }))
  );

  if (errorList.length === 0) return null;

  return (
    <Alert variant="destructive" className={className}>
      <XCircle className="h-4 w-4" />
      <AlertDescription>
        <div className="font-medium mb-2">{title}</div>
        <ul className="list-disc list-inside space-y-1">
          {errorList.map(({ field, message }, index) => (
            <li key={index} className="text-sm">
              <span className="font-medium capitalize">{field}:</span> {message}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
};

/**
 * Inline error message component
 */
export const InlineError: React.FC<{
  message: string;
  className?: string;
}> = ({ message, className = '' }) => (
  <div className={`flex items-center text-sm text-red-600 mt-1 ${className}`}>
    <XCircle className="w-4 h-4 mr-1 flex-shrink-0" />
    <span>{message}</span>
  </div>
);

/**
 * Field error component for forms
 */
export const FieldError: React.FC<{
  errors?: string[];
  className?: string;
}> = ({ errors, className = '' }) => {
  if (!errors || errors.length === 0) return null;

  return (
    <div className={`mt-1 ${className}`}>
      {errors.map((error, index) => (
        <InlineError key={index} message={error} />
      ))}
    </div>
  );
};