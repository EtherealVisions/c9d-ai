import React, { Suspense } from 'react'
import { Metadata } from 'next'
import { AuthLayout } from '@/components/auth/auth-layout'
import { PasswordResetForm } from '@/components/auth/password-reset-form'

export const metadata: Metadata = {
  title: 'Reset Password | C9d.ai',
  description: 'Reset your password to regain access to your C9d.ai account',
}

interface ResetPasswordPageProps {
  searchParams: {
    email?: string
    token?: string
    error?: string
  }
}

export default function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Enter your email address and we'll send you a link to reset your password"
    >
      <Suspense fallback={<div>Loading...</div>}>
        <PasswordResetForm 
          email={searchParams.email}
          token={searchParams.token}
          error={searchParams.error}
        />
      </Suspense>
    </AuthLayout>
  )
}