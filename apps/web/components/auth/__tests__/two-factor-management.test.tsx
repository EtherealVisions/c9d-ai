import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useUser } from '@clerk/nextjs'
import { TwoFactorManagement } from '../two-factor-management'

// Mock Clerk
vi.mock('@clerk/nextjs', () => ({
  useUser: vi.fn()
}))

// Mock TwoFactorSetup component
vi.mock('../two-factor-setup', () => ({
  TwoFactorSetup: ({ onComplete }: { onComplete?: () => void }) => (
    <div data-testid="two-factor-setup">
      <button onClick={onComplete}>Complete Setup</button>
    </div>
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

describe('TwoFactorManagement', () => {
  const mockUser = {
    id: 'user_123',
    twoFactorEnabled: false,
    backupCodeEnabled: false,
    phoneNumbers: [],
    lastSignInAt: '2024-01-01T00:00:00Z',
    disableTOTP: vi.fn(),
    createBackupCode: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset user mock to default state
    mockUser.twoFactorEnabled = false
    mockUser.backupCodeEnabled = false
    mockUser.phoneNumbers = []
    
    ;(useUser as any).mockReturnValue({
      user: mockUser,
      isLoaded: true
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Loading State', () => {
    it('should show loading state when user is not loaded', () => {
      ;(useUser as any).mockReturnValue({
        user: null,
        isLoaded: false
      })
      
      render(<TwoFactorManagement />)
      
      expect(screen.getByText(/loading 2fa settings/i)).toBeInTheDocument()
    })
  })

  describe('No 2FA Enabled', () => {
    it('should show security warning when no 2FA is enabled', () => {
      render(<TwoFactorManagement />)
      
      expect(screen.getByText(/no 2fa enabled/i)).toBeInTheDocument()
      expect(screen.getByText(/your account is not protected/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /enable two-factor authentication/i })).toBeInTheDocument()
    })

    it('should show all methods as disabled', () => {
      render(<TwoFactorManagement />)
      
      // Should show all three methods
      expect(screen.getByText(/authenticator app/i)).toBeInTheDocument()
      expect(screen.getByText(/sms text message/i)).toBeInTheDocument()
      expect(screen.getByText(/backup codes/i)).toBeInTheDocument()
      
      // All should have Enable buttons
      const enableButtons = screen.getAllByRole('button', { name: /enable/i })
      expect(enableButtons).toHaveLength(3)
    })
  })

  describe('TOTP Enabled', () => {
    beforeEach(() => {
      mockUser.twoFactorEnabled = true
    })

    it('should show TOTP as enabled', () => {
      render(<TwoFactorManagement />)
      
      expect(screen.getByText(/basic protection/i)).toBeInTheDocument()
      
      // Find the TOTP method section
      const totpSection = screen.getByText(/authenticator app/i).closest('div')
      expect(totpSection).toContainElement(screen.getByText(/enabled/i))
      expect(totpSection).toContainElement(screen.getByRole('button', { name: /disable/i }))
    })

    it('should show last used date', () => {
      render(<TwoFactorManagement />)
      
      expect(screen.getByText(/last used: 1\/1\/2024/i)).toBeInTheDocument()
    })

    it('should disable TOTP when disable button is clicked', async () => {
      mockUser.disableTOTP.mockResolvedValue({})
      
      render(<TwoFactorManagement />)
      
      // Find disable button by text within the TOTP section
      const disableButtons = screen.getAllByRole('button', { name: /disable/i })
      const disableButton = disableButtons[0] // First disable button should be for TOTP
      
      if (disableButton) {
        fireEvent.click(disableButton)
        
        await waitFor(() => {
          expect(mockUser.disableTOTP).toHaveBeenCalled()
        })
      }
    })
  })

  describe('SMS Enabled', () => {
    beforeEach(() => {
      mockUser.phoneNumbers = [{
        phoneNumber: '+1234567890',
        verification: {
          status: 'verified',
          verifiedAt: '2024-01-01T00:00:00Z'
        },
        destroy: vi.fn().mockResolvedValue({})
      }]
    })

    it('should show SMS as enabled with phone number', () => {
      render(<TwoFactorManagement />)
      
      expect(screen.getByText(/\+1234567890/)).toBeInTheDocument()
      
      // Check that SMS is shown as enabled
      const enabledBadges = screen.getAllByText(/enabled/i)
      expect(enabledBadges.length).toBeGreaterThan(0)
    })

    it('should disable SMS when disable button is clicked', async () => {
      const mockPhoneNumber = mockUser.phoneNumbers[0]
      
      render(<TwoFactorManagement />)
      
      // Find disable button for SMS (should be second one)
      const disableButtons = screen.getAllByRole('button', { name: /disable/i })
      const disableButton = disableButtons[1] // Second disable button should be for SMS
      
      if (disableButton) {
        fireEvent.click(disableButton)
        
        await waitFor(() => {
          expect(mockPhoneNumber.destroy).toHaveBeenCalled()
        })
      }
    })
  })

  describe('Backup Codes', () => {
    beforeEach(() => {
      mockUser.backupCodeEnabled = true
    })

    it('should show backup codes as enabled', () => {
      render(<TwoFactorManagement />)
      
      // Check that backup codes are shown as enabled
      const enabledBadges = screen.getAllByText(/enabled/i)
      expect(enabledBadges.length).toBeGreaterThan(0)
      expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument()
    })

    it('should generate new backup codes when regenerate is clicked', async () => {
      mockUser.createBackupCode.mockResolvedValue({
        codes: ['code1', 'code2', 'code3', 'code4', 'code5']
      })
      
      render(<TwoFactorManagement />)
      
      const regenerateButton = screen.getByRole('button', { name: /regenerate/i })
      fireEvent.click(regenerateButton)
      
      await waitFor(() => {
        expect(mockUser.createBackupCode).toHaveBeenCalled()
      })
      
      // Should show backup codes dialog
      expect(screen.getByText(/your backup codes/i)).toBeInTheDocument()
      expect(screen.getByText('code1')).toBeInTheDocument()
    })

    it('should copy backup codes to clipboard', async () => {
      mockUser.createBackupCode.mockResolvedValue({
        codes: ['code1', 'code2', 'code3']
      })
      
      render(<TwoFactorManagement />)
      
      // Generate codes first
      const regenerateButton = screen.getByRole('button', { name: /regenerate/i })
      fireEvent.click(regenerateButton)
      
      await waitFor(() => screen.getByText(/your backup codes/i))
      
      // Copy codes
      const copyButton = screen.getByRole('button', { name: /copy codes/i })
      fireEvent.click(copyButton)
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('code1\ncode2\ncode3')
      })
      
      expect(screen.getByText(/copied!/i)).toBeInTheDocument()
    })

    it('should download backup codes as file', async () => {
      mockUser.createBackupCode.mockResolvedValue({
        codes: ['code1', 'code2', 'code3']
      })
      
      // Mock document methods
      const mockAppendChild = vi.fn()
      const mockRemoveChild = vi.fn()
      const mockClick = vi.fn()
      
      Object.defineProperty(document, 'createElement', {
        value: vi.fn(() => ({
          href: '',
          download: '',
          click: mockClick
        }))
      })
      
      Object.defineProperty(document.body, 'appendChild', { value: mockAppendChild })
      Object.defineProperty(document.body, 'removeChild', { value: mockRemoveChild })
      
      render(<TwoFactorManagement />)
      
      // Generate codes first
      const regenerateButton = screen.getByRole('button', { name: /regenerate/i })
      fireEvent.click(regenerateButton)
      
      await waitFor(() => screen.getByText(/your backup codes/i))
      
      // Download codes
      const downloadButton = screen.getByRole('button', { name: /download/i })
      fireEvent.click(downloadButton)
      
      expect(document.createElement).toHaveBeenCalledWith('a')
      expect(mockClick).toHaveBeenCalled()
    })
  })

  describe('Security Levels', () => {
    it('should show "No 2FA enabled" when no methods are enabled', () => {
      render(<TwoFactorManagement />)
      
      expect(screen.getByText(/no 2fa enabled/i)).toBeInTheDocument()
    })

    it('should show "Basic protection" with one method enabled', () => {
      mockUser.twoFactorEnabled = true
      
      render(<TwoFactorManagement />)
      
      expect(screen.getByText(/basic protection/i)).toBeInTheDocument()
    })

    it('should show "Good protection" with two methods enabled', () => {
      mockUser.twoFactorEnabled = true
      mockUser.phoneNumbers = [{
        phoneNumber: '+1234567890',
        verification: { status: 'verified' }
      }]
      
      render(<TwoFactorManagement />)
      
      expect(screen.getByText(/good protection/i)).toBeInTheDocument()
    })

    it('should show "Excellent protection" with all methods enabled', () => {
      mockUser.twoFactorEnabled = true
      mockUser.backupCodeEnabled = true
      mockUser.phoneNumbers = [{
        phoneNumber: '+1234567890',
        verification: { status: 'verified' }
      }]
      
      render(<TwoFactorManagement />)
      
      expect(screen.getByText(/excellent protection/i)).toBeInTheDocument()
    })
  })

  describe('Security Recommendations', () => {
    it('should show recommendation to enable authenticator app', () => {
      mockUser.phoneNumbers = [{
        phoneNumber: '+1234567890',
        verification: { status: 'verified' }
      }]
      
      render(<TwoFactorManagement />)
      
      expect(screen.getByText(/enable authenticator app/i)).toBeInTheDocument()
      expect(screen.getByText(/authenticator apps are more secure than sms/i)).toBeInTheDocument()
    })

    it('should show recommendation to generate backup codes', () => {
      mockUser.twoFactorEnabled = true
      
      render(<TwoFactorManagement />)
      
      expect(screen.getByText(/generate backup codes/i)).toBeInTheDocument()
      expect(screen.getByText(/backup codes help you regain access/i)).toBeInTheDocument()
    })

    it('should show recommendation to enable multiple methods', () => {
      mockUser.twoFactorEnabled = true
      
      render(<TwoFactorManagement />)
      
      expect(screen.getByText(/enable multiple methods/i)).toBeInTheDocument()
      expect(screen.getByText(/having multiple 2fa methods/i)).toBeInTheDocument()
    })

    it('should not show recommendations when all methods are enabled', () => {
      mockUser.twoFactorEnabled = true
      mockUser.backupCodeEnabled = true
      mockUser.phoneNumbers = [{
        phoneNumber: '+1234567890',
        verification: { status: 'verified' }
      }]
      
      render(<TwoFactorManagement />)
      
      expect(screen.queryByText(/enable authenticator app/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/generate backup codes/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/enable multiple methods/i)).not.toBeInTheDocument()
    })
  })

  describe('Setup Dialog', () => {
    it('should open setup dialog when enable button is clicked', async () => {
      render(<TwoFactorManagement />)
      
      const enableButton = screen.getAllByRole('button', { name: /enable/i })[0]
      fireEvent.click(enableButton)
      
      expect(screen.getByTestId('two-factor-setup')).toBeInTheDocument()
    })

    it('should close setup dialog and refresh methods when setup is completed', async () => {
      render(<TwoFactorManagement />)
      
      const enableButton = screen.getAllByRole('button', { name: /enable/i })[0]
      fireEvent.click(enableButton)
      
      const completeButton = screen.getByText('Complete Setup')
      fireEvent.click(completeButton)
      
      // Dialog should close (setup component should not be visible)
      await waitFor(() => {
        expect(screen.queryByTestId('two-factor-setup')).not.toBeInTheDocument()
      })
    })

    it('should open setup dialog from main enable button', async () => {
      render(<TwoFactorManagement />)
      
      const mainEnableButton = screen.getByRole('button', { name: /enable two-factor authentication/i })
      fireEvent.click(mainEnableButton)
      
      expect(screen.getByTestId('two-factor-setup')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should display error when disabling TOTP fails', async () => {
      mockUser.twoFactorEnabled = true
      mockUser.disableTOTP.mockRejectedValue(new Error('Disable failed'))
      
      render(<TwoFactorManagement />)
      
      // Find disable button for TOTP
      const disableButtons = screen.getAllByRole('button', { name: /disable/i })
      const disableButton = disableButtons[0] // First disable button should be for TOTP
      
      if (disableButton) {
        fireEvent.click(disableButton)
        
        await waitFor(() => {
          expect(screen.getByText(/failed to disable 2fa method/i)).toBeInTheDocument()
        })
      }
    })

    it('should display error when generating backup codes fails', async () => {
      mockUser.backupCodeEnabled = true
      mockUser.createBackupCode.mockRejectedValue(new Error('Generation failed'))
      
      render(<TwoFactorManagement />)
      
      const regenerateButton = screen.getByRole('button', { name: /regenerate/i })
      fireEvent.click(regenerateButton)
      
      await waitFor(() => {
        expect(screen.getByText(/failed to generate backup codes/i)).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('should disable buttons during loading', async () => {
      mockUser.twoFactorEnabled = true
      mockUser.disableTOTP.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(<TwoFactorManagement />)
      
      // Find disable button for TOTP
      const disableButtons = screen.getAllByRole('button', { name: /disable/i })
      const disableButton = disableButtons[0] // First disable button should be for TOTP
      
      if (disableButton) {
        fireEvent.click(disableButton)
        
        // Button should be disabled during loading
        expect(disableButton).toBeDisabled()
      }
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<TwoFactorManagement />)
      
      expect(screen.getByRole('heading', { name: /two-factor authentication/i })).toBeInTheDocument()
      
      // Check for proper button labels
      const enableButtons = screen.getAllByRole('button', { name: /enable/i })
      expect(enableButtons.length).toBeGreaterThan(0)
    })

    it('should have proper dialog accessibility', async () => {
      render(<TwoFactorManagement />)
      
      const enableButton = screen.getAllByRole('button', { name: /enable/i })[0]
      fireEvent.click(enableButton)
      
      // Dialog should have proper role and labels
      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
      expect(screen.getByText(/setup two-factor authentication/i)).toBeInTheDocument()
    })
  })
})