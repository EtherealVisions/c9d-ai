"use client"

import React, { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface Section {
  id: string
  label: string
}

const sections: Section[] = [
  { id: "hero", label: "Home" },
  { id: "build", label: "Build" },
  { id: "connect", label: "Connect" },
  { id: "enterprise", label: "Enterprise" },
  { id: "startup", label: "Startup" },
  { id: "community", label: "Community" },
]

export default function SectionNavigator() {
  const [activeSection, setActiveSection] = useState("hero")
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Show navigator after scrolling past hero
      const heroSection = document.getElementById("hero")
      if (heroSection) {
        const heroBottom = heroSection.offsetTop + heroSection.offsetHeight
        setIsVisible(window.scrollY > heroBottom - 100)
      }

      // Update active section based on scroll position
      const scrollPosition = window.scrollY + window.innerHeight / 3

      for (const section of sections) {
        const element = document.getElementById(section.id)
        if (element) {
          const { offsetTop, offsetHeight } = element
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id)
            break
          }
        }
      }
    }

    window.addEventListener("scroll", handleScroll)
    handleScroll() // Call once to set initial state

    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      const offset = 80 // Header height
      const elementPosition = element.offsetTop - offset
      window.scrollTo({
        top: elementPosition,
        behavior: "smooth"
      })
    }
  }

  return (
    <div
      className={cn(
        "fixed left-8 top-1/2 -translate-y-1/2 z-40 transition-opacity duration-300 hidden lg:block",
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <nav className="flex flex-col gap-4">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => scrollToSection(section.id)}
            className="group flex items-center gap-3"
            aria-label={`Navigate to ${section.label}`}
          >
            <div
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                activeSection === section.id
                  ? "bg-dify-blue scale-150"
                  : "bg-dify-gray-300 group-hover:bg-dify-gray-400"
              )}
            />
            <span
              className={cn(
                "text-xs font-medium transition-all duration-300 opacity-0 group-hover:opacity-100",
                activeSection === section.id
                  ? "text-dify-blue opacity-100"
                  : "text-dify-gray-500"
              )}
            >
              {section.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  )
}