import Image from "next/image"

const testimonials = [
  {
    name: "Dr. Eva Rostova",
    handle: "@eva_analytics",
    quote: "C9N.AI is one of the best AI analysis tools I’ve ever used. Game changer for my research.",
    avatarUrl: "/female-data-scientist-avatar.png",
  },
  {
    name: "Marcus Chen",
    handle: "@datamarcus",
    quote: "C9N.AI is simply better from my experience over the last month. The speed and accuracy are unmatched.",
    avatarUrl: "/placeholder.svg?width=40&height=40",
  },
  {
    name: "Innovate Solutions Ltd.",
    handle: "Leading Tech Firm",
    quote: "C9N.AI UX beats competitors. Just click 'analyze' - it keeps our team *active* and focused.",
    avatarUrl: "/placeholder.svg?width=40&height=40",
  },
  {
    name: "Dr. Kenji Tanaka",
    handle: "@kenji_insights",
    quote:
      "I've been building a new model with C9N.AI and I spent the last hour in almost hysterical laughter because the insights are just so good.",
    avatarUrl: "/placeholder.svg?width=40&height=40",
  },
]

export default function SocialProofSection() {
  return (
    <section className="py-16 md:py-24 bg-[#0A192F]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Trusted by <span className="text-[#2CE4B8]">Leading Analysts & Organizations</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial) => (
            <div key={testimonial.name} className="bg-[#0F203A] p-6 rounded-lg shadow-lg border border-gray-700/50">
              <div className="flex items-center mb-4">
                <Image
                  src={testimonial.avatarUrl || "/placeholder.svg"}
                  alt={testimonial.name}
                  width={40}
                  height={40}
                  className="rounded-full mr-3"
                />
                <div>
                  <h4 className="font-semibold text-white">{testimonial.name}</h4>
                  <p className="text-xs text-gray-400">{testimonial.handle}</p>
                </div>
              </div>
              <p className="text-sm text-gray-300">{testimonial.quote}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
