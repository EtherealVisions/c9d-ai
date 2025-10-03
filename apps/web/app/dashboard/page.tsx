import DashboardClient from './dashboard-client'

// Disable static generation for this page since it requires authentication
export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  return <DashboardClient />
}