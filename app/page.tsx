"use client"

import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight, UsersRound, BotMessageSquare, Sparkles, Menu, X } from "lucide-react"
import { useState, useEffect } from "react"

// Helper component for consistent section padding and max-width
const SectionContainer = ({
  id,
  children,
  className = "",
}: { id?: string; children: React.ReactNode; className?: string }) => (
  <section id={id} className={`py-20 md:py-28 ${className}`}>
    <div className="container mx-auto px-4 md:px-6 max-w-5xl">{children}</div>
  </section>
)

export default function C9dLandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navLinks = [
    { href: "#how-it-works", label: "How It Works" },
    { href: "#why-c9d", label: "Why Partner?" },
    { href: "#vision", label: "Our Vision" },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-slate-100">
      {/* Navigation */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled ? "bg-slate-900/80 backdrop-blur-md shadow-lg shadow-cyan-500/10" : "bg-transparent"}`}
      >
        <div className="container mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
          <Link href="/" className="text-3xl font-bold text-cyan-400 hover:text-cyan-300 transition-colors">
            c9d.ai
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-slate-300 hover:text-cyan-400 transition-colors">
                {link.label}
              </Link>
            ))}
            <Button
              asChild
              variant="outline"
              className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-slate-900 transition-all duration-300"
            >
              <Link href="#consultation">Request Consultation</Link>
            </Button>
          </nav>
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
              className="text-slate-300 hover:text-cyan-400"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-slate-800 shadow-lg py-4">
            <nav className="flex flex-col items-center space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-slate-300 hover:text-cyan-400 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Button
                asChild
                className="w-4/5 bg-cyan-500 hover:bg-cyan-600 text-slate-900"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Link href="#consultation">Request Consultation</Link>
              </Button>
            </nav>
          </div>
        )}
      </header>

      <main>
        {/* Hero Section */}
        <SectionContainer id="hero" className="pt-24 md:pt-32 text-center relative overflow-hidden">
          <div className="absolute inset-0 -z-10 opacity-20">
            <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-cyan-500 rounded-full blur-[150px]"></div>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-50 mb-6">
            c9d.ai: Orchestrating <span className="text-cyan-400">Real-World</span> Connections.
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto mb-10">
            Experience the future of social interaction. Our AI intelligently coordinates dynamic, in-person
            engagements, enriching your life with meaningful human connections.
          </p>
          <Button
            size="lg"
            asChild
            className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 group shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-shadow"
          >
            <Link href="#consultation">
              Request a Consultation{" "}
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
          <div className="mt-16 md:mt-20 max-w-4xl mx-auto">
            <img
              src="/hero-global-network.png"
              alt="A striking visualization of a global network representing intelligent coordinated decisions."
              className="rounded-lg shadow-2xl shadow-cyan-500/20 aspect-[2/1] object-cover"
            />
          </div>
        </SectionContainer>

        {/* The Challenge Section */}
        <SectionContainer id="challenge" className="bg-slate-800/50">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-50 mb-4">
              Is Your Social Life Stuck on Autopilot?
            </h2>
            <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto">
              In a world of fleeting digital interactions, genuine connections can feel out of reach. c9d helps you
              break free from planning fatigue and superficial encounters, unlocking the true value of in-person
              socialization.
            </p>
          </div>
        </SectionContainer>

        {/* How It Works Section */}
        <SectionContainer id="how-it-works">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-50 mb-4">
              Introducing c9d.ai: Your Personal Social Architect
            </h2>
            <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto">
              We make fostering meaningful connections effortless and intuitive.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {[
              {
                icon: <UsersRound className="h-12 w-12 text-cyan-400 mb-4" />,
                title: "Discover & Connect",
                description:
                  "Uncover spontaneous opportunities and link up with like-minded individuals based on shared interests and real-time availability.",
              },
              {
                icon: <BotMessageSquare className="h-12 w-12 text-cyan-400 mb-4" />,
                title: "Intelligent Coordination",
                description:
                  "Our AI seamlessly orchestrates plans, aligning schedules and preferences to create perfectly timed social engagements.",
              },
              {
                icon: <Sparkles className="h-12 w-12 text-cyan-400 mb-4" />,
                title: "Meaningful Engagement",
                description:
                  "Move beyond surface-level interactions. c9d fosters environments for genuine conversations and memorable experiences.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex flex-col items-center text-center p-6 bg-slate-800 rounded-lg shadow-xl hover:shadow-cyan-500/30 transition-all duration-300 transform hover:-translate-y-1 border border-slate-700 hover:border-cyan-500/50"
              >
                {item.icon}
                <h3 className="text-xl font-semibold text-slate-100 mb-2">{item.title}</h3>
                <p className="text-slate-400">{item.description}</p>
              </div>
            ))}
          </div>
        </SectionContainer>

        {/* Why Partner Section */}
        <SectionContainer id="why-c9d" className="bg-slate-950/70 relative overflow-hidden">
          <div className="absolute inset-0 -z-10 opacity-10">
            <div className="absolute -top-1/4 -right-1/4 w-3/4 h-3/4 bg-cyan-600 rounded-full blur-[200px]"></div>
          </div>
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-cyan-400 mb-4">Why Partner with c9d.ai?</h2>
            <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto">
              We're not just another app. We're a catalyst for richer, more fulfilling human interactions.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div>
              <img
                src="/neon-friends-interacting.png"
                alt="People connecting meaningfully in a neon-lit environment"
                className="rounded-lg shadow-xl shadow-cyan-500/20"
              />
            </div>
            <div className="space-y-6">
              {[
                {
                  title: "Go Beyond the Screen",
                  description:
                    "Prioritize authentic, in-person interactions over endless scrolling. c9d facilitates real-world connections.",
                },
                {
                  title: "Quality Over Quantity",
                  description:
                    "Focus on developing deeper, more meaningful relationships, not just expanding your network.",
                },
                {
                  title: "AI with a Human Touch",
                  description:
                    "Leverage sophisticated technology designed to enhance your social life, not complicate it. It's smart, intuitive, and always puts human connection first.",
                },
              ].map((item) => (
                <div key={item.title}>
                  <h3 className="text-xl font-semibold text-slate-100 mb-1">{item.title}</h3>
                  <p className="text-slate-400">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </SectionContainer>

        {/* Our Vision Section */}
        <SectionContainer id="vision">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-50 mb-4">Reimagining Social Dynamics</h2>
            <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto mb-8">
              At c9d, we believe technology should amplify our humanity. We're building a future where genuine,
              in-person connections are not only easier to make but are more vibrant and fulfilling than ever before.
            </p>
            <img
              src="/futuristic-neon-city.png"
              alt="Vision of a connected future with neon aesthetic"
              className="rounded-lg shadow-xl shadow-cyan-500/15 mx-auto"
            />
          </div>
        </SectionContainer>

        {/* Consultation CTA Section */}
        <SectionContainer id="consultation" className="bg-slate-800/50">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-50 mb-4">Let's Collaborate</h2>
            <p className="text-lg text-slate-300 mb-8">
              Interested in leveraging our AI for your projects or exploring engineering engagements? Let's talk.
            </p>
            <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Your work email address"
                className="flex-grow text-base bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500"
                aria-label="Work email address for consultation"
              />
              <Button
                type="submit"
                size="lg"
                className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 shadow-md shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-shadow"
              >
                Request Consultation
              </Button>
            </form>
          </div>
        </SectionContainer>
      </main>

      {/* Footer */}
      <footer className="py-8 bg-slate-950 text-slate-400">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <Link
            href="/"
            className="text-2xl font-bold text-cyan-400 hover:text-cyan-300 mb-2 inline-block transition-colors"
          >
            c9d.ai
          </Link>
          <p className="text-sm mb-2">
            &copy; {new Date().getFullYear()} c9d.ai. All rights reserved. Building a more connected world, one
            interaction at a time.
          </p>
          <div className="space-x-4">
            <Link href="#" className="hover:text-cyan-400 transition-colors text-sm">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-cyan-400 transition-colors text-sm">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
