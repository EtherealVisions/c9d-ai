'use client'

import React from 'react'
import { AccessibleInput, AccessibleButton, AccessibleCheckbox, SkipLink } from '@/components/ui/accessible-form'

/**
 * Demonstration component showing accessibility features
 * This component showcases the comprehensive accessibility support implemented
 */
export function AccessibilityDemo() {
  const [formData, setFormData] = React.useState({
    email: '',
    password: '',
    rememberMe: false
  })
  
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Simple validation for demo
    const newErrors: Record<string, string> = {}
    
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }
    
    setErrors(newErrors)
    
    if (Object.keys(newErrors).length === 0) {
      alert('Form submitted successfully! (This is just a demo)')
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Skip Link */}
      <SkipLink href="#demo-form">
        Skip to demo form
      </SkipLink>

      {/* Heading */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Accessibility Demo
        </h1>
        <p className="text-gray-600">
          This form demonstrates comprehensive accessibility features including:
        </p>
        <ul className="mt-2 text-sm text-gray-500 list-disc list-inside">
          <li>ARIA labels and descriptions</li>
          <li>Keyboard navigation support</li>
          <li>Screen reader announcements</li>
          <li>Error associations</li>
          <li>Touch-friendly targets</li>
          <li>High contrast mode support</li>
        </ul>
      </header>

      {/* Demo Form */}
      <form 
        id="demo-form"
        onSubmit={handleSubmit}
        className="space-y-4"
        noValidate
        aria-labelledby="demo-form-heading"
      >
        <h2 id="demo-form-heading" className="sr-only">
          Accessibility demonstration form
        </h2>

        {/* Email Field */}
        <AccessibleInput
          id="demo-email"
          type="email"
          label="Email Address"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          error={errors.email}
          required
          autoComplete="email"
          placeholder="Enter your email"
          hint="We'll use this to identify your account"
        />

        {/* Password Field */}
        <AccessibleInput
          id="demo-password"
          type="password"
          label="Password"
          value={formData.password}
          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
          error={errors.password}
          required
          autoComplete="current-password"
          placeholder="Enter your password"
          hint="Must be at least 8 characters long"
          showPasswordToggle
        />

        {/* Remember Me Checkbox */}
        <AccessibleCheckbox
          id="demo-remember"
          checked={formData.rememberMe}
          onChange={(e) => setFormData(prev => ({ ...prev, rememberMe: e.target.checked }))}
          label="Remember me on this device"
          description="Keep me signed in for faster access (not recommended on shared devices)"
        />

        {/* Submit Button */}
        <AccessibleButton
          type="submit"
          className="w-full"
          aria-describedby="submit-description"
        >
          Sign In (Demo)
          <span id="submit-description" className="sr-only">
            Submit the demonstration form
          </span>
        </AccessibleButton>
      </form>

      {/* Accessibility Features Info */}
      <footer className="mt-6 p-4 bg-gray-50 rounded-md">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Accessibility Features Demonstrated:
        </h3>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>✓ Proper ARIA labels and descriptions</li>
          <li>✓ Keyboard navigation (Tab, Enter, Escape)</li>
          <li>✓ Screen reader support with live regions</li>
          <li>✓ Error messages associated with fields</li>
          <li>✓ Password visibility toggle with ARIA states</li>
          <li>✓ Touch-friendly target sizes (44px minimum)</li>
          <li>✓ High contrast mode compatibility</li>
          <li>✓ Reduced motion support</li>
          <li>✓ Semantic HTML structure</li>
          <li>✓ Skip links for keyboard users</li>
        </ul>
      </footer>
    </div>
  )
}