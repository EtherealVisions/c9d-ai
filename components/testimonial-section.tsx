import Image from "next/image"

export default function TestimonialSection() {
  return (
    <section className="py-16 md:py-24 bg-[#0A192F]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <Image
            src="/ceo-profile.png"
            alt="G. Analytex, CEO of Insight Corp"
            width={100}
            height={100}
            className="rounded-full mx-auto mb-6 border-2 border-[#2CE4B8]"
          />
          <blockquote className="text-2xl sm:text-3xl font-medium text-white leading-tight">
            “Every single one of our analysts has to spend literally just one day making projects with C9N.AI and it
            will be like they strapped on rocket boosters.”
          </blockquote>
          <p className="mt-6 text-lg font-semibold text-[#2CE4B8]">G. Analytex</p>
          <p className="text-sm text-gray-400">President & CEO, Insight Corp</p>
        </div>
      </div>
    </section>
  )
}
