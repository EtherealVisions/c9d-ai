import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CalendarCheckIcon } from "lucide-react"

export default function FinalCtaSection() {
  return (
    <section className="py-16 md:py-24 bg-[#0A192F]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-6">
          Ready to{" "}
          <span className="bg-clip-text text-transparent bg-purple-pink-gradient">Unlock Your Data's Potential?</span>
        </h2>
        <p className="text-lg text-windsurf-gray-light max-w-xl mx-auto mb-10">
          Connect with our experts to see how C9D.AI can transform complex information into actionable intelligence for
          your organization.
        </p>
        <div className="flex justify-center items-center">
          <Button
            size="lg"
            className="bg-windsurf-pink-hot text-white hover:bg-opacity-90 font-semibold w-full sm:w-auto max-w-xs shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 py-3 px-8 text-lg"
            asChild
          >
            <Link href="/request-consultation">
              <CalendarCheckIcon className="mr-2 h-5 w-5" />
              Request a Consultation
            </Link>
          </Button>
        </div>
        <p className="mt-8 text-sm text-windsurf-gray-medium">
          Want to learn more first?{" "}
          <Link href="/features" className="text-c9n-teal hover:underline font-semibold">
            Explore all features
          </Link>
        </p>
      </div>
    </section>
  )
}
