import React from 'react'
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ClerkProvider } from '@clerk/nextjs'
import { TwoFactorForm } from '@/components/auth/two-factor-form'
import { TwoFactorSetup } from '@/components/auth/two-factor-setup'
import { createTestDatabase, cleanupTestDatabase } from '../setup/test-database'

// Mock Next.js router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: vi.fn()
  })
}))

// Mock QR code component
vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value, size }: any) => (
    <div data-testid="qr-code" data-value={value} data-size={size}>
      QR Code: {value}
    </div>
  )
}))

describe('Two-Factor Authentication Flow Integration', () => {
  beforeAll(async () => {
    await createTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderWithClerk = (component: React.ReactElement) => {
    return render(
      <ClerkProvider publishableKey="pk_test_123">
        {component}
      </ClerkProvider>
    )
  }

  describe('2FA Verification Flow', () => {
    it('should handle complete TOTP verification workflow', async () => {
      // Mock Clerk sign-in object
      const mockSignIn = {
        attemptSecondFactor: vi.fn(),
        prepareSecondFactor: vi.fn(),
        supportedSecondFactors: [
          { strategy: 'totp' },
          { strategy: 'sms', phoneNumberId: 'phone_123' },
          { strategy: 'backup_code' }
        ]
      }

      // Mock useSignIn hook
      vi.doMock('@clerk/nextjs', () => ({
        useSignIn: () => ({
          signIn: mockSignIn,
          isLoaded: true
        }),
        ClerkProvider: ({ children }: any) => children
      }))

      mockSignIn.attemptSecondFactor.mockResolvedValue({
        status: 'complete'
      })

      renderWithClerk(<TwoFactorForm />)

      // Should show strategy selection
      expect(screen.getByText(/choose verification method/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /authenticator app/i })).toBeInTheDocument()

      // Enter TOTP code
      const codeInput = screen.getByLabelText(/authenticator code/i)
      const submitButton = screen.getByRole('button', { name: /verify/i })

      fireEvent.change(codeInput, { target: { value: '123456' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockSignIn.attemptSecondFactor).toHaveBeenCalledWith({
          strategy: 'totp',
          code: '123456'
        })
      })

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should handle SMS verification with resend functionality', async () => {
      const mockSignIn = {
        attemptSecondFactor: vi.fn(),
        prepareSecondFactor: vi.fn(),
        supportedSecondFactors: [
          { strategy: 'sms', phoneNumberId: 'phone_123' }
        ]
      }

      vi.doMock('@clerk/nextjs', () => ({
        useSignIn: () => ({
          signIn: mockSignIn,
          isLoaded: true
        }),
        ClerkProvider: ({ children }: any) => children
      }))

      mockSignIn.attemptSecondFactor.mockResolvedValue({
        status: 'complete'
      })
      mockSignIn.prepareSecondFactor.mockResolvedValue({})

      renderWithClerk(<TwoFactorForm strategy="sms" />)

      // Should show SMS form
      expect(screen.getByLabelText(/sms code/i)).toBeInTheDocument()
      expect(screen.getByText(/check your phone for the 6-digit sms code/i)).toBeInTheDocument()

      // Test resend functionality
      const resendButton = screen.getByRole('button', { name: /resend sms/i })
      fireEvent.click(resendButton)

      await waitFor(() => {
        expect(mockSignIn.prepareSecondFactor).toHaveBeenCalledWith({
          strategy: 'sms',
          phoneNumberId: 'phone_123'
        })
      })

      // Enter SMS code
      const codeInput = screen.getByLabelText(/sms code/i)
      const submitButton = screen.getByRole('button', { name: /verify/i })

      fireEvent.change(codeInput, { target: { value: '654321' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockSignIn.attemptSecondFactor).toHaveBeenCalledWith({
          strategy: 'sms',
          code: '654321'
        })
      })

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should handle backup code verification', async () => {
      const mockSignIn = {
        attemptSecondFactor: vi.fn(),
        supportedSecondFactors: [
          { strategy: 'backup_code' }
        ]
      }

      vi.doMock('@clerk/nextjs', () => ({
        useSignIn: () => ({
          signIn: mockSignIn,
          isLoaded: true
        }),
        ClerkProvider: ({ children }: any) => children
      }))

      mockSignIn.attemptSecondFactor.mockResolvedValue({
        status: 'complete'
      })

      renderWithClerk(<TwoFactorForm strategy="backup_code" />)

      // Should show backup code form
      expect(screen.getByLabelText(/backup code/i)).toBeInTheDocument()
      expect(screen.getByText(/enter one of your backup recovery codes/i)).toBeInTheDocument()

      // Enter backup code
      const codeInput = screen.getByLabelText(/backup code/i)
      const submitButton = screen.getByRole('button', { name: /verify/i })

      fireEvent.change(codeInput, { target: { value: 'abcd1234' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockSignIn.attemptSecondFactor).toHaveBeenCalledWith({
          strategy: 'backup_code',
          code: 'abcd1234'
        })
      })

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })
  })

  describe('2FA Setup Flow', () => {
    it('should handle complete TOTP setup workflow', async () => {
      const mockUser = {
        twoFactorEnabled: false,
        phoneNumbers: [],
        createTOTP: vi.fn(),
        verifyTOTP: vi.fn(),
        createBackupCode: vi.fn()
      }

      vi.doMock('@clerk/nextjs', () => ({
        useUser: () => ({
          user: mockUser,
          isLoaded: true
        }),
        ClerkProvider: ({ children }: any) => children
      }))

      const mockTotpData = {
        secret: 'JBSWY3DPEHPK3PXP',
        uri: 'otpauth://totp/C9d.ai:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=C9d.ai'
      }

      const mockBackupCodes = {
        codes: ['abcd1234', 'efgh5678', 'ijkl9012', 'mnop3456', 'qrst7890']
      }

      mockUser.createTOTP.mockResolvedValue(mockTotpData)
      mockUser.verifyTOTP.mockResolvedValue({})
      mockUser.createBackupCode.mockResolvedValue(mockBackupCodes)

      const onComplete = vi.fn()
      renderWithClerk(<TwoFactorSetup onComplete={onComplete} />)

      // Should show method selection
      expect(screen.getByText(/secure your account/i)).toBeInTheDocument()
      expect(screen.getByText(/authenticator app/i)).toBeInTheDocument()

      // Start TOTP setup
      fireEvent.click(screen.getByText(/authenticator app/i))

      await waitFor(() => {
        expect(mockUser.createTOTP).toHaveBeenCalled()
      })

      // Should show QR code setup
      await waitFor(() => {
        expect(screen.getByText(/setup authenticator app/i)).toBeInTheDocument()
        expect(screen.getByTestId('qr-code')).toBeInTheDocument()
        expect(screen.getByText(mockTotpData.secret)).toBeInTheDocument()
      })

      // Continue to verification
      fireEvent.click(screen.getByRole('button', { name: /i've added the account/i }))

      // Should show verification step
      expect(screen.getByText(/verify authenticator app/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument()

      // Enter verification code
      const codeInput = screen.getByLabelText(/verification code/i)
      const verifyButton = screen.getByRole('button', { name: /verify and continue/i })

      fireEvent.change(codeInput, { target: { value: '123456' } })
      fireEvent.click(verifyButton)

      await waitFor(() => {
        expect(mockUser.verifyTOTP).toHaveBeenCalledWith({ code: '123456' })
      })

      await waitFor(() => {
        expect(mockUser.createBackupCode).toHaveBeenCalled()
      })

      // Should show backup codes
      await waitFor(() => {
        expect(screen.getByText(/save your backup codes/i)).toBeInTheDocument()
        mockBackupCodes.codes.forEach(code => {
          expect(screen.getByText(code)).toBeInTheDocument()
        })
      })

      // Complete setup
      fireEvent.click(screen.getByRole('button', { name: /complete setup/i }))

      await waitFor(() => {
        expect(screen.getByText(/two-factor authentication enabled/i)).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /continue/i }))
      expect(onComplete).toHaveBeenCalled()
    })

    it('should handle SMS setup workflow', async () => {
      const mockUser = {
        twoFactorEnabled: false,
        phoneNumbers: [],
        createPhoneNumber: vi.fn(),
        createBackupCode: vi.fn()
      }

      const mockPhoneNumber = {
        phoneNumber: '+1234567890',
        prepareVerification: vi.fn(),
        attemptVerification: vi.fn()
      }

      vi.doMock('@clerk/nextjs', () => ({
        useUser: () => ({
          user: mockUser,
          isLoaded: true
        }),
        ClerkProvider: ({ children }: any) => children
      }))

      mockUser.createPhoneNumber.mockResolvedValue(mockPhoneNumber)
      mockPhoneNumber.prepareVerification.mockResolvedValue({})
      mockPhoneNumber.attemptVerification.mockResolvedValue({})
      mockUser.createBackupCode.mockResolvedValue({
        codes: ['abcd1234', 'efgh5678']
      })

      renderWithClerk(<TwoFactorSetup />)

      // Start SMS setup
      fireEvent.click(screen.getByText(/sms text message/i))

      // Should show phone number input
      expect(screen.getByText(/setup sms authentication/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()

      // Enter phone number
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
        expect(mockPhoneNumber.prepareVerification).toHaveBeenCalledWith({
          strategy: 'sms'
        })
      })

      // Should show verification step
      await waitFor(() => {
        expect(screen.getByText(/verify phone number/i)).toBeInTheDocument()
        expect(screen.getByText(/enter the 6-digit code sent to \+1234567890/i)).toBeInTheDocument()
      })

      // Enter verification code
      const codeInput = screen.getByLabelText(/verification code/i)
      const verifyButton = screen.getByRole('button', { name: /verify and continue/i })

      fireEvent.change(codeInput, { target: { value: '123456' } })
      fireEvent.click(verifyButton)

      await waitFor(() => {
        expect(mockPhoneNumber.attemptVerification).toHaveBeenCalledWith({
          code: '123456'
        })
      })

      await waitFor(() => {
        expect(mockUser.createBackupCode).toHaveBeenCalled()
      })

      // Should show backup codes
      await waitFor(() => {
        expect(screen.getByText(/save your backup codes/i)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle verification errors gracefully', async () => {
      const mockSignIn = {
        attemptSecondFactor: vi.fn(),
        supportedSecondFactors: [{ strategy: 'totp' }]
      }

      vi.doMock('@clerk/nextjs', () => ({
        useSignIn: () => ({
          signIn: mockSignIn,
          isLoaded: true
        }),
        ClerkProvider: ({ children }: any) => children
      }))

      mockSignIn.attemptSecondFactor.mockRejectedValue({
        errors: [{ code: 'form_code_incorrect', message: 'Invalid code' }]
      })

      renderWithClerk(<TwoFactorForm strategy="totp" />)

      const codeInput = screen.getByLabelText(/authenticator code/i)
      const submitButton = screen.getByRole('button', { name: /verify/i })

      fireEvent.change(codeInput, { target: { value: '000000' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/invalid verification code/i)).toBeInTheDocument()
      })
    })

    it('should handle setup errors gracefully', async () => {
      const mockUser = {
        twoFactorEnabled: false,
        phoneNumbers: [],
        createTOTP: vi.fn()
      }

      vi.doMock('@clerk/nextjs', () => ({
        useUser: () => ({
          user: mockUser,
          isLoaded: true
        }),
        ClerkProvider: ({ children }: any) => children
      }))

      mockUser.createTOTP.mockRejectedValue(new Error('Setup failed'))

      renderWithClerk(<TwoFactorSetup />)

      fireEvent.click(screen.getByText(/authenticator app/i))

      await waitFor(() => {
        expect(screen.getByText(/failed to setup authenticator app/i)).toBeInTheDocument()
      })
    })
  })

  describe('Backup Code Management', () => {
    it('should allow copying and downloading backup codes', async () => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined)
        }
      })

      // Mock URL.createObjectURL
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
      global.URL.revokeObjectURL = vi.fn()

      const mockUser = {
        twoFactorEnabled: false,
        phoneNumbers: [],
        createTOTP: vi.fn(),
        verifyTOTP: vi.fn(),
        createBackupCode: vi.fn()
      }

      vi.doMock('@clerk/nextjs', () => ({
        useUser: () => ({
          user: mockUser,
          isLoaded: true
        }),
        ClerkProvider: ({ children }: any) => children
      }))

      mockUser.createTOTP.mockResolvedValue({
        secret: 'test-secret',
        uri: 'test-uri'
      })
      mockUser.verifyTOTP.mockResolvedValue({})
      mockUser.createBackupCode.mockResolvedValue({
        codes: ['code1', 'code2', 'code3']
      })

      renderWithClerk(<TwoFactorSetup />)

      // Complete TOTP setup to reach backup codes
      fireEvent.click(screen.getByText(/authenticator app/i))
      
      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /i've added the account/i }))
      })

      const codeInput = screen.getByLabelText(/verification code/i)
      fireEvent.change(codeInput, { target: { value: '123456' } })
      fireEvent.click(screen.getByRole('button', { name: /verify and continue/i }))

      // Should show backup codes with copy and download options
      await waitFor(() => {
        expect(screen.getByText(/save your backup codes/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /copy codes/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument()
      })

      // Test copy functionality
      fireEvent.click(screen.getByRole('button', { name: /copy codes/i }))
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('code1\ncode2\ncode3')
        expect(screen.getByText(/copied!/i)).toBeInTheDocument()
      })
    })
  })
})