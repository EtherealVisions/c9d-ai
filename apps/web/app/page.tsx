import AnnouncementBar from "@/components/announcement-bar"
import HeaderNav from "@/components/header-nav"
import HeroSection from "@/components/hero-section"
import FeatureHighlightSection from "@/components/feature-highlight-section"
import FeatureGridSection from "@/components/feature-grid-section"
import SolutionsSection from "@/components/solutions-section"
import TestimonialSection from "@/components/testimonial-section"
import StatsSection from "@/components/stats-section"
import SocialProofSection from "@/components/social-proof-section"
import BlogPreviewSection from "@/components/blog-preview-section"
import FinalCtaSection from "@/components/final-cta-section"
import MainFooter from "@/components/main-footer"

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-c9n-blue-dark text-gray-200">
      <AnnouncementBar />
      <HeaderNav />
      <main className="flex-grow">
        <HeroSection />

        <FeatureHighlightSection
          title="Explore the C9D.AI Insight Engine"
          description="The Insight Engine combines deep data understanding, a breadth of advanced analytical tools, and real-time awareness of your queries into a powerful, seamless, and collaborative flow. It is the most powerful way to analyze with AI."
          subFeatureTitle="An AI agent that analyzes, connects, and thinks 10 steps ahead"
          subFeatureDescription="Built to keep you in flow by understanding your intent and handling complex datasets so you can focus on discovery."
          ctaText="EXPLORE INSIGHT ENGINE FEATURES"
          ctaLink="/features/insight-engine"
          imageUrl="/abstract-ai-data-visualization.png"
          imageAlt="C9D.AI Insight Engine visualization"
          reverseLayout={false}
        />

        <FeatureHighlightSection
          title="Rapid Correlation. Instant Reports."
          description="A single query, limitless insights, complete clarity. The full power of C9D.AI's rapid analysis is exclusive to our platform, delivering actionable intelligence in seconds."
          subFeatureTitle="Query to uncover connections. Query to generate reports. Query to victory."
          subFeatureDescription="Tab through insights. Tab to export findings. Tab to glory."
          ctaText="DISCOVER RAPID REPORTING"
          ctaLink="/features/rapid-reporting"
          imageUrl="/fast-data-report.png"
          imageAlt="Rapid data correlation and reporting"
          reverseLayout={true}
        />

        <FeatureGridSection />
        <SolutionsSection />
        <TestimonialSection />
        <StatsSection />
        <SocialProofSection />
        <BlogPreviewSection />
        <FinalCtaSection />
      </main>
      <MainFooter />
    </div>
  )
}
