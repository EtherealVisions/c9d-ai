import React from 'react'
import { Metadata } from 'next'
import { AuthLayout, SignUpForm } from '@/components/auth'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create your C9d.ai account and start building with AI-powered development tools.',
}

interface SignUpPageProps {
  searchParams: {
    redirect_url?: string
    invitation_token?: string
    error?: string
  }
}

export default function SignUpPage({ searchParams }: SignUpPageProps) {
  return (
    <AuthLayout
      title="Join C9d.ai"
      subtitle="Create your account and start building the future with AI"
    >
      <SignUpForm 
        redirectUrl={searchParams.redirect_url}
        invitationToken={searchParams.invitation_token}
      />
    </AuthLayout>
  )
}