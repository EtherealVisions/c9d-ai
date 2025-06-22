import { Button } from "@/components/ui/button"
import { DownloadIcon, ArrowRightIcon, CheckCircleIcon } from "lucide-react"

export default function HeroSection() {
  return (
    <section className="relative py-20 md:py-32 lg:py-40 overflow-hidden">
      {/* Subtle background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-1/2 h-full opacity-10 -translate-x-1/4">
          <div className="w-full h-full bg-radial-gradient from-[#2CE4B8]/30 to-transparent blur-3xl"></div>
        </div>
        {/* Simplified wavy lines placeholder - could be an SVG */}
        <div className="absolute bottom-0 left-0 w-full h-1/3 opacity-5">
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 1440 300"
            preserveAspectRatio="none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M-200 150 Q 160 50, 520 150 T 1240 50 T 1600 150"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="4 8"
            />
            <path
              d="M-200 200 Q 160 100, 520 200 T 1240 100 T 1600 200"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="4 8"
            />
            <path
              d="M-200 250 Q 160 150, 520 250 T 1240 150 T 1600 250"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="4 8"
            />
          </svg>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto text-center lg:text-left lg:mx-0">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            Unlock Deeper Insights. <span className="block sm:inline">Effortlessly.</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-300 max-w-2xl mx-auto lg:mx-0">
            C9N.AI leverages advanced AI to analyze and coordinate disparate, opaque relationships, bringing you
            relevant information and insights.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <Button
              size="lg"
              className="bg-[#2CE4B8] text-[#0A192F] hover:bg-[#2CE4B8]/90 font-semibold w-full sm:w-auto"
            >
              <DownloadIcon className="mr-2 h-5 w-5" />
              Get Started
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-gray-400 text-gray-200 hover:bg-gray-700/50 hover:text-white hover:border-gray-300 font-semibold w-full sm:w-auto bg-transparent"
            >
              Learn More
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </Button>
          </div>
          <div className="mt-8 flex items-center justify-center lg:justify-start text-sm text-gray-400">
            <CheckCircleIcon className="mr-2 h-5 w-5 text-[#2CE4B8]" />
            Better analysis, better coordination, clearer insights.
          </div>
        </div>
      </div>
    </section>
  )
}
