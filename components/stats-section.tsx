import { UsersIcon, BriefcaseIcon, PercentIcon } from "lucide-react"

const stats = [
  {
    value: "10M+",
    label: "Insights Generated",
    description: "Our AI has processed and delivered over ten million unique insights to users.",
    icon: <PercentIcon className="h-8 w-8 text-[#2CE4B8]" />, // Using Percent as a proxy for insights
  },
  {
    value: "500+",
    label: "Enterprise Clients",
    description: "Trusted by startups, agencies, and Fortune 500 companies worldwide.",
    icon: <BriefcaseIcon className="h-8 w-8 text-[#2CE4B8]" />,
  },
  {
    value: "70%",
    label: "Analysis Time Saved",
    description: "Users report an average of 70% reduction in time spent on boilerplate data tasks.",
    icon: <UsersIcon className="h-8 w-8 text-[#2CE4B8]" />, // Using Users as a proxy for efficiency
  },
]

export default function StatsSection() {
  return (
    <section className="py-16 md:py-24 bg-[#0F203A]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Trusted by Innovators. <span className="text-[#2CE4B8]">Proven in Demanding Environments.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-[#0A192F] p-8 rounded-lg shadow-xl text-center border border-gray-700">
              <div className="flex items-center justify-center w-16 h-16 bg-[#0F203A] rounded-full mx-auto mb-6 border-2 border-[#2CE4B8]/50">
                {stat.icon}
              </div>
              <p className="text-4xl font-bold text-white mb-2">{stat.value}</p>
              <h3 className="text-lg font-semibold text-[#2CE4B8] mb-2">{stat.label}</h3>
              <p className="text-sm text-gray-400">{stat.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
