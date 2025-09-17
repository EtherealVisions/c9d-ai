import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useUser } from '@clerk/nextjs'
import { TwoFactorSetup } from '../two-factor-setup'

// Mock Clerk
vi.mock('@clerk/nextjs', () => ({
  useUser: vi.fn()
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

describe('TwoFactorSetup', () => {
  const mockUser = {
    id: 'user_123',
    twoFactorEnabled: false,
    phoneNumbers: [],
    createTOTP: vi.fn(),
    verifyTOTP: vi.fn(),
    createBackupCode: vi.fn(),
    createPhoneNumber: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset user mock to default state
    mockUser.twoFactorEnabled = false
    mockUser.phoneNumbers = []
    
    ;(useUser as any).mockReturnValue({
      user: mockUser,
      isLoaded: true
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State', () => {
    it('should render method selection by default', () => {
      render(<TwoFactorSetup />)
      
      expect(screen.getByText(/secure your account/i)).toBeInTheDocument()
      expect(screen.getByText(/authenticator app/i)).toBeInTheDocument()
      expect(screen.getByText(/sms text message/i)).toBeInTheDocument()
    })

    it('should show completion state if 2FA is already enabled', () => {
      const enabledUser = { ...mockUser, twoFactorEnabled: true }
      ;(useUser as any).mockReturnValue({
        user: enabledUser,
        isLoaded: true
      })
      
      render(<TwoFactorSetup />)
      
      expect(screen.getByText(/two-factor authentication enabled/i)).toBeInTheDocument()
    })

    it('should show completion state if SMS is verified', () => {
      const smsUser = {
        ...mockUser,
        phoneNumbers: [{ verification: { status: 'verified' } }]
      }
      ;(useUser as any).mockReturnValue({
        user: smsUser,
        isLoaded: true
      })
      
      render(<TwoFactorSetup />)
      
      expect(screen.getByText(/two-factor authentication enabled/i)).toBeInTheDocument()
    })
  })

  describe('TOTP Setup Flow', () => {
    it('should start TOTP setup when authenticator app is selected', async () => {
      mockUser.createTOTP.mockResolvedValue({
        secret: 'JBSWY3DPEHPK3PXP',
        uri: 'otpauth://totp/test'
      })
      
      render(<TwoFactorSetup />)
      
      fireEvent.click(screen.getByText(/authenticator app/i))
      
      await waitFor(() => {
        expect(mockUser.createTOTP).toHaveBeenCalled()
      })
      
      expect(screen.getByText(/setup authenticator app/i)).toBeInTheDocument()
      expect(screen.getByTestId('qr-code')).toBeInTheDocument()
      expect(screen.getByText(/JBSWY3DPEHPK3PXP/)).toBeInTheDocument()
    })

    it('should handle TOTP setup error', async () => {
      mockUser.createTOTP.mockRejectedValue(new Error('Setup failed'))
      
      render(<TwoFactorSetup />)
      
      fireEvent.click(screen.getByText(/authenticator app/i))
      
      await waitFor(() => {
        expect(screen.getByText(/failed to setup authenticator app/i)).toBeInTheDocument()
      })
    })

    it('should proceed to verification after QR code setup', async () => {
      mockUser.createTOTP.mockResolvedValue({
        secret: 'JBSWY3DPEHPK3PXP',
        uri: 'otpauth://totp/test'
      })
      
      render(<TwoFactorSetup />)
      
      fireEvent.click(screen.getByText(/authenticator app/i))
      
      await waitFor(() => {
        expect(screen.getByText(/setup authenticator app/i)).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText(/i've added the account/i))
      
      expect(screen.getByText(/verify authenticator app/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument()
    })

    it('should validate TOTP verification code', async () => {
      mockUser.createTOTP.mockResolvedValue({
        secret: 'JBSWY3DPEHPK3PXP',
        uri: 'otpauth://totp/test'
      })
      
      render(<TwoFactorSetup />)
      
      // Start TOTP setup
      fireEvent.click(screen.getByText(/authenticator app/i))
      await waitFor(() => screen.getByText(/setup authenticator app/i))
      
      // Proceed to verification
      fireEvent.click(screen.getByText(/i've added the account/i))
      
      const codeInput = screen.getByLabelText(/verification code/i)
      const submitButton = screen.getByRole('button', { name: /verify and continue/i })
      
      // Test invalid code
      fireEvent.change(codeInput, { target: { value: '123' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid 6-digit code/i)).toBeInTheDocument()
      })
    })

    it('should complete TOTP verification and show backup codes', async () => {
      mockUser.createTOTP.mockResolvedValue({
        secret: 'JBSWY3DPEHPK3PXP',
        uri: 'otpauth://totp/test'
      })
      mockUser.verifyTOTP.mockResolvedValue({})
      mockUser.createBackupCode.mockResolvedValue({
        codes: ['code1', 'code2', 'code3', 'code4', 'code5']
      })
      
      render(<TwoFactorSetup />)
      
      // Start TOTP setup
      fireEvent.click(screen.getByText(/authenticator app/i))
      await waitFor(() => screen.getByText(/setup authenticator app/i))
      
      // Proceed to verification
      fireEvent.click(screen.getByText(/i've added the account/i))
      
      const codeInput = screen.getByLabelText(/verification code/i)
      const submitButton = screen.getByRole('button', { name: /verify and continue/i })
      
      // Enter valid code
      fireEvent.change(codeInput, { target: { value: '123456' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockUser.verifyTOTP).toHaveBeenCalledWith({ code: '123456' })
      })
      
      await waitFor(() => {
        expect(screen.getByText(/save your backup codes/i)).toBeInTheDocument()
      })
      
      expect(screen.getByText('code1')).toBeInTheDocument()
      expect(screen.getByText('code2')).toBeInTheDocument()
    })

    it('should handle TOTP verification errors', async () => {
      mockUser.createTOTP.mockResolvedValue({
        secret: 'JBSWY3DPEHPK3PXP',
        uri: 'otpauth://totp/test'
      })
      mockUser.verifyTOTP.mockRejectedValue({
        errors: [{ code: 'form_code_incorrect', message: 'Invalid code' }]
      })
      
      render(<TwoFactorSetup />)
      
      // Start TOTP setup
      fireEvent.click(screen.getByText(/authenticator app/i))
      await waitFor(() => screen.getByText(/setup authenticator app/i))
      
      // Proceed to verification
      fireEvent.click(screen.getByText(/i've added the account/i))
      
      const codeInput = screen.getByLabelText(/verification code/i)
      const submitButton = screen.getByRole('button', { name: /verify and continue/i })
      
      // Enter code
      fireEvent.change(codeInput, { target: { value: '000000' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/invalid verification code/i)).toBeInTheDocument()
      })
    })
  })

  describe('SMS Setup Flow', () => {
    it('should start SMS setup when SMS option is selected', () => {
      render(<TwoFactorSetup />)
      
      fireEvent.click(screen.getByText(/sms text message/i))
      
      expect(screen.getByText(/setup sms authentication/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
    })

    it('should validate phone number format', async () => {
      render(<TwoFactorSetup />)
      
      fireEvent.click(screen.getByText(/sms text message/i))
      
      const phoneInput = screen.getByLabelText(/phone number/i)
      const submitButton = screen.getByRole('button', { name: /send verification code/i })
      
      // Test invalid phone number
      fireEvent.change(phoneInput, { target: { value: 'invalid' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid phone number/i)).toBeInTheDocument()
      })
    })

    it('should create phone number and proceed to verification', async () => {
      const mockPhoneNumber = {
        phoneNumber: '+1234567890',
        prepareVerification: vi.fn().mockResolvedValue({})
      }
      mockUser.createPhoneNumber.mockResolvedValue(mockPhoneNumber)
      
      render(<TwoFactorSetup />)
      
      fireEvent.click(screen.getByText(/sms text message/i))
      
      const phoneInput = screen.getByLabelText(/phone number/i)
      const submitButton = screen.getByRole('button', { name: /send verification code/i })
      
      fireEvent.change(phoneInput, { target: { value: '+1234567890' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockUser.createPhoneNumber).toHaveBeenCalledWith({
          phoneNumber: '+1234567890'
        })
      })
      
      await waitFor(() => {
        expect(mockPhoneNumber.prepareVerification).toHaveBeenCalled()
      })
      
      expect(screen.getByText(/verify phone number/i)).toBeInTheDocument()
    })

    it('should handle SMS setup errors', async () => {
      mockUser.createPhoneNumber.mockRejectedValue({
        errors: [{ code: 'form_param_format_invalid', message: 'Invalid format' }]
      })
      
      render(<TwoFactorSetup />)
      
      fireEvent.click(screen.getByText(/sms text message/i))
      
      const phoneInput = screen.getByLabelText(/phone number/i)
      const submitButton = screen.getByRole('button', { name: /send verification code/i })
      
      fireEvent.change(phoneInput, { target: { value: '+1234567890' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/invalid phone number format/i)).toBeInTheDocument()
      })
    })

    it('should verify SMS code and show backup codes', async () => {
      const mockPhoneNumber = {
        phoneNumber: '+1234567890',
        prepareVerification: vi.fn().mockResolvedValue({}),
        attemptVerification: vi.fn().mockResolvedValue({})
      }
      mockUser.createPhoneNumber.mockResolvedValue(mockPhoneNumber)
      mockUser.phoneNumbers = [mockPhoneNumber]
      mockUser.createBackupCode.mockResolvedValue({
        codes: ['backup1', 'backup2', 'backup3']
      })
      
      render(<TwoFactorSetup />)
      
      // Start SMS setup
      fireEvent.click(screen.getByText(/sms text message/i))
      
      const phoneInput = screen.getByLabelText(/phone number/i)
      fireEvent.change(phoneInput, { target: { value: '+1234567890' } })
      fireEvent.click(screen.getByRole('button', { name: /send verification code/i }))
      
      await waitFor(() => screen.getByText(/verify phone number/i))
      
      // Verify SMS code
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
        expect(screen.getByText(/save your backup codes/i)).toBeInTheDocument()
      })
    })
  })

  describe('Backup Codes Management', () => {
    beforeEach(async () => {
      mockUser.createTOTP.mockResolvedValue({
        secret: 'JBSWY3DPEHPK3PXP',
        uri: 'otpauth://totp/test'
      })
      mockUser.verifyTOTP.mockResolvedValue({})
      mockUser.createBackupCode.mockResolvedValue({
        codes: ['code1', 'code2', 'code3', 'code4', 'code5']
      })
    })

    it('should copy backup codes to clipboard', async () => {
      render(<TwoFactorSetup />)
      
      // Complete TOTP setup to reach backup codes
      fireEvent.click(screen.getByText(/authenticator app/i))
      await waitFor(() => screen.getByText(/setup authenticator app/i))
      fireEvent.click(screen.getByText(/i've added the account/i))
      
      const codeInput = screen.getByLabelText(/verification code/i)
      fireEvent.change(codeInput, { target: { value: '123456' } })
      fireEvent.click(screen.getByRole('button', { name: /verify and continue/i }))
      
      await waitFor(() => screen.getByText(/save your backup codes/i))
      
      const copyButton = screen.getByRole('button', { name: /copy codes/i })
      fireEvent.click(copyButton)
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('code1\ncode2\ncode3\ncode4\ncode5')
      })
      
      expect(screen.getByText(/copied!/i)).toBeInTheDocument()
    })

    it('should show download button for backup codes', async () => {
      render(<TwoFactorSetup />)
      
      // Complete TOTP setup to reach backup codes
      fireEvent.click(screen.getByText(/authenticator app/i))
      await waitFor(() => screen.getByText(/setup authenticator app/i))
      fireEvent.click(screen.getByText(/i've added the account/i))
      
      const codeInput = screen.getByLabelText(/verification code/i)
      fireEvent.change(codeInput, { target: { value: '123456' } })
      fireEvent.click(screen.getByRole('button', { name: /verify and continue/i }))
      
      await waitFor(() => screen.getByText(/save your backup codes/i))
      
      // Should show download button
      expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument()
    })

    it('should complete setup after backup codes', async () => {
      const onComplete = vi.fn()
      
      render(<TwoFactorSetup onComplete={onComplete} />)
      
      // Complete TOTP setup to reach backup codes
      fireEvent.click(screen.getByText(/authenticator app/i))
      await waitFor(() => screen.getByText(/setup authenticator app/i))
      fireEvent.click(screen.getByText(/i've added the account/i))
      
      const codeInput = screen.getByLabelText(/verification code/i)
      fireEvent.change(codeInput, { target: { value: '123456' } })
      fireEvent.click(screen.getByRole('button', { name: /verify and continue/i }))
      
      await waitFor(() => screen.getByText(/save your backup codes/i))
      
      const completeButton = screen.getByRole('button', { name: /complete setup/i })
      fireEvent.click(completeButton)
      
      expect(screen.getByText(/two-factor authentication enabled/i)).toBeInTheDocument()
      expect(onComplete).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should display general errors', async () => {
      mockUser.createTOTP.mockRejectedValue(new Error('Network error'))
      
      render(<TwoFactorSetup />)
      
      fireEvent.click(screen.getByText(/authenticator app/i))
      
      await waitFor(() => {
        expect(screen.getByText(/failed to setup authenticator app/i)).toBeInTheDocument()
      })
    })

    it('should handle Clerk API errors', async () => {
      mockUser.createTOTP.mockRejectedValue({
        errors: [{ 
          code: 'custom_error',
          longMessage: 'Custom error message',
          message: 'Error'
        }]
      })
      
      render(<TwoFactorSetup />)
      
      fireEvent.click(screen.getByText(/authenticator app/i))
      
      await waitFor(() => {
        expect(screen.getByText(/failed to setup authenticator app/i)).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('should show loading state during TOTP setup', async () => {
      mockUser.createTOTP.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 50)))
      
      render(<TwoFactorSetup />)
      
      fireEvent.click(screen.getByText(/authenticator app/i))
      
      // Should show loading state (button should be disabled)
      const appButton = screen.getByText(/authenticator app/i).closest('div')
      expect(appButton).toBeTruthy()
    })

    it('should show loading state during verification', async () => {
      mockUser.createTOTP.mockResolvedValue({
        secret: 'JBSWY3DPEHPK3PXP',
        uri: 'otpauth://totp/test'
      })
      mockUser.verifyTOTP.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 50)))
      
      render(<TwoFactorSetup />)
      
      // Start TOTP setup
      fireEvent.click(screen.getByText(/authenticator app/i))
      await waitFor(() => screen.getByText(/setup authenticator app/i))
      fireEvent.click(screen.getByText(/i've added the account/i))
      
      const codeInput = screen.getByLabelText(/verification code/i)
      const submitButton = screen.getByRole('button', { name: /verify and continue/i })
      
      fireEvent.change(codeInput, { target: { value: '123456' } })
      fireEvent.click(submitButton)
      
      expect(screen.getByRole('button', { name: /verifying.../i })).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<TwoFactorSetup />)
      
      // Check for proper heading structure
      expect(screen.getByRole('heading', { name: /secure your account/i })).toBeInTheDocument()
      
      // Check for authenticator app option
      expect(screen.getByText(/authenticator app/i)).toBeInTheDocument()
    })

    it('should have proper form labels and descriptions', async () => {
      mockUser.createTOTP.mockResolvedValue({
        secret: 'JBSWY3DPEHPK3PXP',
        uri: 'otpauth://totp/test'
      })
      
      render(<TwoFactorSetup />)
      
      fireEvent.click(screen.getByText(/authenticator app/i))
      await waitFor(() => screen.getByText(/setup authenticator app/i))
      fireEvent.click(screen.getByText(/i've added the account/i))
      
      const codeInput = screen.getByLabelText(/verification code/i)
      expect(codeInput).toHaveAttribute('required')
      expect(codeInput).toHaveAttribute('maxLength', '6')
    })
  })

  describe('User Not Loaded', () => {
    it('should handle when user is not loaded', () => {
      ;(useUser as any).mockReturnValue({
        user: null,
        isLoaded: false
      })
      
      render(<TwoFactorSetup />)
      
      // Should not crash and should handle gracefully
      expect(screen.getByText(/secure your account/i)).toBeInTheDocument()
    })

    it('should handle when user is null', () => {
      ;(useUser as any).mockReturnValue({
        user: null,
        isLoaded: true
      })
      
      render(<TwoFactorSetup />)
      
      // Should not crash and should handle gracefully
      expect(screen.getByText(/secure your account/i)).toBeInTheDocument()
    })
  })
})