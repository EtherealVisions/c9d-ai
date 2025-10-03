import Image from "next/image"
import { TwitterIcon } from "lucide-react" // Assuming you might want a Twitter icon

const testimonials = [
  {
    name: "Dr. Eva Rostova",
    handle: "@eva_analytics",
    quote: "C9D.AI is one ofthe best AI analysis tools I’ve ever used. Game changer for my research.",
    avatarUrl: "/female-data-scientist-avatar.png", // Keep existing
    highlight: false,
  },
  {
    name: "Marcus Chen",
    handle: "@datamarcus",
    quote: "C9D.AI is simply better from my experience over the last month. The speed and accuracy are unmatched.",
    avatarUrl: "/placeholder-vhfca.png",
    highlight: false,
  },
  {
    name: "Innovate Solutions Ltd.",
    handle: "Leading Tech Firm",
    quote: "C9D.AI UX beats competitors. Just click 'analyze' - it keeps our team *active* and focused.",
    avatarUrl: "/modern-abstract-logo.png",
    highlight: true, // Example of a highlighted card
  },
  {
    name: "Dr. Kenji Tanaka",
    handle: "@kenji_insights",
    quote:
      "I've been building a new model with C9D.AI and I spent the last hour in almost hysterical laughter because the insights are just so good.",
    avatarUrl: "/asian-male-researcher-avatar.png",
    highlight: false,
  },
]

export default function SocialProofSection() {
  return (
    <section className="py-16 md:py-24 bg-windsurf-off-white text-windsurf-purple-deep">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 md:mb-16">
          <div className="flex items-center mb-2">
            <span className="w-3 h-3 bg-windsurf-blue-electric rounded-sm mr-2"></span>
            <p className="text-sm font-semibold uppercase tracking-wider text-windsurf-blue-electric">Testimonials</p>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-windsurf-purple-deep">
            Trusted by <span className="text-windsurf-pink-hot">Elite Teams</span>
          </h2>
        </div>
        {/* This creates a horizontally scrolling container on small screens */}
        <div className="flex overflow-x-auto space-x-6 pb-6 -mb-6 snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-4 md:space-x-0 md:gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.name}
              className={`snap-center flex-shrink-0 w-72 md:w-auto bg-white p-6 rounded-lg shadow-lg border ${
                testimonial.highlight
                  ? "border-windsurf-blue-electric shadow-windsurf-blue-electric/30"
                  : "border-windsurf-gray-light"
              } transition-all duration-300 hover:shadow-xl hover:border-windsurf-pink-hot/50 group`}
            >
              <div className="flex items-center mb-4">
                <Image
                  src={testimonial.avatarUrl || "/placeholder.svg"}
                  alt={testimonial.name}
                  width={48}
                  height={48}
                  className="rounded-full mr-4 border-2 border-windsurf-gray-light group-hover:border-windsurf-pink-hot transition-colors"
                />
                <div>
                  <h4 className="font-semibold text-windsurf-purple-deep">{testimonial.name}</h4>
                  <p className="text-xs text-windsurf-gray-medium group-hover:text-windsurf-pink-hot transition-colors">
                    {testimonial.handle}
                  </p>
                </div>
                <TwitterIcon className="h-5 w-5 text-windsurf-gray-medium ml-auto group-hover:text-windsurf-blue-electric transition-colors" />
              </div>
              <p className="text-sm text-windsurf-purple-deep/80 leading-relaxed">{testimonial.quote}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
