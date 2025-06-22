import { BarChartIcon, ZapIcon, FileTextIcon, SearchIcon, Share2Icon, ShieldCheckIcon } from "lucide-react"

const features = [
  {
    icon: <Share2Icon className="h-8 w-8 text-[#2CE4B8]" />,
    title: "Relationship Mapping",
    description: "Visualize complex connections and dependencies within your data instantly.",
  },
  {
    icon: <ZapIcon className="h-8 w-8 text-[#2CE4B8]" />,
    title: "Predictive Analysis",
    description: "Leverage AI to forecast trends and anticipate future outcomes based on historical data.",
  },
  {
    icon: <FileTextIcon className="h-8 w-8 text-[#2CE4B8]" />,
    title: "Automated Summaries",
    description: "Generate concise, AI-powered summaries of large volumes of information.",
  },
  {
    icon: <SearchIcon className="h-8 w-8 text-[#2CE4B8]" />,
    title: "Anomaly Detection",
    description: "Automatically identify unusual patterns and outliers that may indicate critical events.",
  },
  {
    icon: <BarChartIcon className="h-8 w-8 text-[#2CE4B8]" />,
    title: "Cross-Source Integration",
    description: "Seamlessly connect and analyze data from disparate sources in one unified platform.",
  },
  {
    icon: <ShieldCheckIcon className="h-8 w-8 text-[#2CE4B8]" />,
    title: "Secure Data Handling",
    description: "Enterprise-grade security and privacy protocols to protect your sensitive information.",
  },
]

export default function FeatureGridSection() {
  return (
    <section className="py-16 md:py-24 bg-[#0A192F]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            One Platform. <span className="text-[#2CE4B8]">Unlimited Analytical Superpowers.</span>
          </h2>
          <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
            C9N.AI equips you with a comprehensive suite of AI-driven tools to tackle your most complex analytical
            challenges.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-[#0F203A] p-6 rounded-lg shadow-lg border border-gray-700/50 hover:shadow-xl hover:border-[#2CE4B8]/50 transition-all duration-300"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-[#0A192F] rounded-md mb-4 border border-gray-600">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
