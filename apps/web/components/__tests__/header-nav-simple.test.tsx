/**
 * Simple Header Navigation Test
 * 
 * Basic test to verify sign-in and sign-up links are properly configured.
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import HeaderNav from '../header-nav'

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}))

// Mock the icons component
vi.mock('../icons', () => ({
  C9DLogo: ({ className }: any) => <div className={className}>Logo</div>
}))

describe('HeaderNav - Simple Navigation Test', () => {
  it('should render with sign-in and sign-up links', () => {
    render(<HeaderNav />)
    
    // Check that the component renders without crashing
    expect(screen.getByText('Logo')).toBeInTheDocument()
    
    // Check for Sign Up text (should be present in both desktop and mobile)
    expect(screen.getByText('Sign Up')).toBeInTheDocument()
    
    // Check for Sign In text
    expect(screen.getByText('Sign In')).toBeInTheDocument()
  })

  it('should have navigation links with correct hrefs', () => {
    render(<HeaderNav />)
    
    // Get all links and check for sign-in and sign-up
    const links = screen.getAllByRole('link')
    
    const signInLink = links.find(link => link.getAttribute('href') === '/sign-in')
    const signUpLink = links.find(link => link.getAttribute('href') === '/sign-up')
    
    expect(signInLink).toBeInTheDocument()
    expect(signUpLink).toBeInTheDocument()
  })
})