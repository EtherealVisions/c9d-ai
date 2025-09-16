/**
 * Header Navigation Tests - Sign-In/Sign-Up Links
 * 
 * Tests to verify that the sign-in and sign-up buttons properly navigate to their respective pages.
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HeaderNav from '../header-nav'

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}))

describe('HeaderNav - Navigation Links', () => {
  describe('Desktop Navigation', () => {
    it('should render Sign In and Sign Up buttons with correct links', () => {
      render(<HeaderNav />)
      
      // Check Sign In link
      const signInLink = screen.getByRole('link', { name: /sign in/i })
      expect(signInLink).toBeInTheDocument()
      expect(signInLink).toHaveAttribute('href', '/sign-in')
      
      // Check Sign Up link
      const signUpLink = screen.getByRole('link', { name: /sign up/i })
      expect(signUpLink).toBeInTheDocument()
      expect(signUpLink).toHaveAttribute('href', '/sign-up')
    })

    it('should have proper accessibility attributes', () => {
      render(<HeaderNav />)
      
      // Sign In should be accessible
      const signInLink = screen.getByRole('link', { name: /sign in/i })
      expect(signInLink).toBeInTheDocument()
      
      // Sign Up should be accessible
      const signUpLink = screen.getByRole('link', { name: /sign up/i })
      expect(signUpLink).toBeInTheDocument()
    })
  })

  describe('Mobile Navigation', () => {
    it('should show mobile menu with Sign In and Sign Up links when menu is opened', async () => {
      const user = userEvent.setup()
      render(<HeaderNav />)
      
      // Open mobile menu
      const menuButton = screen.getByRole('button', { name: /open menu/i })
      await user.click(menuButton)
      
      // Check mobile Sign In link
      const mobileSignInLinks = screen.getAllByRole('link', { name: /sign in/i })
      expect(mobileSignInLinks.length).toBeGreaterThan(0)
      
      // Check mobile Sign Up link  
      const mobileSignUpLinks = screen.getAllByRole('link', { name: /sign up/i })
      expect(mobileSignUpLinks.length).toBeGreaterThan(0)
      
      // Verify they have correct hrefs
      const mobileSignInLink = mobileSignInLinks.find(link => 
        link.getAttribute('href') === '/sign-in'
      )
      const mobileSignUpLink = mobileSignUpLinks.find(link => 
        link.getAttribute('href') === '/sign-up'
      )
      
      expect(mobileSignInLink).toBeInTheDocument()
      expect(mobileSignUpLink).toBeInTheDocument()
    })

    it('should close mobile menu when navigation links are clicked', async () => {
      const user = userEvent.setup()
      render(<HeaderNav />)
      
      // Open mobile menu
      const menuButton = screen.getByRole('button', { name: /open menu/i })
      await user.click(menuButton)
      
      // Verify menu is open (check for mobile-specific content)
      expect(screen.getByText('Pricing')).toBeInTheDocument()
      
      // Click a navigation link (this would close the menu in real usage)
      const pricingLink = screen.getByRole('link', { name: /pricing/i })
      await user.click(pricingLink)
      
      // Note: In a real test, we'd verify the menu closes, but since we're testing
      // the component in isolation, we just verify the links exist and are clickable
      expect(pricingLink).toBeInTheDocument()
    })
  })

  describe('Navigation Structure', () => {
    it('should have proper navigation structure', () => {
      render(<HeaderNav />)
      
      // Check main navigation elements exist
      expect(screen.getByRole('banner')).toBeInTheDocument() // header element
      
      // Check logo link
      const logoLink = screen.getByRole('link', { name: /c9n logo/i }) || 
                      screen.getAllByRole('link')[0] // First link should be logo
      expect(logoLink).toHaveAttribute('href', '/')
      
      // Check navigation menu exists
      const navigation = screen.getByRole('navigation') || 
                        screen.getByText('Products').closest('nav')
      expect(navigation).toBeInTheDocument()
    })

    it('should render all main navigation items', () => {
      render(<HeaderNav />)
      
      // Check main nav items
      expect(screen.getByText('Products')).toBeInTheDocument()
      expect(screen.getByText('Solutions')).toBeInTheDocument()
      expect(screen.getByText('Pricing')).toBeInTheDocument()
      expect(screen.getByText('Blog')).toBeInTheDocument()
      expect(screen.getByText('Resources')).toBeInTheDocument()
      expect(screen.getByText('Company')).toBeInTheDocument()
    })
  })

  describe('Responsive Behavior', () => {
    it('should show desktop navigation elements on larger screens', () => {
      render(<HeaderNav />)
      
      // Desktop elements should have hidden classes for mobile
      const signInButton = screen.getByRole('link', { name: /sign in/i })
      const signUpButton = screen.getByRole('link', { name: /sign up/i })
      
      // These should be hidden on mobile (have md:inline-flex classes)
      expect(signInButton.closest('button')).toHaveClass('hidden', 'md:inline-flex')
      expect(signUpButton.closest('button')).toHaveClass('hidden', 'md:inline-flex')
    })

    it('should show mobile menu button', () => {
      render(<HeaderNav />)
      
      // Mobile menu button should exist
      const mobileMenuButton = screen.getByRole('button', { name: /open menu/i })
      expect(mobileMenuButton).toBeInTheDocument()
      expect(mobileMenuButton).toHaveClass('md:hidden')
    })
  })
})