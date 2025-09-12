'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useToast } from '@/hooks/use-toast'
import { useOrganization } from '@/lib/contexts/organization-context'
import { Save, Upload, Trash2 } from 'lucide-react'
import type { Organization } from '@/lib/models/types'

const organizationSettingsSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  avatarUrl: z.string().url('Must be a valid URL').optional().or(z.literal(''))
})

type OrganizationSettingsForm = z.infer<typeof organizationSettingsSchema>

interface OrganizationSettingsProps {
  organization: Organization
}

export function OrganizationSettings({ organization }: OrganizationSettingsProps) {
  const { refreshOrganizationData } = useOrganization()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const form = useForm<OrganizationSettingsForm>({
    resolver: zodResolver(organizationSettingsSchema),
    defaultValues: {
      name: organization.name,
      description: organization.description || '',
      avatarUrl: organization.avatarUrl || ''
    }
  })

  const onSubmit = async (data: OrganizationSettingsForm) => {
    try {
      setIsLoading(true)

      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description || undefined,
          avatarUrl: data.avatarUrl || undefined
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update organization')
      }

      const result = await response.json()
      
      // Refresh organization data in context
      await refreshOrganizationData()

      toast({
        title: 'Organization updated',
        description: 'Your organization settings have been saved successfully.'
      })
    } catch (error) {
      console.error('Failed to update organization:', error)
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Failed to update organization settings',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteOrganization = async () => {
    if (!confirm('Are you sure you want to delete this organization? This action cannot be undone.')) {
      return
    }

    try {
      setIsDeleting(true)

      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete organization')
      }

      toast({
        title: 'Organization deleted',
        description: 'The organization has been deleted successfully.'
      })

      // Redirect or refresh the page
      window.location.href = '/dashboard'
    } catch (error) {
      console.error('Failed to delete organization:', error)
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to delete organization',
        variant: 'destructive'
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Basic Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Update your organization's basic information and branding.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter organization name" {...field} />
                    </FormControl>
                    <FormDescription>
                      This is your organization's display name.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter organization description"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      A brief description of your organization (optional).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Avatar URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/avatar.jpg" {...field} />
                    </FormControl>
                    <FormDescription>
                      URL to your organization's logo or avatar image (optional).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Organization Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>
            Read-only information about your organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Organization ID</Label>
              <p className="text-sm font-mono bg-muted p-2 rounded">{organization.id}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Slug</Label>
              <p className="text-sm font-mono bg-muted p-2 rounded">{organization.slug}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Created</Label>
              <p className="text-sm bg-muted p-2 rounded">
                {new Date(organization.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
              <p className="text-sm bg-muted p-2 rounded">
                {new Date(organization.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible and destructive actions for this organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border border-destructive rounded-lg">
            <div>
              <h4 className="font-medium">Delete Organization</h4>
              <p className="text-sm text-muted-foreground">
                Permanently delete this organization and all associated data. This action cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleDeleteOrganization}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Organization
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}