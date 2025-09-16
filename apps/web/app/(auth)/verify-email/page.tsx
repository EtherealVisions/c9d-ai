import React from 'react'
import { Metadata } from 'next'
import { AuthLayout } from '@/components/auth'
import { EmailVerificationForm } from '@/components/auth/email-verification-form'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Verify Email',
  description: 'Verify your email address to complete your C9d.ai account setup.',
}

interface VerifyEmailPageProps {
  searchParams: {
    redirect_url?: string
    email?: string
    error?: string
  }
}

export default function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  return (
    <AuthLayout
      title="Check your email"
      subtitle="We've sent a verification code to your email address"
    >
      <EmailVerificationForm 
        redirectUrl={searchParams.redirect_url}
        email={searchParams.email}
        error={searchParams.error}
      />
    </AuthLayout>
  )
}