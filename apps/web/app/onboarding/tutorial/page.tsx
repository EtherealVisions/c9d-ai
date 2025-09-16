'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { InteractiveTutorial } from '@/components/onboarding/interactive-tutorial'
import { Card, CardContent } from '@/components/ui/card'

function TutorialPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tutorialId = searchParams.get('id') || 'auth-basics'
  const userId = 'demo-user' // In a real app, this would come from auth

  const handleComplete = (tutorialId: string, completionData: any) => {
    console.log('Tutorial completed:', { tutorialId, completionData })
    // In a real app, you might track this completion
  }

  const handleExit = () => {
    router.push('/dashboard')
  }

  return (
    <div className="container mx-auto py-8">
      <InteractiveTutorial
        tutorialId={tutorialId}
        userId={userId}
        onComplete={handleComplete}
        onExit={handleExit}
      />
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading tutorial...</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function TutorialPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TutorialPageContent />
    </Suspense>
  )
}