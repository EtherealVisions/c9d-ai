/**
 * Test Providers Setup
 * Provides all necessary context providers for testing components
 */

import React from 'react'
import { AccessibilityProvider } from '@/contexts/accessibility-context'

interface TestProvidersProps {
  children: React.ReactNode
}

/**
 * Wraps components with all necessary providers for testing
 * Includes all context providers that components might need
 */
export function TestProviders({ children }: TestProvidersProps) {
  return (
    <AccessibilityProvider>
      {children}
    </AccessibilityProvider>
  )
}

/**
 * Mock the accessibility context for tests that don't need full provider
 * This should be called from vitest.setup.ts
 */
export function setupAccessibilityMocks() {
  // This will be imported and called from vitest.setup.ts where vi is available
}

/**
 * Custom render function that includes all providers
 */
import { render, RenderOptions } from '@testing-library/react'

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  wrapper?: React.ComponentType<any>
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) {
  const { wrapper: CustomWrapper, ...renderOptions } = options
  
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    if (CustomWrapper) {
      return (
        <TestProviders>
          <CustomWrapper>{children}</CustomWrapper>
        </TestProviders>
      )
    }
    return <TestProviders>{children}</TestProviders>
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { renderWithProviders as render }