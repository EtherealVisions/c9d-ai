import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  ErrorDisplay,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationErrorAlert,
  InlineError,
  FieldError,
} from '../error-components';
import { createInvalidCredentialsError } from '@/lib/errors/error-utils';

// Mock window methods
beforeEach(() => {
  vi.clearAllMocks();
  
  Object.defineProperty(window, 'location', {
    value: { href: 'http://localhost:3000' },
    writable: true,
  });
  
  Object.defineProperty(window, 'history', {
    value: { back: vi.fn() },
    writable: true,
  });
});

describe('Error Components', () => {
  describe('ErrorDisplay', () => {
    it('should render with default props', () => {
      render(<ErrorDisplay />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
    });

    it('should render with custom title and description', () => {
      render(
        <ErrorDisplay 
          title="Custom Error" 
          description="Custom description" 
        />
      );

      expect(screen.getByText('Custom Error')).toBeInTheDocument();
      expect(screen.getByText('Custom description')).toBeInTheDocument();
    });

    it('should render with BaseError and show user-friendly message', () => {
      const error = createInvalidCredentialsError();
      
      render(<ErrorDisplay error={error} />);

      expect(screen.getByText('The email or password you entered is incorrect. Please try again.')).toBeInTheDocument();
    });

    it('should render with regular Error', () => {
      const error = new Error('Regular error message');
      
      render(<ErrorDisplay error={error} />);

      expect(screen.getByText('Regular error message')).toBeInTheDocument();
    });

    it('should render with string error', () => {
      render(<ErrorDisplay error="String error message" />);

      expect(screen.getByText('String error message')).toBeInTheDocument();
    });

    it('should show retry button when onRetry is provided', () => {
      const onRetry = vi.fn();
      
      render(<ErrorDisplay onRetry={onRetry} />);

      const retryButton = screen.getByText('Try Again');
      expect(retryButton).toBeInTheDocument();
      
      fireEvent.click(retryButton);
      expect(onRetry).toHaveBeenCalled();
    });

    it('should show go home button when onGoHome is provided', () => {
      const onGoHome = vi.fn();
      
      render(<ErrorDisplay onGoHome={onGoHome} />);

      const homeButton = screen.getByText('Go Home');
      expect(homeButton).toBeInTheDocument();
      
      fireEvent.click(homeButton);
      expect(onGoHome).toHaveBeenCalled();
    });

    it('should show technical details when showDetails is true', () => {
      const error = createInvalidCredentialsError();
      
      render(<ErrorDisplay error={error} showDetails />);

      expect(screen.getByText('Technical Details')).toBeInTheDocument();
    });

    it('should not show technical details for string errors', () => {
      render(<ErrorDisplay error="String error" showDetails />);

      expect(screen.queryByText('Technical Details')).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<ErrorDisplay className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('AuthenticationError', () => {
    it('should render authentication error with default props', () => {
      render(<AuthenticationError />);

      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      expect(screen.getByText('You need to sign in to access this page.')).toBeInTheDocument();
      expect(screen.getByText('Sign In')).toBeInTheDocument();
      expect(screen.getByText('Go Home')).toBeInTheDocument();
    });

    it('should render with custom message', () => {
      render(<AuthenticationError message="Custom auth message" />);

      expect(screen.getByText('Custom auth message')).toBeInTheDocument();
    });

    it('should call onSignIn when sign in button is clicked', () => {
      const onSignIn = vi.fn();
      
      render(<AuthenticationError onSignIn={onSignIn} />);

      fireEvent.click(screen.getByText('Sign In'));
      expect(onSignIn).toHaveBeenCalled();
    });

    it('should call onGoHome when go home button is clicked', () => {
      const onGoHome = vi.fn();
      
      render(<AuthenticationError onGoHome={onGoHome} />);

      fireEvent.click(screen.getByText('Go Home'));
      expect(onGoHome).toHaveBeenCalled();
    });

    it('should navigate to sign in by default', () => {
      render(<AuthenticationError />);

      fireEvent.click(screen.getByText('Sign In'));
      expect(window.location.href).toBe('/sign-in');
    });
  });

  describe('AuthorizationError', () => {
    it('should render authorization error with default props', () => {
      render(<AuthorizationError />);

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText('You don\'t have permission to access this page.')).toBeInTheDocument();
      expect(screen.getByText('Go Back')).toBeInTheDocument();
      expect(screen.getByText('Go Home')).toBeInTheDocument();
    });

    it('should render with custom message', () => {
      render(<AuthorizationError message="Custom authz message" />);

      expect(screen.getByText('Custom authz message')).toBeInTheDocument();
    });

    it('should call onGoBack when go back button is clicked', () => {
      const onGoBack = vi.fn();
      
      render(<AuthorizationError onGoBack={onGoBack} />);

      fireEvent.click(screen.getByText('Go Back'));
      expect(onGoBack).toHaveBeenCalled();
    });

    it('should call window.history.back by default', () => {
      render(<AuthorizationError />);

      fireEvent.click(screen.getByText('Go Back'));
      expect(window.history.back).toHaveBeenCalled();
    });
  });

  describe('NotFoundError', () => {
    it('should render not found error with default props', () => {
      render(<NotFoundError />);

      expect(screen.getByText('Page Not Found')).toBeInTheDocument();
      expect(screen.getByText('The page you\'re looking for doesn\'t exist or has been moved.')).toBeInTheDocument();
    });

    it('should render with custom resource', () => {
      render(<NotFoundError resource="organization" />);

      expect(screen.getByText('Organization Not Found')).toBeInTheDocument();
      expect(screen.getByText('The organization you\'re looking for doesn\'t exist or has been moved.')).toBeInTheDocument();
    });

    it('should call onGoHome when go home button is clicked', () => {
      const onGoHome = vi.fn();
      
      render(<NotFoundError onGoHome={onGoHome} />);

      fireEvent.click(screen.getByText('Go Home'));
      expect(onGoHome).toHaveBeenCalled();
    });

    it('should call onGoBack when go back button is clicked', () => {
      const onGoBack = vi.fn();
      
      render(<NotFoundError onGoBack={onGoBack} />);

      fireEvent.click(screen.getByText('Go Back'));
      expect(onGoBack).toHaveBeenCalled();
    });
  });

  describe('ValidationErrorAlert', () => {
    const mockErrors = {
      email: ['Invalid email format', 'Email is required'],
      password: ['Password too weak'],
      name: ['Name is required'],
    };

    it('should render validation errors', () => {
      render(<ValidationErrorAlert errors={mockErrors} />);

      expect(screen.getByText('Please fix the following errors:')).toBeInTheDocument();
      expect(screen.getByText('Email: Invalid email format')).toBeInTheDocument();
      expect(screen.getByText('Email: Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password: Password too weak')).toBeInTheDocument();
      expect(screen.getByText('Name: Name is required')).toBeInTheDocument();
    });

    it('should render with custom title', () => {
      render(<ValidationErrorAlert errors={mockErrors} title="Custom validation title" />);

      expect(screen.getByText('Custom validation title')).toBeInTheDocument();
    });

    it('should not render when no errors', () => {
      const { container } = render(<ValidationErrorAlert errors={{}} />);

      expect(container.firstChild).toBeNull();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ValidationErrorAlert errors={mockErrors} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('InlineError', () => {
    it('should render inline error message', () => {
      render(<InlineError message="This field is required" />);

      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <InlineError message="Error message" className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('FieldError', () => {
    it('should render field errors', () => {
      const errors = ['Field is required', 'Field must be valid'];
      
      render(<FieldError errors={errors} />);

      expect(screen.getByText('Field is required')).toBeInTheDocument();
      expect(screen.getByText('Field must be valid')).toBeInTheDocument();
    });

    it('should not render when no errors', () => {
      const { container } = render(<FieldError errors={[]} />);

      expect(container.firstChild).toBeNull();
    });

    it('should not render when errors is undefined', () => {
      const { container } = render(<FieldError />);

      expect(container.firstChild).toBeNull();
    });

    it('should apply custom className', () => {
      const errors = ['Error message'];
      const { container } = render(
        <FieldError errors={errors} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});