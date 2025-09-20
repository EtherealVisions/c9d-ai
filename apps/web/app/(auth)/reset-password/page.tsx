import React, { Suspense } from 'react'
import { Metadata } from 'next'
import { AuthLayout } from '@/components/auth/auth-layout'
import { PasswordResetForm } from '@/components/auth/password-reset-form'

export const metadata: Metadata = {
  title: 'Reset Password | C9d.ai',
  description: 'Reset your password to regain access to your C9d.ai account',
}

interface ResetPasswordPageProps {
  searchParams: Promise<{
    email?: string
    token?: string
    error?: string
  }>
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams
  
  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Enter your email address and we'll send you a link to reset your password"
    >
      <Suspense fallback={<div>Loading...</div>}>
        <PasswordResetForm 
          email={params.email}
          token={params.token}
          error={params.error}
        />
      </Suspense>
    </AuthLayout>
  )
}