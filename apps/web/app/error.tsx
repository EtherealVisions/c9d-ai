'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Global error boundary for the application
 * Provides a user-friendly error display with recovery options
 */
export default function Error({ error, reset }: ErrorProps) {
  React.useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error boundary caught:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Error Icon */}
        <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>

        {/* Error Message */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-foreground">
            Something went wrong!
          </h1>
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred while loading this page.
            {process.env.NODE_ENV === 'development' && error.message && (
              <span className="block mt-2 text-xs">
                {error.message}
              </span>
            )}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
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
            Go to Homepage
          </Button>
        </div>

        {/* Debug Info (only in development) */}
        {process.env.NODE_ENV === 'development' && error.stack && (
          <details className="mt-8 text-left">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              Error Details (Development Only)
            </summary>
            <pre className="mt-2 p-4 bg-muted rounded-md text-xs overflow-auto max-h-64">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}