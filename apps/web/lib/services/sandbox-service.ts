/**
 * Sandbox Service for safe experimentation with platform features
 * Provides isolated environment for onboarding tutorials and practice
 */

export interface SandboxSession {
  id: string
  userId: string
  type: 'tutorial' | 'practice' | 'demo'
  state: Record<string, unknown>
  createdAt: Date
  expiresAt: Date
  isActive: boolean
}

export interface SandboxEnvironment {
  id: string
  name: string
  description: string
  features: string[]
  resetOnExit: boolean
  timeLimit?: number
}

export interface TutorialStep {
  id: string
  title: string
  description: string
  action: 'click' | 'input' | 'navigate' | 'wait' | 'validate'
  target?: string
  expectedValue?: string
  validation?: (value: unknown) => boolean
  hints: string[]
  errorMessage?: string
}

export interface Tutorial {
  id: string
  title: string
  description: string
  category: 'authentication' | 'organization' | 'features' | 'advanced'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime: number
  prerequisites: string[]
  steps: TutorialStep[]
  completionCriteria: string[]
}

export class SandboxService {
  private static sessions = new Map<string, SandboxSession>()
  private static environments = new Map<string, SandboxEnvironment>()
  private static tutorials = new Map<string, Tutorial>()

  /**
   * Initialize sandbox environments and tutorials
   */
  static initialize(): void {
    this.setupDefaultEnvironments()
    this.setupDefaultTutorials()
  }

  /**
   * Create a new sandbox session
   */
  static async createSession(
    userId: string,
    environmentId: string,
    type: SandboxSession['type'] = 'tutorial'
  ): Promise<SandboxSession> {
    const environment = this.environments.get(environmentId)
    if (!environment) {
      throw new Error(`Environment ${environmentId} not found`)
    }

    const session: SandboxSession = {
      id: `sandbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type,
      state: {
        environmentId,
        startedAt: new Date(),
        currentStep: 0,
        completedSteps: [],
        errors: []
      },
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + (environment.timeLimit || 3600000)), // 1 hour default
      isActive: true
    }

    this.sessions.set(session.id, session)
    return session
  }

  /**
   * Get active session for user
   */
  static getActiveSession(userId: string): SandboxSession | null {
    for (const session of this.sessions.values()) {
      if (session.userId === userId && session.isActive && session.expiresAt > new Date()) {
        return session
      }
    }
    return null
  }

  /**
   * Update session state
   */
  static updateSessionState(sessionId: string, updates: Partial<SandboxSession['state']>): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.state = { ...session.state, ...updates }
    }
  }

  /**
   * End sandbox session
   */
  static async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.isActive = false
      
      // Reset environment if configured
      const environmentId = session.state.environmentId as string
      const environment = this.environments.get(environmentId)
      if (environment?.resetOnExit) {
        await this.resetEnvironment(sessionId)
      }
    }
  }

  /**
   * Get tutorial by ID
   */
  static getTutorial(tutorialId: string): Tutorial | null {
    return this.tutorials.get(tutorialId) || null
  }

  /**
   * Get tutorials by category
   */
  static getTutorialsByCategory(category: Tutorial['category']): Tutorial[] {
    return Array.from(this.tutorials.values()).filter(t => t.category === category)
  }

  /**
   * Validate tutorial step completion
   */
  static validateStep(
    sessionId: string,
    stepId: string,
    userInput: unknown
  ): { isValid: boolean; feedback: string; nextStep?: string } {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return { isValid: false, feedback: 'Session not found' }
    }

    const tutorialId = session.state.currentTutorial as string
    const tutorial = this.tutorials.get(tutorialId)
    if (!tutorial) {
      return { isValid: false, feedback: 'Tutorial not found' }
    }

    const step = tutorial.steps.find(s => s.id === stepId)
    if (!step) {
      return { isValid: false, feedback: 'Step not found' }
    }

    // Validate step based on type and criteria
    let isValid = false
    let feedback = ''

    switch (step.action) {
      case 'input':
        if (step.validation) {
          // Use validation function if provided
          isValid = step.validation(userInput)
          feedback = isValid ? 'Validation passed!' : step.errorMessage || 'Validation failed'
        } else if (step.expectedValue) {
          // Use expected value if provided
          isValid = userInput === step.expectedValue
          feedback = isValid ? 'Correct input!' : step.errorMessage || 'Invalid input'
        } else {
          // Just check for truthy input
          isValid = !!userInput
          feedback = isValid ? 'Input received!' : step.errorMessage || 'Input required'
        }
        break
      
      case 'click':
        isValid = userInput === step.target
        feedback = isValid ? 'Great! You clicked the right element.' : 'Please click the highlighted element'
        break
      
      case 'validate':
        isValid = step.validation ? step.validation(userInput) : true
        feedback = isValid ? 'Validation passed!' : step.errorMessage || 'Validation failed'
        break
      
      default:
        isValid = true
        feedback = 'Step completed'
    }

    // Update session progress
    if (isValid) {
      const completedSteps = session.state.completedSteps as string[] || []
      if (!completedSteps.includes(stepId)) {
        completedSteps.push(stepId)
        this.updateSessionState(sessionId, { completedSteps })
      }

      // Find next step
      const currentIndex = tutorial.steps.findIndex(s => s.id === stepId)
      const nextStep = tutorial.steps[currentIndex + 1]
      
      return {
        isValid,
        feedback,
        nextStep: nextStep?.id
      }
    }

    return { isValid, feedback }
  }

  /**
   * Reset sandbox environment
   */
  private static async resetEnvironment(sessionId: string): Promise<void> {
    // Implementation would reset any changes made during the session
    // This is a placeholder for the actual reset logic
    console.log(`Resetting environment for session ${sessionId}`)
  }

  /**
   * Clear all sessions (for testing purposes)
   */
  static clearAllSessions(): void {
    this.sessions.clear()
  }

  /**
   * Setup default sandbox environments
   */
  private static setupDefaultEnvironments(): void {
    const environments: SandboxEnvironment[] = [
      {
        id: 'auth-tutorial',
        name: 'Authentication Tutorial',
        description: 'Learn sign-in and sign-up processes',
        features: ['sign-in', 'sign-up', 'profile-setup'],
        resetOnExit: true,
        timeLimit: 1800000 // 30 minutes
      },
      {
        id: 'org-setup',
        name: 'Organization Setup',
        description: 'Practice creating and configuring organizations',
        features: ['create-org', 'invite-members', 'configure-settings'],
        resetOnExit: true,
        timeLimit: 2700000 // 45 minutes
      },
      {
        id: 'feature-demo',
        name: 'Feature Demonstration',
        description: 'Explore platform features safely',
        features: ['all-features'],
        resetOnExit: false,
        timeLimit: 3600000 // 1 hour
      }
    ]

    environments.forEach(env => {
      this.environments.set(env.id, env)
    })
  }

  /**
   * Setup default tutorials
   */
  private static setupDefaultTutorials(): void {
    const tutorials: Tutorial[] = [
      {
        id: 'auth-basics',
        title: 'Authentication Basics',
        description: 'Learn how to sign in and sign up to the platform',
        category: 'authentication',
        difficulty: 'beginner',
        estimatedTime: 10,
        prerequisites: [],
        steps: [
          {
            id: 'navigate-signin',
            title: 'Navigate to Sign In',
            description: 'Click the Sign In button in the header',
            action: 'click',
            target: 'sign-in-button',
            hints: ['Look for the Sign In button in the top navigation']
          },
          {
            id: 'enter-email',
            title: 'Enter Email',
            description: 'Enter your email address',
            action: 'input',
            target: 'email-input',
            expectedValue: 'demo@example.com',
            hints: ['Use the demo email: demo@example.com']
          },
          {
            id: 'enter-password',
            title: 'Enter Password',
            description: 'Enter your password',
            action: 'input',
            target: 'password-input',
            expectedValue: 'demo123',
            hints: ['Use the demo password: demo123']
          },
          {
            id: 'submit-signin',
            title: 'Submit Sign In',
            description: 'Click the Sign In button to authenticate',
            action: 'click',
            target: 'submit-button',
            hints: ['Click the Sign In button to complete authentication']
          }
        ],
        completionCriteria: ['User successfully signed in', 'Redirected to dashboard']
      },
      {
        id: 'signup-process',
        title: 'Sign Up Process',
        description: 'Learn how to create a new account',
        category: 'authentication',
        difficulty: 'beginner',
        estimatedTime: 15,
        prerequisites: [],
        steps: [
          {
            id: 'navigate-signup',
            title: 'Navigate to Sign Up',
            description: 'Click the Sign Up button in the header',
            action: 'click',
            target: 'sign-up-button',
            hints: ['Look for the Sign Up button in the top navigation']
          },
          {
            id: 'enter-signup-email',
            title: 'Enter Email',
            description: 'Enter your email address for the new account',
            action: 'input',
            target: 'email-input',
            validation: (value) => typeof value === 'string' && value.includes('@'),
            hints: ['Enter a valid email address']
          },
          {
            id: 'enter-signup-password',
            title: 'Create Password',
            description: 'Create a secure password',
            action: 'input',
            target: 'password-input',
            validation: (value) => typeof value === 'string' && value.length >= 8,
            hints: ['Password must be at least 8 characters long']
          },
          {
            id: 'confirm-password',
            title: 'Confirm Password',
            description: 'Confirm your password',
            action: 'input',
            target: 'confirm-password-input',
            hints: ['Enter the same password again']
          },
          {
            id: 'submit-signup',
            title: 'Create Account',
            description: 'Click the Sign Up button to create your account',
            action: 'click',
            target: 'submit-button',
            hints: ['Click the Sign Up button to create your account']
          }
        ],
        completionCriteria: ['Account created successfully', 'Email verification sent']
      }
    ]

    tutorials.forEach(tutorial => {
      this.tutorials.set(tutorial.id, tutorial)
    })
  }
}

// Initialize the service
SandboxService.initialize()