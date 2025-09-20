/**
 * Test to verify Clerk mocking works correctly
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useSignIn, useAuth } from '@clerk/nextjs'
import React from 'react'

// Simple component to test Clerk hooks
function TestClerkComponent() {
  const { signIn, isLoaded, setActive } = useSignIn()
  const { userId, isSignedIn } = useAuth()

  if (!isLoaded) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <div data-testid="user-id">{userId}</div>
      <div data-testid="is-signed-in">{isSignedIn ? 'true' : 'false'}</div>
      <div data-testid="sign-in-available">{signIn ? 'true' : 'false'}</div>
      <div data-testid="set-active-available">{setActive ? 'true' : 'false'}</div>
    </div>
  )
}

describe('Clerk Mock Verification', () => {
  it('should provide working useSignIn hook', () => {
    render(<TestClerkComponent />)
    
    expect(screen.getByTestId('user-id')).toHaveTextContent('user_test123')
    expect(screen.getByTestId('is-signed-in')).toHaveTextContent('true')
    expect(screen.getByTestId('sign-in-available')).toHaveTextContent('true')
    expect(screen.getByTestId('set-active-available')).toHaveTextContent('true')
  })

  it('should provide working signIn methods', () => {
    const { signIn } = useSignIn()
    
    expect(signIn).toBeDefined()
    expect(signIn.create).toBeDefined()
    expect(signIn.prepareFirstFactor).toBeDefined()
    expect(signIn.attemptFirstFactor).toBeDefined()
  })
})