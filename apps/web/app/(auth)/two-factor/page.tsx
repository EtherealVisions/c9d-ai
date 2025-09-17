import React, { Suspense } from 'react'
import { Metadata } from 'next'
import { AuthLayout } from '@/components/auth/auth-layout'
import { TwoFactorForm } from '@/components/auth/two-factor-form'

export const metadata: Metadata = {
  title: 'Two-Factor Authentication | C9d.ai',
  description: 'Complete your sign-in with two-factor authentication',
}

interface TwoFactorPageProps {
  searchParams: {
    strategy?: string
    error?: string
  }
}

export default function TwoFactorPage({ searchParams }: TwoFactorPageProps) {
  return (
    <AuthLayout
      title="Two-Factor Authentication"
      subtitle="Enter your verification code to complete sign-in"
    >
      <Suspense fallback={<div>Loading...</div>}>
        <TwoFactorForm 
          strategy={searchParams.strategy}
          error={searchParams.error}
        />
      </Suspense>
    </AuthLayout>
  )
}