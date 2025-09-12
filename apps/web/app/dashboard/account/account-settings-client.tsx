'use client'

import React from 'react'
import { useAuth } from '@/lib/contexts/auth-context'
import { UserProfile } from '@/components/user-profile'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AccountSettingsClient() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin" />
          <p className="mt-2 text-lg">Loading account settings...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">Please sign in to access your account settings.</p>
          <Button 
            onClick={() => router.push('/sign-in')} 
            className="mt-4"
          >
            Sign In
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
            <p className="mt-2 text-gray-600">
              Manage your account information, preferences, and security settings.
            </p>
          </div>
        </div>

        {/* User Profile Component */}
        <UserProfile className="bg-white rounded-lg shadow-sm border p-6" />
      </div>
    </div>
  )
}