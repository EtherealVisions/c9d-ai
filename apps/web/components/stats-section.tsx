import { UsersIcon, BriefcaseIcon, ZapIcon } from "lucide-react"

const stats = [
  {
    value: "1M+",
    label: "Number of Users",
    description: "Trusted by over a million innovators, creators, and teams worldwide.",
    icon: <UsersIcon className="h-8 w-8 text-windsurf-yellow-bright" />,
  },
  {
    value: "4,000+",
    label: "Enterprise Customers",
    description: "Trusted by startups, agencies, and enterprises worldwide.",
    icon: <BriefcaseIcon className="h-8 w-8 text-windsurf-pink-hot" />,
  },
  {
    value: "94%",
    label: "Code Written by AI",
    description: "Our AI removes the vast amounts of time spent on boilerplate and menial tasks.",
    icon: <ZapIcon className="h-8 w-8 text-windsurf-green-lime" />,
  },
]

export default function StatsSection() {
  return (
    <section className="py-16 md:py-24 bg-windsurf-purple-deep relative overflow-hidden">
      {/* Diagonal gradient graphic element */}
      <div className="absolute -top-1/4 -left-1/4 w-1/2 h-[150%] transform -skew-x-12 bg-gradient-to-br from-windsurf-yellow-bright/30 via-windsurf-pink-hot/20 to-transparent opacity-50 blur-3xl"></div>
      <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-[150%] transform skew-x-12 bg-gradient-to-tl from-windsurf-green-lime/30 via-c9n-teal/20 to-transparent opacity-50 blur-3xl"></div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Trusted by Developers.{" "}
            <span className="block sm:inline bg-clip-text text-transparent bg-yellow-lime-gradient">
              Proven in Enterprises.
            </span>
          </h2>
        </div>
        <div className="bg-windsurf-pink-light/90 backdrop-blur-sm p-8 md:p-12 rounded-xl shadow-2xl max-w-4xl mx-auto border border-windsurf-pink-hot/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start mb-3">
                  <div className="p-3 rounded-full bg-windsurf-purple-deep/10 mr-3">{stat.icon}</div>
                  <p className="text-4xl lg:text-5xl font-bold text-windsurf-purple-deep">{stat.value}</p>
                </div>
                <h3 className="text-md font-semibold text-windsurf-pink-hot mb-1">{stat.label}</h3>
                <p className="text-sm text-windsurf-purple-deep/70">{stat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
