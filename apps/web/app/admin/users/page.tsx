import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { AdminLayout } from '@/components/admin/admin-layout'
import { UserManagementDashboard } from '@/components/admin/user-management-dashboard'
import { rbacService } from '@/lib/services/rbac-service'

export default async function AdminUsersPage() {
  const { userId, orgId } = await auth()
  
  if (!userId || !orgId) {
    redirect('/sign-in')
  }

  // Check if user has admin permissions
  const hasPermission = await rbacService.hasPermission(
    userId,
    orgId,
    'user.read'
  )

  if (!hasPermission) {
    redirect('/dashboard')
  }

  return (
    <AdminLayout
      title="User Management"
      description="Search, view, and manage user accounts and permissions"
    >
      <UserManagementDashboard />
    </AdminLayout>
  )
}