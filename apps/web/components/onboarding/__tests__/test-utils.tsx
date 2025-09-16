/**
 * Test Utilities for Onboarding Components
 * 
 * Provides robust, functionality-focused test helpers that avoid brittle text matching
 * and focus on semantic behavior and accessibility.
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'

/**
 * Enhanced render function with user event setup
 */
export function renderWithUser(ui: ReactElement) {
  const user = userEvent.setup()
  const renderResult = render(ui)
  return {
    user,
    ...renderResult
  }
}

/**
 * Robust selectors that focus on functionality and accessibility
 */
export const selectors = {
  // Progress indicators - use data attributes instead of text
  progressIndicator: () => screen.getByTestId('progress-indicator'),
  progressBar: () => screen.getByTestId('progress-bar'),
  wizardProgressIndicator: () => screen.getByTestId('progress-indicator'), // For wizard-specific progress
  
  // Navigation - use semantic roles and accessible names
  navigation: {
    previous: () => screen.getByRole('button', { name: /previous/i }),
    next: () => screen.getByRole('button', { name: /next/i }),
    skip: () => screen.getByRole('button', { name: /skip/i }),
  },
  
  // Step content - use data attributes for reliable selection
  step: {
    container: () => screen.getByTestId('interactive-step'),
    title: () => within(selectors.step.container()).getByRole('heading'),
    startButton: () => screen.getByRole('button', { name: /start/i }),
    completeButton: () => screen.getByRole('button', { name: /complete/i }),
    helpButton: () => screen.getByRole('button', { name: /help/i }),
  },
  
  // Tabs - use proper tab roles
  tabs: {
    container: () => screen.getByTestId('tabs'),
    content: () => screen.getByRole('tab', { name: /content/i }),
    practice: () => screen.getByRole('tab', { name: /practice/i }),
    validation: () => screen.getByRole('tab', { name: /validation/i }),
  },
  
  // Forms - use labels and accessibility
  form: {
    getByLabel: (label: string) => screen.getByLabelText(new RegExp(label, 'i')),
    getRequiredField: (label: string) => screen.getByLabelText(new RegExp(`${label}.*\\*`, 'i')),
  },
  
  // Help system - use aria labels
  help: {
    button: () => screen.getByLabelText(/get help/i),
    panel: () => screen.getByTestId('help-panel'),
    closeButton: () => screen.getByRole('button', { name: /close/i }),
  },
  
  // Exit controls
  exit: {
    button: () => screen.getByLabelText(/exit/i),
  }
}

/**
 * Assertion helpers that focus on functionality
 * These return functions that can be used with expect() in actual tests
 */
export const assertions = {
  // Progress assertions using data attributes
  expectProgress: (percentage: number) => () => {
    const progressBar = selectors.progressBar()
    return { element: progressBar, expectedValue: percentage.toString() }
  },
  
  // Step assertions using semantic structure
  expectStepActive: (stepNumber: number) => () => {
    const progressIndicator = selectors.progressIndicator()
    return { element: progressIndicator, expectedStep: stepNumber.toString() }
  },
  
  // Navigation state assertions
  expectNavigationState: (state: { canGoPrevious?: boolean; canGoNext?: boolean; canSkip?: boolean }) => () => {
    const results: any = {}
    
    if (state.canGoPrevious !== undefined) {
      const prevButton = selectors.navigation.previous()
      results.previousButton = { element: prevButton, shouldBeEnabled: state.canGoPrevious }
    }
    
    if (state.canGoNext !== undefined) {
      const nextButton = selectors.navigation.next()
      results.nextButton = { element: nextButton, shouldBeEnabled: state.canGoNext }
    }
    
    if (state.canSkip !== undefined) {
      results.skipButton = { shouldBeVisible: state.canSkip }
    }
    
    return results
  },
  
  // Tab state assertions
  expectTabActive: (tabName: 'content' | 'practice' | 'validation') => () => {
    const tab = selectors.tabs[tabName]()
    return { element: tab, expectedState: 'active' }
  },
  
  // Help system assertions
  expectHelpVisible: (visible: boolean) => () => {
    return { shouldBeVisible: visible }
  }
}

/**
 * Action helpers for common user interactions
 */
export const actions = {
  // Navigation actions
  goToNextStep: async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(selectors.navigation.next())
  },
  
  goToPreviousStep: async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(selectors.navigation.previous())
  },
  
  skipStep: async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(selectors.navigation.skip())
  },
  
  // Step actions
  startStep: async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(selectors.step.startButton())
  },
  
  completeStep: async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(selectors.step.completeButton())
  },
  
  requestHelp: async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(selectors.step.helpButton())
  },
  
  // Tab actions
  switchToTab: async (user: ReturnType<typeof userEvent.setup>, tab: 'content' | 'practice' | 'validation') => {
    await user.click(selectors.tabs[tab]())
  },
  
  // Help actions
  openHelp: async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(selectors.help.button())
  },
  
  closeHelp: async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(selectors.help.closeButton())
  },
  
  // Exit actions
  exitOnboarding: async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(selectors.exit.button())
  }
}

/**
 * Wait helpers for async operations
 */
export const waitFor = {
  stepToLoad: async () => {
    await screen.findByTestId('interactive-step', {}, { timeout: 2000 })
  },
  
  tabsToLoad: async () => {
    await screen.findByTestId('tabs', {}, { timeout: 2000 })
  },
  
  helpToOpen: async () => {
    await screen.findByTestId('help-panel', {}, { timeout: 2000 })
  },
  
  navigationToUpdate: async () => {
    // Wait for navigation state to stabilize
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

/**
 * Mock data factories for consistent test data
 */
export const mockData: {
  createStep: (overrides?: any) => any
  createInteractiveStep: (overrides?: any) => any
  createPath: (steps?: any[]) => any
  createSession: (overrides?: any) => any
} = {
  createStep: (overrides = {}) => ({
    id: 'test-step-1',
    title: 'Test Step',
    description: 'A test step for unit testing',
    step_type: 'tutorial' as const,
    step_order: 1,
    is_required: true,
    estimated_time: 5,
    content: {
      text: '<p>Test content</p>',
      interactive_elements: []
    },
    success_criteria: {
      completion_threshold: 100,
      required_interactions: []
    },
    ...overrides
  }),
  
  createInteractiveStep: (overrides = {}) => ({
    id: 'test-interactive-step',
    title: 'Interactive Test Step',
    description: 'An interactive step for testing',
    step_type: 'interactive' as const,
    step_order: 1,
    is_required: true,
    estimated_time: 10,
    content: {
      text: '<p>Interactive content</p>',
      interactive_elements: [
        {
          id: 'test-input',
          type: 'text_input' as const,
          label: 'Test Input',
          placeholder: 'Enter test value',
          required: true,
          validation_rules: {
            min_length: 1,
            max_length: 100
          }
        }
      ]
    },
    success_criteria: {
      completion_threshold: 80,
      required_interactions: ['test-input']
    },
    ...overrides
  }),
  
  createPath: (steps = [mockData.createStep()]) => ({
    id: 'test-path-1',
    name: 'Test Onboarding Path',
    description: 'A test path for unit testing',
    steps
  }),
  
  createSession: (overrides = {}) => ({
    id: 'test-session-1',
    user_id: 'test-user-1',
    path_id: 'test-path-1',
    current_step_id: 'test-step-1',
    current_step_index: 0,
    status: 'in_progress' as const,
    started_at: new Date().toISOString(),
    session_metadata: {},
    user_progress: [],
    ...overrides
  })
}