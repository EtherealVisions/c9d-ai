import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CalendarCheckIcon } from "lucide-react"

export default function FinalCtaSection() {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-dify-bg-primary to-dify-bg-secondary relative overflow-hidden">
      {/* Subtle gradient orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-dify-gradient-radial opacity-10 blur-3xl pointer-events-none" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-6">
          Ready to{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-dify-accent-primary to-dify-accent-secondary">Unlock Your Data's Potential?</span>
        </h2>
        <p className="text-lg text-dify-text-secondary max-w-xl mx-auto mb-10">
          Connect with our experts to see how C9D.AI can transform complex information into actionable intelligence for
          your organization.
        </p>
        <div className="flex justify-center items-center">
          <Button
            size="lg"
            className="bg-gradient-to-r from-dify-accent-primary to-dify-accent-secondary text-white hover:opacity-90 font-medium w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 py-3 px-8"
            asChild
          >
            <Link href="/request-consultation">
              <CalendarCheckIcon className="mr-2 h-5 w-5" />
              Request a Consultation
            </Link>
          </Button>
        </div>
        <p className="mt-8 text-sm text-dify-text-muted">
          Want to learn more first?{" "}
          <Link href="/features" className="text-dify-accent-primary hover:text-dify-accent-secondary transition-colors font-medium">
            Explore all features →
          </Link>
        </p>
      </div>
    </section>
  )
}
