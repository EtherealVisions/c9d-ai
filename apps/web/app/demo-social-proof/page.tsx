import TestimonialSection from '@/components/testimonial-section'
import StatsSection from '@/components/stats-section'
import CustomerSuccessStories from '@/components/customer-success-stories'
import SocialProofSection from '@/components/social-proof-section'

export default function DemoSocialProofPage() {
  return (
    <div className="min-h-screen">
      <TestimonialSection />
      <StatsSection />
      <CustomerSuccessStories />
      <SocialProofSection />
    </div>
  )
}