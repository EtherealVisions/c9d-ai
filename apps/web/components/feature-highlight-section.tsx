import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRightIcon } from "lucide-react"

type FeatureHighlightSectionProps = {
  title: string
  description: string
  subFeatureTitle: string
  subFeatureDescription: string
  ctaText: string
  ctaLink: string
  imageUrl: string
  imageAlt: string
  reverseLayout?: boolean
}

export default function FeatureHighlightSection({
  title,
  description,
  subFeatureTitle,
  subFeatureDescription,
  ctaText,
  ctaLink,
  imageUrl,
  imageAlt,
  reverseLayout = false,
}: FeatureHighlightSectionProps) {
  return (
    <section className="py-16 md:py-24 bg-[#0F203A]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-16 ${
            reverseLayout ? "lg:flex-row-reverse" : ""
          }`}
        >
          <div className="lg:w-1/2">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-6">{title}</h2>
            <p className="text-lg text-gray-300 mb-8">{description}</p>
            <div className="bg-[#0A192F] p-6 rounded-lg shadow-xl mb-8 border border-gray-700">
              <h3 className="text-xl font-semibold text-[#2CE4B8] mb-3">{subFeatureTitle}</h3>
              <p className="text-gray-400">{subFeatureDescription}</p>
            </div>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-gray-400 text-gray-200 hover:bg-gray-700/50 hover:text-white hover:border-gray-300 font-semibold bg-transparent"
            >
              <Link href={ctaLink}>
                {ctaText}
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
          <div className="lg:w-1/2">
            <Image
              src={imageUrl || "/placeholder.svg"}
              alt={imageAlt}
              width={600}
              height={400}
              className="rounded-lg shadow-2xl object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
