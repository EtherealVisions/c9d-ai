"use client"

import React, { type ReactNode, type HTMLAttributes } from "react"
import { useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface InteractiveCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  className?: string
  glowColor?: string // e.g., "rgba(44, 228, 184, 0.15)" for c9n-teal
}

export default function InteractiveCard({
  children,
  className,
  glowColor = "rgba(255, 255, 255, 0.1)", // Default subtle white glow
  ...props
}: InteractiveCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isHovering, setIsHovering] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      cardRef.current.style.setProperty("--mouse-x", `${x}px`)
      cardRef.current.style.setProperty("--mouse-y", `${y}px`)
      cardRef.current.style.setProperty("--glow-color", glowColor)
    }
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={cn("interactive-card relative overflow-hidden transition-all duration-300 ease-in-out", className)}
      {...props}
    >
      {children}
      <div
        className={cn(
          "interactive-card-glow absolute inset-0 pointer-events-none transition-opacity duration-300",
          isHovering ? "opacity-100" : "opacity-0",
        )}
        style={{
          background: `radial-gradient(350px circle at var(--mouse-x) var(--mouse-y), var(--glow-color), transparent 80%)`,
        }}
      />
    </div>
  )
}
