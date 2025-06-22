import Image from "next/image"

export default function TestimonialSection() {
  return (
    <section className="py-16 md:py-24 bg-windsurf-pink-light relative overflow-hidden">
      {/* Subtle geometric pattern */}
      <div className="absolute inset-0 opacity-20">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="pinkGrid" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 80" fill="none" stroke="rgba(231, 29, 115, 0.2)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#pinkGrid)" />
        </svg>
      </div>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <Image
            src="/ceo-profile.png" // Keep existing or replace if a new style is preferred
            alt="G. Analytex, CEO of Insight Corp"
            width={100}
            height={100}
            className="rounded-full mx-auto mb-6 border-4 border-white shadow-lg"
          />
          <blockquote className="text-2xl sm:text-3xl font-medium text-windsurf-purple-deep leading-tight md:leading-snug">
            “Every single one of our analysts has to spend literally just one day making projects with C9N.AI and it
            will be like they strapped on <span className="text-windsurf-pink-hot">rocket boosters</span>.”
          </blockquote>
          <p className="mt-8 text-lg font-semibold text-windsurf-pink-hot">G. Analytex</p>
          <p className="text-sm text-windsurf-purple-deep/70">President & CEO, Insight Corp</p>
        </div>
      </div>
    </section>
  )
}
