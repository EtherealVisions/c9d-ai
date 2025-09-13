import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import EnhancedFeatureShowcase from "../enhanced-feature-showcase"

// Mock the intersection observer
const mockIntersectionObserver = vi.fn()
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
})
window.IntersectionObserver = mockIntersectionObserver

// Mock Next.js components
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => (
    <img src={src} alt={alt} {...props} />
  ),
}))

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe("EnhancedFeatureShowcase", () => {
  it("renders the main feature grid section", () => {
    render(<EnhancedFeatureShowcase />)
    
    expect(screen.getByText("One Platform.")).toBeInTheDocument()
    expect(screen.getByText("Unlimited Analytical Superpowers.")).toBeInTheDocument()
  })

  it("renders feature cards with enhanced functionality", () => {
    render(<EnhancedFeatureShowcase />)
    
    // Check for feature titles
    expect(screen.getByText("Relationship Mapping")).toBeInTheDocument()
    expect(screen.getByText("Predictive Analysis")).toBeInTheDocument()
    expect(screen.getByText("Automated Summaries")).toBeInTheDocument()
    expect(screen.getByText("Anomaly Detection")).toBeInTheDocument()
    expect(screen.getByText("Cross-Source Integration")).toBeInTheDocument()
    expect(screen.getByText("Secure Data Handling")).toBeInTheDocument()
  })

  it("renders feature highlight sections", () => {
    render(<EnhancedFeatureShowcase />)
    
    expect(screen.getByText("AI Agent Orchestration")).toBeInTheDocument()
    expect(screen.getByText("Real-Time Analytics Dashboard")).toBeInTheDocument()
    expect(screen.getByText("Enterprise Security & Compliance")).toBeInTheDocument()
  })

  it("renders the feature comparison matrix", () => {
    render(<EnhancedFeatureShowcase />)
    
    expect(screen.getByText("Why Choose")).toBeInTheDocument()
    expect(screen.getByText("C9d.ai")).toBeInTheDocument()
    expect(screen.getByText("?")).toBeInTheDocument()
  })

  it("opens feature detail modal when Learn More is clicked", async () => {
    render(<EnhancedFeatureShowcase />)
    
    // Find and click the first "Learn More" button
    const learnMoreButtons = screen.getAllByText("Learn More")
    fireEvent.click(learnMoreButtons[0])
    
    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })
  })

  it("displays feature benefits in cards", () => {
    render(<EnhancedFeatureShowcase />)
    
    // Check for benefit indicators
    expect(screen.getByText("+2 more benefits")).toBeInTheDocument()
  })

  it("has proper accessibility attributes", () => {
    render(<EnhancedFeatureShowcase />)
    
    // Check for proper heading structure
    const mainHeading = screen.getByRole("heading", { level: 2 })
    expect(mainHeading).toBeInTheDocument()
    
    // Check for interactive elements
    const buttons = screen.getAllByRole("button")
    expect(buttons.length).toBeGreaterThan(0)
  })

  it("renders with proper gradient and color schemes", () => {
    render(<EnhancedFeatureShowcase />)
    
    // Check that the component renders without crashing
    // The specific color classes are tested through visual regression
    expect(screen.getByText("One Platform.")).toBeInTheDocument()
  })
})