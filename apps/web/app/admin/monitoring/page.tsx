import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { AdminLayout } from '@/components/admin/admin-layout'
import { AuthenticationMonitoringDashboard } from '@/components/admin/authentication-monitoring-dashboard'
import { rbacService } from '@/lib/services/rbac-service'

export default async function AdminMonitoringPage() {
  const { userId, orgId } = auth()
  
  if (!userId || !orgId) {
    redirect('/sign-in')
  }

  // Check if user has admin permissions
  const hasPermission = await rbacService.hasPermission(
    userId,
    orgId,
    'analytics.read'
  )

  if (!hasPermission) {
    redirect('/dashboard')
  }

  return (
    <AdminLayout
      title="Authentication Monitoring"
      description="Monitor authentication events, security incidents, and user engagement"
    >
      <AuthenticationMonitoringDashboard />
    </AdminLayout>
  )
}