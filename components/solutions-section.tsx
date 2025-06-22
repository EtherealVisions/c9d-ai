import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const solutions = [
  {
    title: "FOR RESEARCHERS & ANALYSTS",
    description:
      "Uncover insights without context-switching. Dive deep into data, generate hypotheses, and validate findings with unparalleled speed and precision. Finally!",
    ctaText: "LEARN MORE",
    ctaLink: "/solutions/researchers",
    imageUrl: "/focused-researcher-dataviz.png",
    imageAlt: "Researcher using C9N.AI",
  },
  {
    title: "FOR ENTERPRISES",
    description:
      "Multiply your organization’s analytical output overnight. Empower teams with collaborative AI tools, streamline workflows, and drive data-informed decisions across the board.",
    ctaText: "LEARN MORE",
    ctaLink: "/solutions/enterprise",
    imageUrl: "/data-analysis-collaboration.png",
    imageAlt: "Enterprise team using C9N.AI",
  },
]

export default function SolutionsSection() {
  return (
    <section className="py-16 md:py-24 bg-[#0F203A]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Tailored Solutions for Your Analytical Needs
          </h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {solutions.map((solution) => (
            <div
              key={solution.title}
              className="bg-[#0A192F] rounded-lg shadow-xl overflow-hidden border border-gray-700"
            >
              <Image
                src={solution.imageUrl || "/placeholder.svg"}
                alt={solution.imageAlt}
                width={500}
                height={350}
                className="w-full h-64 object-cover"
              />
              <div className="p-8">
                <h3 className="text-sm font-semibold text-[#2CE4B8] tracking-wider uppercase mb-3">{solution.title}</h3>
                <p className="text-gray-300 mb-6">{solution.description}</p>
                <Button asChild variant="link" className="text-[#2CE4B8] p-0 hover:text-teal-300">
                  <Link href={solution.ctaLink}>{solution.ctaText} &rarr;</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
