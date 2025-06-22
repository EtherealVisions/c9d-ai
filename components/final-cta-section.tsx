import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function FinalCtaSection() {
  return (
    <section className="py-16 md:py-24 bg-[#0A192F]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-6">
          Ready to <span className="text-[#2CE4B8]">Unlock Your Data's Potential?</span>
        </h2>
        <p className="text-lg text-gray-300 max-w-xl mx-auto mb-10">
          Access the C9N.AI platform and start transforming complex information into actionable intelligence today.
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Button
            size="lg"
            className="bg-[#2CE4B8] text-[#0A192F] hover:bg-[#2CE4B8]/90 font-semibold w-full sm:w-auto"
          >
            Request a Demo
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-gray-400 text-gray-200 hover:bg-gray-700/50 hover:text-white hover:border-gray-300 font-semibold w-full sm:w-auto bg-transparent"
          >
            Sign Up for Free Trial
          </Button>
        </div>
        <p className="mt-8 text-sm text-gray-400">
          Not ready yet?{" "}
          <Link href="/features" className="text-[#2CE4B8] hover:underline">
            View all features
          </Link>
        </p>
      </div>
    </section>
  )
}
