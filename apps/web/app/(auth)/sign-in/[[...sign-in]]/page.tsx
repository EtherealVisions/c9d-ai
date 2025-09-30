import React from 'react'
import { Metadata } from 'next'
import { AuthLayout, SignInForm } from '@/components/auth'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your C9d.ai account to access AI-powered development tools.',
}

interface SignInPageProps {
  searchParams: Promise<{
    redirect_url?: string
    error?: string
  }>
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams
  
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account to continue building with AI"
    >
      <SignInForm 
        redirectUrl={params.redirect_url}
        error={params.error}
      />
    </AuthLayout>
  )
}