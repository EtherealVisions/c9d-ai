'use client'

import React from 'react'
import { AuthLayout } from '@/components/auth'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface AuthErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Error boundary for authentication pages
 * Provides a user-friendly error display with recovery options
 */
export default function AuthError({ error, reset }: AuthErrorProps) {
  return (
    <AuthLayout
      title="Something went wrong"
      subtitle="We encountered an error while loading the authentication page"
    >
      <div className="flex flex-col items-center space-y-6 py-8">
        {/* Error Icon */}
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>

        {/* Error Message */}
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            Authentication Error
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {error.message || 'An unexpected error occurred while loading the authentication page.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={reset}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/'}
          >
            Go Home
          </Button>
        </div>

        {/* Debug Info (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-8 w-full">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              Debug Information
            </summary>
            <pre className="mt-2 p-4 bg-muted rounded-md text-xs overflow-auto">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </AuthLayout>
  )
}