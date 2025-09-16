import React from 'react'
import { AuthLayout } from '@/components/auth'

/**
 * Loading component for authentication pages
 * Provides a consistent loading experience with the auth layout
 */
export default function AuthLoading() {
  return (
    <AuthLayout>
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center space-y-4">
          {/* Loading Spinner */}
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          
          {/* Loading Text */}
          <p className="text-sm text-muted-foreground">
            Loading authentication...
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}