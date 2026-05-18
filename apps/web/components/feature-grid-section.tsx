import React from "react"
import { ZapIcon, FileTextIcon, SearchIcon, Share2Icon, ShieldCheckIcon, BrainCircuit } from "lucide-react"
import InteractiveCard from "./interactive-card" // Import the new component

const features = [
  {
    icon: <Share2Icon className="h-8 w-8" />,
    title: "Relationship Mapping",
    description: "Visualize complex connections and dependencies within your data instantly.",
  },
  {
    icon: <ZapIcon className="h-8 w-8" />,
    title: "Predictive Analysis",
    description: "Leverage AI to forecast trends and anticipate future outcomes based on historical data.",
  },
  {
    icon: <FileTextIcon className="h-8 w-8" />,
    title: "Automated Summaries",
    description: "Generate concise, AI-powered summaries of large volumes of information.",
  },
  {
    icon: <SearchIcon className="h-8 w-8" />,
    title: "Anomaly Detection",
    description: "Automatically identify unusual patterns and outliers that may indicate critical events.",
  },
  {
    icon: <BrainCircuit className="h-8 w-8" />,
    title: "Cross-Source Integration",
    description: "Seamlessly connect and analyze data from disparate sources in one unified platform.",
  },
  {
    icon: <ShieldCheckIcon className="h-8 w-8" />,
    title: "Secure Data Handling",
    description: "Enterprise-grade security and privacy protocols to protect your sensitive information.",
  },
]

export default function FeatureGridSection() {
  return (
    <section className="py-16 md:py-24 bg-dify-bg-primary">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            One Platform.{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-dify-accent-primary to-dify-accent-secondary">
              Unlimited Analytical Superpowers.
            </span>
          </h2>
          <p className="mt-4 text-lg text-dify-text-secondary max-w-2xl mx-auto">
            C9D.AI equips you with a comprehensive suite of AI-driven tools to tackle your most complex analytical
            challenges.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature) => (
            <InteractiveCard
              key={feature.title}
              className="p-6 rounded-xl bg-dify-bg-card border border-dify-border hover:border-dify-accent-primary/50 transition-all duration-300 flex flex-col items-start group hover:-translate-y-1 hover:shadow-2xl"
              glowColor="rgba(99, 102, 241, 0.1)"
            >
              <div className="mb-4 p-3 rounded-lg bg-gradient-to-br from-dify-accent-primary/20 to-dify-accent-secondary/20 text-white">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">{feature.title}</h3>
              <p className="text-sm text-dify-text-secondary leading-relaxed">{feature.description}</p>
            </InteractiveCard>
          ))}
        </div>
      </div>
    </section>
  )
}
