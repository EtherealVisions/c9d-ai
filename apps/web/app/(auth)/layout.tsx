import React from 'react'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | C9d.ai Authentication',
    default: 'Authentication | C9d.ai'
  },
  description: 'Sign in or create your C9d.ai account to access AI-powered development tools.',
  robots: {
    index: false, // Don't index auth pages
    follow: false
  }
}

interface AuthLayoutProps {
  children: React.ReactNode
}

/**
 * Layout for authentication pages
 * Provides consistent metadata and structure for auth routes
 */
export default function AuthGroupLayout({ children }: AuthLayoutProps) {
  return (
    <>
      {children}
    </>
  )
}