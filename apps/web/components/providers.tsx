'use client'

import React from 'react'
import { ClerkProvider } from '@clerk/nextjs'
import { AuthProvider } from '@/lib/contexts/auth-context'
import { AccessibilityProvider } from '@/contexts/accessibility-context'

interface ProvidersProps {
  children: React.ReactNode
  clerkPublishableKey?: string
}

export function Providers({ children, clerkPublishableKey }: ProvidersProps) {
  // If we have a Clerk key, use ClerkProvider, otherwise just use the other providers
  if (clerkPublishableKey) {
    return (
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <AccessibilityProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </AccessibilityProvider>
      </ClerkProvider>
    )
  }

  // Without Clerk (fallback mode)
  return (
    <AccessibilityProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </AccessibilityProvider>
  )
}
