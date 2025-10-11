import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, AlertCircle } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center space-y-6 text-center">
        {/* Error Icon */}
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-muted">
          <AlertCircle className="w-10 h-10 text-muted-foreground" />
        </div>

        {/* Error Message */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">404</h1>
          <h2 className="text-2xl font-semibold">Page not found</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Sorry, we couldn't find the page you're looking for. Please check the URL or navigate back to the homepage.
          </p>
        </div>

        {/* Action Button */}
        <Button asChild>
          <Link href="/" className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
        </Button>
      </div>
    </div>
  )
}