import { UsersIcon, BriefcaseIcon, ZapIcon } from "lucide-react"

const stats = [
  {
    value: "1M+",
    label: "Number of Users",
    description: "Trusted by over a million innovators, creators, and teams worldwide.",
    icon: <UsersIcon className="h-8 w-8 text-dify-accent-primary" />,
  },
  {
    value: "4,000+",
    label: "Enterprise Customers",
    description: "Trusted by startups, agencies, and enterprises worldwide.",
    icon: <BriefcaseIcon className="h-8 w-8 text-dify-accent-secondary" />,
  },
  {
    value: "94%",
    label: "Code Written by AI",
    description: "Our AI removes the vast amounts of time spent on boilerplate and menial tasks.",
    icon: <ZapIcon className="h-8 w-8 text-dify-accent-success" />,
  },
]

export default function StatsSection() {
  return (
    <section className="py-16 md:py-24 bg-dify-bg-primary relative overflow-hidden">
      {/* Subtle gradient orbs */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-radial from-dify-accent-primary/20 to-transparent opacity-30 blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-radial from-dify-accent-secondary/20 to-transparent opacity-30 blur-3xl"></div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Trusted by Developers.{" "}
            <span className="block sm:inline bg-clip-text text-transparent bg-gradient-to-r from-dify-accent-primary to-dify-accent-secondary">
              Proven in Enterprises.
            </span>
          </h2>
        </div>
        <div className="bg-dify-bg-card/90 backdrop-blur-sm p-8 md:p-12 rounded-xl shadow-2xl max-w-4xl mx-auto border border-dify-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start mb-3">
                  <div className="p-3 rounded-full bg-dify-accent-primary/10 mr-3">{stat.icon}</div>
                  <p className="text-4xl lg:text-5xl font-bold text-white">{stat.value}</p>
                </div>
                <h3 className="text-md font-semibold text-dify-accent-primary mb-1">{stat.label}</h3>
                <p className="text-sm text-dify-text-secondary">{stat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
