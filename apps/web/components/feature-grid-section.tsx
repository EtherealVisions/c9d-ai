import { ZapIcon, FileTextIcon, SearchIcon, Share2Icon, ShieldCheckIcon, BrainCircuit } from "lucide-react"
import InteractiveCard from "./interactive-card" // Import the new component

const features = [
  {
    icon: <Share2Icon className="h-10 w-10" />,
    title: "Relationship Mapping",
    description: "Visualize complex connections and dependencies within your data instantly.",
    bgColor: "bg-windsurf-purple-vibrant",
    textColor: "text-white",
    borderColor: "border-windsurf-purple-deep",
    glowColor: "rgba(231, 29, 115, 0.2)", // Pinkish glow for purple card
  },
  {
    icon: <ZapIcon className="h-10 w-10" />,
    title: "Predictive Analysis",
    description: "Leverage AI to forecast trends and anticipate future outcomes based on historical data.",
    bgColor: "bg-windsurf-pink-hot",
    textColor: "text-white",
    borderColor: "border-pink-700",
    glowColor: "rgba(255, 255, 255, 0.25)", // White glow for pink card
  },
  {
    icon: <FileTextIcon className="h-10 w-10" />,
    title: "Automated Summaries",
    description: "Generate concise, AI-powered summaries of large volumes of information.",
    bgColor: "bg-windsurf-blue-electric",
    textColor: "text-white",
    borderColor: "border-blue-700",
    glowColor: "rgba(175, 255, 60, 0.2)", // Lime glow for blue card
  },
  {
    icon: <SearchIcon className="h-10 w-10" />,
    title: "Anomaly Detection",
    description: "Automatically identify unusual patterns and outliers that may indicate critical events.",
    bgColor: "bg-windsurf-yellow-bright",
    textColor: "text-windsurf-purple-deep",
    borderColor: "border-yellow-600",
    glowColor: "rgba(44, 228, 184, 0.3)", // Teal glow for yellow card
  },
  {
    icon: <BrainCircuit className="h-10 w-10" />,
    title: "Cross-Source Integration",
    description: "Seamlessly connect and analyze data from disparate sources in one unified platform.",
    bgColor: "bg-windsurf-green-lime",
    textColor: "text-windsurf-purple-deep",
    borderColor: "border-lime-600",
    glowColor: "rgba(123, 44, 191, 0.25)", // Purple glow for lime card
  },
  {
    icon: <ShieldCheckIcon className="h-10 w-10" />,
    title: "Secure Data Handling",
    description: "Enterprise-grade security and privacy protocols to protect your sensitive information.",
    bgColor: "bg-c9n-teal",
    textColor: "text-c9n-blue-dark",
    borderColor: "border-teal-700",
    glowColor: "rgba(255, 215, 0, 0.25)", // Yellow glow for teal card
  },
]

export default function FeatureGridSection() {
  return (
    <section className="py-16 md:py-24 bg-c9n-blue-dark">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            One Platform.{" "}
            <span className="bg-clip-text text-transparent bg-purple-pink-gradient">
              Unlimited Analytical Superpowers.
            </span>
          </h2>
          <p className="mt-4 text-lg text-windsurf-gray-light max-w-2xl mx-auto">
            C9D.AI equips you with a comprehensive suite of AI-driven tools to tackle your most complex analytical
            challenges.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature) => (
            <InteractiveCard
              key={feature.title}
              className={`p-8 rounded-xl shadow-2xl border-2 ${feature.borderColor} ${feature.bgColor} ${feature.textColor} flex flex-col items-start group hover:scale-105`}
              glowColor={feature.glowColor}
            >
              <div className={`mb-5 p-3 rounded-lg bg-black/20`}>{feature.icon}</div>
              <h3 className="text-2xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-sm opacity-90 leading-relaxed">{feature.description}</p>
            </InteractiveCard>
          ))}
        </div>
      </div>
    </section>
  )
}
