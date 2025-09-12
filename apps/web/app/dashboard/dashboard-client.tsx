'use client'

import { useAuth } from '@/lib/contexts/auth-context'
import { UserButton } from '@clerk/nextjs'
import { OrganizationDashboard } from '@/components/organization-dashboard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Users, Settings } from 'lucide-react'

export default function DashboardClient() {
  const { user, isLoading, organizations, currentOrganization } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Please sign in to access the dashboard.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <Building2 className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">C9d Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" asChild>
                <a href="/dashboard/account">
                  <Settings className="w-4 h-4 mr-2" />
                  Account Settings
                </a>
              </Button>
              <UserButton />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {currentOrganization ? (
          <OrganizationDashboard />
        ) : (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                Welcome, {user.first_name || user.email}!
              </h2>
              <p className="mt-2 text-muted-foreground">
                Get started by selecting an organization or create a new one.
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Organizations</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{organizations.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Total organizations
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Memberships</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{organizations.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Active memberships
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Account Status</CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Active</div>
                  <p className="text-xs text-muted-foreground">
                    Account is active
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Organizations List */}
            <Card>
              <CardHeader>
                <CardTitle>Your Organizations</CardTitle>
                <CardDescription>
                  Organizations you're a member of. Select one to view its dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {organizations.length > 0 ? (
                  <div className="space-y-4">
                    {organizations.map((org) => (
                      <div
                        key={org.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          {org.avatar_url ? (
                            <img
                              src={org.avatar_url}
                              alt={org.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-primary" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-semibold">{org.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {org.description || `Organization slug: ${org.slug}`}
                            </p>
                          </div>
                        </div>
                        <Button variant="outline">
                          View Dashboard
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No organizations found</h3>
                    <p className="text-muted-foreground mb-4">
                      You're not a member of any organizations yet.
                    </p>
                    <Button>
                      Create Organization
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}