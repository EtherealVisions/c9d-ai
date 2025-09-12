import { Metadata } from 'next'
import AccountSettingsClient from './account-settings-client'

export const metadata: Metadata = {
  title: 'Account Settings',
  description: 'Manage your account settings and preferences',
}

// Disable static generation for this page since it requires authentication
export const dynamic = 'force-dynamic'

export default function AccountSettingsPage() {
  return <AccountSettingsClient />
}