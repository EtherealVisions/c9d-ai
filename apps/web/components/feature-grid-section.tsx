"use client"

import React, { useState } from "react"
import { ZapIcon, FileTextIcon, SearchIcon, Share2Icon, ShieldCheckIcon, BrainCircuit } from "lucide-react"
import { useIntersectionObserver } from "@/hooks/use-intersection-observer"
import { useMobileOptimized } from "@/hooks/use-mobile-optimized"
import { PerformanceAnimation, StaggeredAnimation } from "@/components/ui/performance-animations"
import EnhancedFeatureCard, { type FeatureCardData } from "./enhanced-feature-card"
import FeatureDetailModal from "./feature-detail-modal"
import { cn } from "@/lib/utils"

const features: FeatureCardData[] = [
  {
    id: "relationship-mapping",
    icon: <Share2Icon className="h-10 w-10" />,
    title: "Relationship Mapping",
    description: "Visualize complex connections and dependencies within your data instantly.",
    benefits: [
      "Interactive network visualization",
      "Real-time relationship discovery",
      "Automated dependency tracking",
      "Multi-dimensional data mapping"
    ],
    technicalSpecs: [
      "Graph database integration with Neo4j and Amazon Neptune",
      "Real-time processing of up to 10M relationships per second",
      "Advanced graph algorithms including PageRank and community detection",
      "RESTful API with GraphQL support for flexible querying"
    ],
    useCases: [
      "Financial fraud detection through transaction relationship analysis",
      "Supply chain optimization by mapping vendor dependencies",
      "Social network analysis for marketing campaign targeting",
      "IT infrastructure monitoring and dependency management"
    ],
    bgColor: "bg-windsurf-purple-vibrant",
    textColor: "text-white",
    borderColor: "border-windsurf-purple-deep",
    glowColor: "rgba(231, 29, 115, 0.2)",
    gradientFrom: "#7B2CBF",
    gradientTo: "#E71D73"
  },
  {
    id: "predictive-analysis",
    icon: <ZapIcon className="h-10 w-10" />,
    title: "Predictive Analysis",
    description: "Leverage AI to forecast trends and anticipate future outcomes based on historical data.",
    benefits: [
      "Advanced machine learning models",
      "Time series forecasting",
      "Anomaly prediction",
      "Confidence interval analysis"
    ],
    technicalSpecs: [
      "Support for LSTM, ARIMA, and Prophet forecasting models",
      "Automated feature engineering and model selection",
      "Real-time model retraining with concept drift detection",
      "Scalable inference with sub-100ms response times"
    ],
    useCases: [
      "Sales forecasting for inventory management and planning",
      "Predictive maintenance for industrial equipment",
      "Market trend analysis for investment decision making",
      "Customer churn prediction and retention strategies"
    ],
    bgColor: "bg-windsurf-pink-hot",
    textColor: "text-white",
    borderColor: "border-pink-700",
    glowColor: "rgba(255, 255, 255, 0.25)",
    gradientFrom: "#E71D73",
    gradientTo: "#FF6B9D"
  },
  {
    id: "automated-summaries",
    icon: <FileTextIcon className="h-10 w-10" />,
    title: "Automated Summaries",
    description: "Generate concise, AI-powered summaries of large volumes of information.",
    benefits: [
      "Multi-document summarization",
      "Key insight extraction",
      "Customizable summary length",
      "Multi-language support"
    ],
    technicalSpecs: [
      "Transformer-based models including BERT and T5 architectures",
      "Support for documents up to 100,000 words",
      "Extractive and abstractive summarization techniques",
      "Custom fine-tuning for domain-specific terminology"
    ],
    useCases: [
      "Legal document review and case summary generation",
      "Research paper analysis for academic institutions",
      "News aggregation and content curation platforms",
      "Corporate report summarization for executive briefings"
    ],
    bgColor: "bg-windsurf-blue-electric",
    textColor: "text-white",
    borderColor: "border-blue-700",
    glowColor: "rgba(175, 255, 60, 0.2)",
    gradientFrom: "#00B2FF",
    gradientTo: "#2CE4B8"
  },
  {
    id: "anomaly-detection",
    icon: <SearchIcon className="h-10 w-10" />,
    title: "Anomaly Detection",
    description: "Automatically identify unusual patterns and outliers that may indicate critical events.",
    benefits: [
      "Real-time anomaly alerts",
      "Statistical and ML-based detection",
      "Customizable sensitivity levels",
      "Historical pattern analysis"
    ],
    technicalSpecs: [
      "Isolation Forest and One-Class SVM algorithms",
      "Streaming data processing with Apache Kafka integration",
      "Configurable detection thresholds and alert mechanisms",
      "Support for multivariate time series anomaly detection"
    ],
    useCases: [
      "Cybersecurity threat detection and incident response",
      "Quality control in manufacturing processes",
      "Financial fraud detection and risk management",
      "IoT sensor monitoring for predictive maintenance"
    ],
    bgColor: "bg-windsurf-yellow-bright",
    textColor: "text-windsurf-purple-deep",
    borderColor: "border-yellow-600",
    glowColor: "rgba(44, 228, 184, 0.3)",
    gradientFrom: "#FFD700",
    gradientTo: "#AFFF3C"
  },
  {
    id: "cross-source-integration",
    icon: <BrainCircuit className="h-10 w-10" />,
    title: "Cross-Source Integration",
    description: "Seamlessly connect and analyze data from disparate sources in one unified platform.",
    benefits: [
      "Universal data connectors",
      "Real-time data synchronization",
      "Schema mapping automation",
      "Data quality validation"
    ],
    technicalSpecs: [
      "200+ pre-built connectors for popular data sources",
      "ETL/ELT pipeline orchestration with Apache Airflow",
      "Real-time streaming with change data capture (CDC)",
      "Data lineage tracking and impact analysis"
    ],
    useCases: [
      "Customer 360 views by integrating CRM, marketing, and support data",
      "Financial reporting consolidation across multiple systems",
      "Healthcare data integration for patient record management",
      "E-commerce analytics combining web, mobile, and in-store data"
    ],
    bgColor: "bg-windsurf-green-lime",
    textColor: "text-windsurf-purple-deep",
    borderColor: "border-lime-600",
    glowColor: "rgba(123, 44, 191, 0.25)",
    gradientFrom: "#AFFF3C",
    gradientTo: "#2CE4B8"
  },
  {
    id: "secure-data-handling",
    icon: <ShieldCheckIcon className="h-10 w-10" />,
    title: "Secure Data Handling",
    description: "Enterprise-grade security and privacy protocols to protect your sensitive information.",
    benefits: [
      "End-to-end encryption",
      "SOC 2 Type II compliance",
      "GDPR and CCPA compliance",
      "Role-based access control"
    ],
    technicalSpecs: [
      "AES-256 encryption at rest and TLS 1.3 in transit",
      "Zero-trust architecture with multi-factor authentication",
      "Data residency controls with regional deployment options",
      "Comprehensive audit logging and compliance reporting"
    ],
    useCases: [
      "Healthcare data processing with HIPAA compliance",
      "Financial services with PCI DSS requirements",
      "Government and defense contractor data handling",
      "Enterprise data governance and privacy management"
    ],
    bgColor: "bg-c9n-teal",
    textColor: "text-c9n-blue-dark",
    borderColor: "border-teal-700",
    glowColor: "rgba(255, 215, 0, 0.25)",
    gradientFrom: "#2CE4B8",
    gradientTo: "#00B2FF"
  },
]

export default function FeatureGridSection() {
  const [selectedFeature, setSelectedFeature] = useState<FeatureCardData | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { elementRef, shouldAnimate } = useIntersectionObserver({
    threshold: 0.1,
    triggerOnce: true
  })
  const { 
    isMobile, 
    isTablet, 
    reducedMotion, 
    performanceMode 
  } = useMobileOptimized()

  const handleOpenModal = (feature: FeatureCardData) => {
    setSelectedFeature(feature)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedFeature(null)
  }

  return (
    <>
      <section 
        ref={elementRef} 
        className={cn(
          "bg-c9n-blue-dark",
          // Mobile-first responsive padding
          "py-12 sm:py-16 md:py-24"
        )}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className={cn(
            "text-center",
            // Mobile-first responsive spacing
            "mb-8 sm:mb-12 md:mb-16"
          )}>
            <PerformanceAnimation
              animation="slideUp"
              trigger="scroll"
              threshold={0.2}
              config={{ duration: 700 }}
            >
              <h2 className={cn(
                "font-bold tracking-tight text-white",
                // Mobile-first responsive text sizing
                "text-2xl sm:text-3xl md:text-4xl",
                // Optimize line height for mobile
                isMobile && "leading-tight"
              )}>
                One Platform.{" "}
                <span className="bg-clip-text text-transparent bg-purple-pink-gradient">
                  Unlimited Analytical Superpowers.
                </span>
              </h2>
            </PerformanceAnimation>
            
            <PerformanceAnimation
              animation="slideUp"
              trigger="scroll"
              threshold={0.2}
              config={{ duration: 700, delay: 200 }}
            >
              <p className={cn(
                "mt-4 text-windsurf-gray-light mx-auto",
                // Mobile-first responsive text sizing and max-width
                "text-base sm:text-lg",
                "max-w-sm sm:max-w-lg md:max-w-2xl",
                // Optimize line height for mobile
                isMobile && "leading-relaxed"
              )}>
                C9d.ai equips you with a comprehensive suite of AI-driven tools to tackle your most complex analytical
                challenges.
              </p>
            </PerformanceAnimation>
          </div>
          
          <StaggeredAnimation
            animation="slideUp"
            staggerDelay={performanceMode === 'low' ? 50 : 100}
            trigger="scroll"
            threshold={0.1}
            className={cn(
              "grid gap-6 md:gap-8",
              // Mobile-first responsive grid
              "grid-cols-1",
              "sm:grid-cols-2", 
              "lg:grid-cols-3",
              // Optimize grid for mobile landscape
              isMobile && "gap-4"
            )}
          >
            {features.map((feature, index) => (
              <EnhancedFeatureCard
                key={feature.id}
                feature={feature}
                index={index}
                onOpenModal={handleOpenModal}
                shouldAnimate={shouldAnimate}
              />
            ))}
          </StaggeredAnimation>
        </div>
      </section>

      <FeatureDetailModal
        feature={selectedFeature}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  )
}
