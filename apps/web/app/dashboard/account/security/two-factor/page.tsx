import React from 'react'
import { Metadata } from 'next'
import { TwoFactorSetup } from '@/components/auth/two-factor-setup'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Two-Factor Authentication Setup | C9d.ai',
  description: 'Set up two-factor authentication to secure your account',
}

// Disable static generation for this page since it requires authentication
export const dynamic = 'force-dynamic'

export default function TwoFactorSetupPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/account">
              <Button variant="ghost" size="sm" className="flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Account Settings
              </Button>
            </Link>
          </div>
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-900">
              Two-Factor Authentication Setup
            </h1>
            <p className="mt-2 text-gray-600">
              Add an extra layer of security to your account by enabling two-factor authentication.
            </p>
          </div>
        </div>

        {/* Setup Component */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <TwoFactorSetup 
            onComplete={() => {
              // Redirect back to account settings after completion
              window.location.href = '/dashboard/account'
            }}
          />
        </div>
      </div>
    </div>
  )
}