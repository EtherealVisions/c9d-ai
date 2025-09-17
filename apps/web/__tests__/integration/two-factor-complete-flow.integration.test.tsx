import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ClerkProvider } from '@clerk/nextjs'
import { TwoFactorForm } from '@/components/auth/two-factor-form'
import { TwoFactorSetup } from '@/components/auth/two-factor-setup'
import { TwoFactorManagement } from '@/components/auth/two-factor-management'
import { createTestDatabase, cleanupTestDatabase } from '../setup/test-database'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn()
  })
}))

// Mock QR code component
vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <div data-testid="qr-code" data-value={value}>QR Code</div>
  )
}))

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined)
  }
})

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url')
global.URL.revokeObjectURL = vi.fn()

// Helper to render components with Clerk provider
function renderWithClerk(component: React.ReactElement) {
  return render(
    <ClerkProvider publishableKey="pk_test_123">
      {component}
    </ClerkProvider>
  )
}

describe('Two-Factor Authentication Complete Flow Integration', () => {
  beforeAll(async () => {
    await createTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Complete TOTP Setup and Verification Flow', () => {
    it('should complete full TOTP setup and verification process', async () => {
      // Mock user for setup
      const mockUser = {
        id: 'user_123',
        twoFactorEnabled: false,
        phoneNumbers: [],
        createTOTP: vi.fn().mockResolvedValue({
          secret: 'JBSWY3DPEHPK3PXP',
          uri: 'otpauth://totp/C9d.ai:test@example.com?secret=JBSWY3DPEHPK3PXP&issuer=C9d.ai'
        }),
        verifyTOTP: vi.fn().mockResolvedValue({}),
        createBackupCode: vi.fn().mockResolvedValue({
          codes: ['backup1', 'backup2', 'backup3', 'backup4', 'backup5']
        })
      }

      // Mock Clerk hooks for setup
      vi.doMock('@clerk/nextjs', () => ({
        useUser: () => ({
          user: mockUser,
          isLoaded: true
        }),
        useSignIn: () => ({
          signIn: {
            supportedSecondFactors: [
              { strategy: 'totp' },
              { strategy: 'backup_code' }
            ],
            attemptSecondFactor: vi.fn()
          },
          isLoaded: true
        })
      }))

      const onComplete = vi.fn()

      // Step 1: Start TOTP setup
      renderWithClerk(<TwoFactorSetup onComplete={onComplete} />)

      // Should show method selection
      expect(screen.getByText(/secure your account/i)).toBeInTheDocument()
      expect(screen.getByText(/authenticator app/i)).toBeInTheDocument()

      // Select authenticator app
      fireEvent.click(screen.getByText(/authenticator app/i))

      await waitFor(() => {
        expect(mockUser.createTOTP).toHaveBeenCalled()
      })

      // Step 2: QR Code display
      await waitFor(() => {
        expect(screen.getByText(/setup authenticator app/i)).toBeInTheDocument()
      })

      expect(screen.getByTestId('qr-code')).toBeInTheDocument()
      expect(screen.getByText(/JBSWY3DPEHPK3PXP/)).toBeInTheDocument()

      // Proceed to verification
      fireEvent.click(screen.getByText(/i've added the account/i))

      // Step 3: Code verification
      expect(screen.getByText(/verify authenticator app/i)).toBeInTheDocument()

      const codeInput = screen.getByLabelText(/verification code/i)
      const verifyButton = screen.getByRole('button', { name: /verify and continue/i })

      fireEvent.change(codeInput, { target: { value: '123456' } })
      fireEvent.click(verifyButton)

      await waitFor(() => {
        expect(mockUser.verifyTOTP).toHaveBeenCalledWith({ code: '123456' })
      })

      // Step 4: Backup codes display
      await waitFor(() => {
        expect(screen.getByText(/save your backup codes/i)).toBeInTheDocument()
      })

      expect(screen.getByText('backup1')).toBeInTheDocument()
      expect(screen.getByText('backup2')).toBeInTheDocument()

      // Test backup code operations
      const copyButton = screen.getByRole('button', { name: /copy codes/i })
      fireEvent.click(copyButton)

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          'backup1\nbackup2\nbackup3\nbackup4\nbackup5'
        )
      })

      // Complete setup
      const completeButton = screen.getByRole('button', { name: /complete setup/i })
      fireEvent.click(completeButton)

      await waitFor(() => {
        expect(screen.getByText(/two-factor authentication enabled/i)).toBeInTheDocument()
      })

      expect(onComplete).toHaveBeenCalled()
    })

    it('should handle TOTP verification during sign-in', async () => {
      // Mock sign-in with 2FA required
      const mockSignIn = {
        supportedSecondFactors: [
          { strategy: 'totp' },
          { strategy: 'backup_code' }
        ],
        attemptSecondFactor: vi.fn().mockResolvedValue({
          status: 'complete'
        }),
        prepareSecondFactor: vi.fn()
      }

      vi.doMock('@clerk/nextjs', () => ({
        useSignIn: () => ({
          signIn: mockSignIn,
          isLoaded: true
        })
      }))

      const mockRouter = {
        push: vi.fn()
      }

      vi.doMock('next/navigation', () => ({
        useRouter: () => mockRouter
      }))

      renderWithClerk(<TwoFactorForm strategy="totp" />)

      // Should show TOTP verification form
      expect(screen.getByLabelText(/authenticator code/i)).toBeInTheDocument()

      const codeInput = screen.getByLabelText(/authenticator code/i)
      const verifyButton = screen.getByRole('button', { name: /verify/i })

      // Enter valid TOTP code
      fireEvent.change(codeInput, { target: { value: '654321' } })
      fireEvent.click(verifyButton)

      await waitFor(() => {
        expect(mockSignIn.attemptSecondFactor).toHaveBeenCalledWith({
          strategy: 'totp',
          code: '654321'
        })
      })

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
      })
    })
  })

  describe('Complete SMS Setup and Verification Flow', () => {
    it('should complete full SMS setup and verification process', async () => {
      const mockPhoneNumber = {
        phoneNumber: '+1234567890',
        prepareVerification: vi.fn().mockResolvedValue({}),
        attemptVerification: vi.fn().mockResolvedValue({})
      }

      const mockUser = {
        id: 'user_123',
        twoFactorEnabled: false,
        phoneNumbers: [],
        createPhoneNumber: vi.fn().mockResolvedValue(mockPhoneNumber),
        createBackupCode: vi.fn().mockResolvedValue({
          codes: ['sms1', 'sms2', 'sms3']
        })
      }

      vi.doMock('@clerk/nextjs', () => ({
        useUser: () => ({
          user: mockUser,
          isLoaded: true
        })
      }))

      renderWithClerk(<TwoFactorSetup />)

      // Step 1: Select SMS method
      fireEvent.click(screen.getByText(/sms text message/i))

      expect(screen.getByText(/setup sms authentication/i)).toBeInTheDocument()

      // Step 2: Enter phone number
      const phoneInput = screen.getByLabelText(/phone number/i)
      const sendButton = screen.getByRole('button', { name: /send verification code/i })

      fireEvent.change(phoneInput, { target: { value: '+1234567890' } })
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(mockUser.createPhoneNumber).toHaveBeenCalledWith({
          phoneNumber: '+1234567890'
        })
      })

      await waitFor(() => {
        expect(mockPhoneNumber.prepareVerification).toHaveBeenCalled()
      })

      // Step 3: Verify SMS code
      await waitFor(() => {
        expect(screen.getByText(/verify phone number/i)).toBeInTheDocument()
      })

      // Update mock user to include the phone number
      mockUser.phoneNumbers = [mockPhoneNumber]

      const smsCodeInput = screen.getByLabelText(/verification code/i)
      const verifyButton = screen.getByRole('button', { name: /verify and continue/i })

      fireEvent.change(smsCodeInput, { target: { value: '123456' } })
      fireEvent.click(verifyButton)

      await waitFor(() => {
        expect(mockPhoneNumber.attemptVerification).toHaveBeenCalledWith({
          code: '123456'
        })
      })

      // Step 4: Backup codes should be generated
      await waitFor(() => {
        expect(mockUser.createBackupCode).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(screen.getByText(/save your backup codes/i)).toBeInTheDocument()
      })
    })
  })

  describe('2FA Management Integration', () => {
    it('should show proper management interface for enabled methods', async () => {
      const mockUser = {
        id: 'user_123',
        twoFactorEnabled: true,
        backupCodeEnabled: true,
        phoneNumbers: [{
          phoneNumber: '+1234567890',
          verification: {
            status: 'verified',
            verifiedAt: '2024-01-01T00:00:00Z'
          },
          destroy: vi.fn().mockResolvedValue({})
        }],
        lastSignInAt: '2024-01-01T00:00:00Z',
        disableTOTP: vi.fn().mockResolvedValue({}),
        createBackupCode: vi.fn().mockResolvedValue({
          codes: ['mgmt1', 'mgmt2', 'mgmt3']
        })
      }

      vi.doMock('@clerk/nextjs', () => ({
        useUser: () => ({
          user: mockUser,
          isLoaded: true
        })
      }))

      renderWithClerk(<TwoFactorManagement />)

      // Should show excellent protection
      expect(screen.getByText(/excellent protection/i)).toBeInTheDocument()

      // Should show all methods as enabled
      expect(screen.getAllByText(/enabled/i)).toHaveLength(3)

      // Should show phone number
      expect(screen.getByText(/\+1234567890/)).toBeInTheDocument()

      // Should show last used date
      expect(screen.getByText(/last used: 1\/1\/2024/i)).toBeInTheDocument()

      // Test disabling TOTP
      const totpSection = screen.getByText(/authenticator app/i).closest('div')
      const disableButton = totpSection?.querySelector('button:has-text("Disable")')

      if (disableButton) {
        fireEvent.click(disableButton)

        await waitFor(() => {
          expect(mockUser.disableTOTP).toHaveBeenCalled()
        })
      }

      // Test regenerating backup codes
      const regenerateButton = screen.getByRole('button', { name: /regenerate/i })
      fireEvent.click(regenerateButton)

      await waitFor(() => {
        expect(mockUser.createBackupCode).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(screen.getByText(/your backup codes/i)).toBeInTheDocument()
      })

      expect(screen.getByText('mgmt1')).toBeInTheDocument()
    })

    it('should integrate setup dialog from management interface', async () => {
      const mockUser = {
        id: 'user_123',
        twoFactorEnabled: false,
        backupCodeEnabled: false,
        phoneNumbers: [],
        createTOTP: vi.fn().mockResolvedValue({
          secret: 'INTEGRATION_SECRET',
          uri: 'otpauth://totp/test'
        }),
        verifyTOTP: vi.fn().mockResolvedValue({}),
        createBackupCode: vi.fn().mockResolvedValue({
          codes: ['int1', 'int2', 'int3']
        })
      }

      vi.doMock('@clerk/nextjs', () => ({
        useUser: () => ({
          user: mockUser,
          isLoaded: true
        })
      }))

      renderWithClerk(<TwoFactorManagement />)

      // Should show no 2FA enabled
      expect(screen.getByText(/no 2fa enabled/i)).toBeInTheDocument()

      // Click main enable button
      const enableButton = screen.getByRole('button', { name: /enable two-factor authentication/i })
      fireEvent.click(enableButton)

      // Should open setup dialog
      expect(screen.getByText(/setup two-factor authentication/i)).toBeInTheDocument()
      expect(screen.getByText(/secure your account/i)).toBeInTheDocument()

      // Complete TOTP setup through the dialog
      fireEvent.click(screen.getByText(/authenticator app/i))

      await waitFor(() => {
        expect(mockUser.createTOTP).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(screen.getByText(/INTEGRATION_SECRET/)).toBeInTheDocument()
      })
    })
  })

  describe('Error Scenarios Integration', () => {
    it('should handle complete error flow from setup to verification', async () => {
      const mockUser = {
        id: 'user_123',
        twoFactorEnabled: false,
        phoneNumbers: [],
        createTOTP: vi.fn().mockRejectedValue(new Error('Network error')),
        verifyTOTP: vi.fn().mockRejectedValue({
          errors: [{ code: 'form_code_incorrect', message: 'Invalid code' }]
        })
      }

      vi.doMock('@clerk/nextjs', () => ({
        useUser: () => ({
          user: mockUser,
          isLoaded: true
        })
      }))

      renderWithClerk(<TwoFactorSetup />)

      // Try to start TOTP setup - should fail
      fireEvent.click(screen.getByText(/authenticator app/i))

      await waitFor(() => {
        expect(screen.getByText(/failed to setup authenticator app/i)).toBeInTheDocument()
      })

      // Fix the setup error and try again
      mockUser.createTOTP.mockResolvedValue({
        secret: 'ERROR_TEST_SECRET',
        uri: 'otpauth://totp/test'
      })

      fireEvent.click(screen.getByText(/authenticator app/i))

      await waitFor(() => {
        expect(screen.getByText(/setup authenticator app/i)).toBeInTheDocument()
      })

      // Proceed to verification
      fireEvent.click(screen.getByText(/i've added the account/i))

      // Try verification with invalid code
      const codeInput = screen.getByLabelText(/verification code/i)
      const verifyButton = screen.getByRole('button', { name: /verify and continue/i })

      fireEvent.change(codeInput, { target: { value: '000000' } })
      fireEvent.click(verifyButton)

      await waitFor(() => {
        expect(screen.getByText(/invalid verification code/i)).toBeInTheDocument()
      })
    })

    it('should handle management errors gracefully', async () => {
      const mockUser = {
        id: 'user_123',
        twoFactorEnabled: true,
        backupCodeEnabled: false,
        phoneNumbers: [],
        disableTOTP: vi.fn().mockRejectedValue(new Error('Disable failed')),
        createBackupCode: vi.fn().mockRejectedValue(new Error('Generation failed'))
      }

      vi.doMock('@clerk/nextjs', () => ({
        useUser: () => ({
          user: mockUser,
          isLoaded: true
        })
      }))

      renderWithClerk(<TwoFactorManagement />)

      // Try to disable TOTP - should show error
      const totpSection = screen.getByText(/authenticator app/i).closest('div')
      const disableButton = totpSection?.querySelector('button:has-text("Disable")')

      if (disableButton) {
        fireEvent.click(disableButton)

        await waitFor(() => {
          expect(screen.getByText(/failed to disable 2fa method/i)).toBeInTheDocument()
        })
      }
    })
  })

  describe('Accessibility Integration', () => {
    it('should maintain accessibility throughout the complete flow', async () => {
      const mockUser = {
        id: 'user_123',
        twoFactorEnabled: false,
        phoneNumbers: [],
        createTOTP: vi.fn().mockResolvedValue({
          secret: 'A11Y_SECRET',
          uri: 'otpauth://totp/test'
        }),
        verifyTOTP: vi.fn().mockResolvedValue({}),
        createBackupCode: vi.fn().mockResolvedValue({
          codes: ['a11y1', 'a11y2']
        })
      }

      vi.doMock('@clerk/nextjs', () => ({
        useUser: () => ({
          user: mockUser,
          isLoaded: true
        })
      }))

      renderWithClerk(<TwoFactorSetup />)

      // Check initial accessibility
      expect(screen.getByRole('heading', { name: /secure your account/i })).toBeInTheDocument()

      // Start TOTP setup
      fireEvent.click(screen.getByText(/authenticator app/i))

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /setup authenticator app/i })).toBeInTheDocument()
      })

      // Proceed to verification
      fireEvent.click(screen.getByText(/i've added the account/i))

      // Check form accessibility
      const codeInput = screen.getByLabelText(/verification code/i)
      expect(codeInput).toHaveAttribute('required')
      expect(codeInput).toHaveAttribute('maxLength', '6')

      fireEvent.change(codeInput, { target: { value: '123456' } })
      fireEvent.click(screen.getByRole('button', { name: /verify and continue/i }))

      // Check backup codes accessibility
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /save your backup codes/i })).toBeInTheDocument()
      })

      const copyButton = screen.getByRole('button', { name: /copy codes/i })
      const downloadButton = screen.getByRole('button', { name: /download/i })

      expect(copyButton).toBeInTheDocument()
      expect(downloadButton).toBeInTheDocument()
    })
  })
})