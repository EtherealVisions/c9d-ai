import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { AdminLayout } from '@/components/admin/admin-layout'
import { AdminOverviewDashboard } from '@/components/admin/admin-overview-dashboard'
import { rbacService } from '@/lib/services/rbac-service'

export default async function AdminPage() {
  const { userId, orgId } = auth()
  
  if (!userId || !orgId) {
    redirect('/sign-in')
  }

  // Check if user has admin permissions
  const hasPermission = await rbacService.hasPermission(
    userId,
    orgId,
    'admin.access'
  )

  if (!hasPermission) {
    redirect('/dashboard')
  }

  return (
    <AdminLayout
      title="Admin Dashboard"
      description="System overview and administrative controls"
    >
      <AdminOverviewDashboard />
    </AdminLayout>
  )
}