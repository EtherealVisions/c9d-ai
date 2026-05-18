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
    <section className="py-16 md:py-24 bg-dify-bg-secondary">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-16 ${
            reverseLayout ? "lg:flex-row-reverse" : ""
          }`}
        >
          <div className="lg:w-1/2">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-6">{title}</h2>
            <p className="text-lg text-dify-text-secondary mb-8">{description}</p>
            <div className="bg-dify-bg-card p-6 rounded-lg shadow-xl mb-8 border border-dify-border hover:border-dify-accent-primary/50 transition-all">
              <h3 className="text-xl font-semibold bg-gradient-to-r from-dify-accent-primary to-dify-accent-secondary bg-clip-text text-transparent mb-3">{subFeatureTitle}</h3>
              <p className="text-dify-text-secondary">{subFeatureDescription}</p>
            </div>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-dify-border text-dify-text-secondary hover:bg-dify-surface-hover hover:text-white hover:border-dify-accent-primary/50 font-medium bg-transparent transition-all"
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
