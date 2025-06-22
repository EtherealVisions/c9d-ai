import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CodeIcon, BuildingIcon, ArrowRightIcon } from "lucide-react"

const solutions = [
  {
    title: "FOR RESEARCHERS & ANALYSTS",
    description:
      "Uncover insights without context-switching. Dive deep into data, generate hypotheses, and validate findings with unparalleled speed and precision. Finally!",
    ctaText: "LEARN MORE",
    ctaLink: "/solutions/researchers",
    imageUrl: "/abstract-pink-purple-waves.png",
    imageAlt: "Abstract graphic for researchers solution",
    bgColor: "bg-windsurf-purple-deep",
    accentColor: "text-windsurf-pink-hot",
    icon: <CodeIcon className="h-6 w-6 mr-2" />,
  },
  {
    title: "FOR ENTERPRISES",
    description:
      "Multiply your organization’s analytical output overnight. Empower teams with collaborative AI tools, streamline workflows, and drive data-informed decisions across the board.",
    ctaText: "LEARN MORE",
    ctaLink: "/solutions/enterprise",
    imageUrl: "/abstract-teal-yellow-waves.png",
    imageAlt: "Abstract graphic for enterprise solution",
    bgColor: "bg-c9n-blue-mid", // A darker teal/blue
    accentColor: "text-windsurf-green-lime",
    icon: <BuildingIcon className="h-6 w-6 mr-2" />,
  },
]

export default function SolutionsSection() {
  return (
    <section className="py-16 md:py-24 bg-c9n-blue-mid">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Tailored Solutions for Your{" "}
            <span className="bg-clip-text text-transparent bg-blue-teal-gradient">Analytical Needs</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {solutions.map((solution) => (
            <div
              key={solution.title}
              className={`rounded-xl shadow-2xl overflow-hidden border border-gray-700 flex flex-col group transition-all duration-300 hover:shadow-windsurf-purple-vibrant/30 ${solution.bgColor}`}
            >
              <div className="relative h-64 md:h-80 w-full">
                <Image
                  src={solution.imageUrl || "/placeholder.svg"}
                  alt={solution.imageAlt}
                  layout="fill"
                  objectFit="cover"
                  className="opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
              </div>
              <div className="p-8 flex flex-col flex-grow">
                <h3
                  className={`text-sm font-semibold ${solution.accentColor} tracking-wider uppercase mb-3 flex items-center`}
                >
                  {solution.icon}
                  {solution.title}
                </h3>
                <p className="text-gray-300 mb-6 flex-grow">{solution.description}</p>
                <Button
                  asChild
                  variant="link"
                  className={`${solution.accentColor} p-0 hover:brightness-125 font-semibold group`}
                >
                  <Link href={solution.ctaLink}>
                    {solution.ctaText}{" "}
                    <ArrowRightIcon className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
