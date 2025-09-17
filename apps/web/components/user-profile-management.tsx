'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Loader2, Save, User, Settings, BarChart3, Shield } from 'lucide-react'

interface UserProfile {
  id: string
  clerkUserId: string
  email: string
  firstName?: string
  lastName?: string
  avatarUrl?: string
  preferences: Record<string, any>
  createdAt: string
  updatedAt: string
}

interface UserAnalytics {
  signInCount: number
  lastSignInAt: string | null
  accountAge: number
  sessionCount: number
  securityEvents: number
  organizationMemberships: number
}

interface ProfileFormData {
  firstName: string
  lastName: string
  avatarUrl: string
  preferences: {
    theme: 'light' | 'dark' | 'system'
    language: string
    timezone: string
    notifications: {
      email: boolean
      push: boolean
      marketing: boolean
    }
    dashboard: {
      defaultView: string
      itemsPerPage: number
    }
  }
  customFields: {
    department: string
    jobTitle: string
    phoneNumber: string
    dateOfBirth: string
    emergencyContact: {
      name: string
      phone: string
    }
  }
}

/**
 * Enhanced User Profile Management Component
 * Demonstrates Requirements 6.3, 8.1, and 8.2 implementation
 */
export function UserProfileManagement() {
  const { userId } = useAuth()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')

  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    avatarUrl: '',
    preferences: {
      theme: 'system',
      language: 'en',
      timezone: 'UTC',
      notifications: {
        email: true,
        push: true,
        marketing: false
      },
      dashboard: {
        defaultView: 'overview',
        itemsPerPage: 10
      }
    },
    customFields: {
      department: '',
      jobTitle: '',
      phoneNumber: '',
      dateOfBirth: '',
      emergencyContact: {
        name: '',
        phone: ''
      }
    }
  })

  // Load user profile and analytics
  useEffect(() => {
    if (!userId) return

    const loadUserData = async () => {
      try {
        setLoading(true)
        
        // Load profile with analytics
        const response = await fetch('/api/users/profile?analytics=true')
        if (!response.ok) {
          throw new Error('Failed to load user data')
        }

        const data = await response.json()
        setUser(data.user)
        setAnalytics(data.analytics)

        // Populate form with current data
        setFormData({
          firstName: data.user.firstName || '',
          lastName: data.user.lastName || '',
          avatarUrl: data.user.avatarUrl || '',
          preferences: {
            theme: data.user.preferences?.theme || 'system',
            language: data.user.preferences?.language || 'en',
            timezone: data.user.preferences?.timezone || 'UTC',
            notifications: {
              email: data.user.preferences?.notifications?.email ?? true,
              push: data.user.preferences?.notifications?.push ?? true,
              marketing: data.user.preferences?.notifications?.marketing ?? false
            },
            dashboard: {
              defaultView: data.user.preferences?.dashboard?.defaultView || 'overview',
              itemsPerPage: data.user.preferences?.dashboard?.itemsPerPage || 10
            }
          },
          customFields: {
            department: data.user.preferences?.customFields?.department || '',
            jobTitle: data.user.preferences?.customFields?.jobTitle || '',
            phoneNumber: data.user.preferences?.customFields?.phoneNumber || '',
            dateOfBirth: data.user.preferences?.customFields?.dateOfBirth || '',
            emergencyContact: {
              name: data.user.preferences?.customFields?.emergencyContact?.name || '',
              phone: data.user.preferences?.customFields?.emergencyContact?.phone || ''
            }
          }
        })
      } catch (error) {
        console.error('Error loading user data:', error)
        toast.error('Failed to load user data')
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [userId])

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!userId) return

    try {
      setSaving(true)

      const profileData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        avatarUrl: formData.avatarUrl,
        preferences: formData.preferences,
        customFields: formData.customFields
      }

      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update profile')
      }

      const data = await response.json()
      setUser(data.user)
      
      toast.success('Profile updated successfully', {
        description: `${data.syncMetadata?.changes?.length || 0} fields updated`
      })
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  // Save preferences only
  const handleSavePreferences = async () => {
    if (!userId) return

    try {
      setSaving(true)

      const response = await fetch('/api/users/profile/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData.preferences,
          customFields: formData.customFields
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update preferences')
      }

      const data = await response.json()
      setUser(data.user)
      
      toast.success('Preferences updated successfully')
    } catch (error) {
      console.error('Error saving preferences:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update preferences')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading profile...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Failed to load user profile</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Profile Management</h1>
        <p className="text-muted-foreground">
          Manage your profile, preferences, and custom fields
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Custom Fields
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Update your basic profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      firstName: e.target.value
                    }))}
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      lastName: e.target.value
                    }))}
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  value={user.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-sm text-muted-foreground">
                  Email address is managed by your authentication provider
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatarUrl">Avatar URL</Label>
                <Input
                  id="avatarUrl"
                  value={formData.avatarUrl}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    avatarUrl: e.target.value
                  }))}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

              <Button 
                onClick={handleSaveProfile} 
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Profile
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Application Preferences</CardTitle>
              <CardDescription>
                Customize your application experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select
                    value={formData.preferences.theme}
                    onValueChange={(value: 'light' | 'dark' | 'system') => 
                      setFormData(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, theme: value }
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={formData.preferences.language}
                    onValueChange={(value) => 
                      setFormData(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, language: value }
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={formData.preferences.timezone}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, timezone: e.target.value }
                  }))}
                  placeholder="UTC"
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Notification Preferences</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    checked={formData.preferences.notifications.email}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({
                        ...prev,
                        preferences: {
                          ...prev.preferences,
                          notifications: { ...prev.preferences.notifications, email: checked }
                        }
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive push notifications in browser
                    </p>
                  </div>
                  <Switch
                    checked={formData.preferences.notifications.push}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({
                        ...prev,
                        preferences: {
                          ...prev.preferences,
                          notifications: { ...prev.preferences.notifications, push: checked }
                        }
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Marketing Communications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive marketing emails and updates
                    </p>
                  </div>
                  <Switch
                    checked={formData.preferences.notifications.marketing}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({
                        ...prev,
                        preferences: {
                          ...prev.preferences,
                          notifications: { ...prev.preferences.notifications, marketing: checked }
                        }
                      }))
                    }
                  />
                </div>
              </div>

              <Button 
                onClick={handleSavePreferences} 
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Preferences
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Custom Fields</CardTitle>
              <CardDescription>
                Additional information with validation (Requirement 6.3)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={formData.customFields.department}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      customFields: { ...prev.customFields, department: e.target.value }
                    }))}
                    placeholder="Engineering"
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input
                    id="jobTitle"
                    value={formData.customFields.jobTitle}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      customFields: { ...prev.customFields, jobTitle: e.target.value }
                    }))}
                    placeholder="Software Engineer"
                    maxLength={100}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    value={formData.customFields.phoneNumber}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      customFields: { ...prev.customFields, phoneNumber: e.target.value }
                    }))}
                    placeholder="+1-555-123-4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.customFields.dateOfBirth}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      customFields: { ...prev.customFields, dateOfBirth: e.target.value }
                    }))}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Emergency Contact</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyName">Name</Label>
                    <Input
                      id="emergencyName"
                      value={formData.customFields.emergencyContact.name}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        customFields: {
                          ...prev.customFields,
                          emergencyContact: { ...prev.customFields.emergencyContact, name: e.target.value }
                        }
                      }))}
                      placeholder="Emergency contact name"
                      maxLength={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emergencyPhone">Phone</Label>
                    <Input
                      id="emergencyPhone"
                      value={formData.customFields.emergencyContact.phone}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        customFields: {
                          ...prev.customFields,
                          emergencyContact: { ...prev.customFields.emergencyContact, phone: e.target.value }
                        }
                      }))}
                      placeholder="+1-555-987-6543"
                    />
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleSavePreferences} 
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Custom Fields
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {analytics && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Sign-ins</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.signInCount}</div>
                  <p className="text-xs text-muted-foreground">Total sign-ins</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Account Age</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.accountAge}</div>
                  <p className="text-xs text-muted-foreground">Days</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.sessionCount}</div>
                  <p className="text-xs text-muted-foreground">Total sessions</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Organizations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.organizationMemberships}</div>
                  <p className="text-xs text-muted-foreground">Memberships</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Security Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.securityEvents}</div>
                  <p className="text-xs text-muted-foreground">
                    {analytics.securityEvents === 0 ? 'No issues' : 'Events logged'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Last Sign-in</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-medium">
                    {analytics.lastSignInAt 
                      ? new Date(analytics.lastSignInAt).toLocaleDateString()
                      : 'Never'
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">Most recent</p>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Account Status</CardTitle>
              <CardDescription>Current account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Account Status</span>
                <Badge variant={user.preferences?.accountStatus === 'suspended' ? 'destructive' : 'default'}>
                  {user.preferences?.accountStatus || 'Active'}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Account Created</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Last Updated</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(user.updatedAt).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">User ID</span>
                <span className="text-sm text-muted-foreground font-mono">
                  {user.id}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}