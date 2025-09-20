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
  searchParams: Promise<{
    redirect_url?: string
    email?: string
    error?: string
  }>
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams
  
  return (
    <AuthLayout
      title="Check your email"
      subtitle="We've sent a verification code to your email address"
    >
      <EmailVerificationForm 
        redirectUrl={params.redirect_url}
        email={params.email}
        error={params.error}
      />
    </AuthLayout>
  )
}