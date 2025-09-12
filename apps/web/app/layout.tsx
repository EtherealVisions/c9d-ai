import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ClerkProvider } from '@clerk/nextjs'
import { AuthProvider } from '@/lib/contexts/auth-context'
import { OrganizationProvider } from '@/lib/contexts/organization-context'
import { getAppConfigSync, initializeAppConfig } from '@/lib/config/init'
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "C9N.AI - Unlock Deeper Insights",
  description:
    "Leverage AI for relevant information, better analysis, and coordination of disparate, opaque relationships.",
    generator: 'v0.dev'
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Initialize configuration on server side
  try {
    await initializeAppConfig();
  } catch (error) {
    console.error('[Layout] Configuration initialization failed:', error);
    // Continue with fallback configuration
  }

  // Check if we have valid Clerk keys using configuration manager
  const clerkPublishableKey = getAppConfigSync('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY') || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const hasValidClerkKeys = clerkPublishableKey?.startsWith('pk_')

  if (!hasValidClerkKeys) {
    // During build time or when Clerk is not configured, render without ClerkProvider
    return (
      <html lang="en" className="dark" style={{ colorScheme: "dark" }}>
        <body className={`${inter.className} bg-c9n-blue-dark text-gray-200 antialiased`}>
          {children}
        </body>
      </html>
    )
  }

  return (
    <ClerkProvider>
      <html lang="en" className="dark" style={{ colorScheme: "dark" }}>
        <body className={`${inter.className} bg-c9n-blue-dark text-gray-200 antialiased`}>
          <AuthProvider>
            <OrganizationProvider>
              {children}
            </OrganizationProvider>
          </AuthProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
