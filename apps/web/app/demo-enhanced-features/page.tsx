import EnhancedFeatureShowcase from "@/components/enhanced-feature-showcase"

export default function DemoEnhancedFeaturesPage() {
  return (
    <div className="min-h-screen bg-c9n-blue-dark">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white text-center mb-8">
          Enhanced Feature Showcase Demo
        </h1>
        <EnhancedFeatureShowcase />
      </div>
    </div>
  )
}