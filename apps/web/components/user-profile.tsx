/**
 * User profile component
 */

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface UserProfileProps {
  user?: {
    id: string
    firstName?: string | null
    lastName?: string | null
    email: string
    avatarUrl?: string | null
  }
}

export function UserProfile({ user }: UserProfileProps) {
  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">No user data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4">
          {user.avatarUrl && (
            <img
              src={user.avatarUrl}
              alt="Profile"
              className="h-16 w-16 rounded-full"
            />
          )}
          <div>
            <h3 className="text-lg font-semibold">
              {user.firstName || user.lastName 
                ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                : 'User'
              }
            </h3>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}