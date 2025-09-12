import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary, useErrorHandler, AsyncErrorBoundary } from '../error-boundary';
import { createInvalidCredentialsError } from '@/lib/errors/error-utils';

// Mock console methods to avoid noise in tests
const mockConsoleError = vi.fn();
const mockConsoleLog = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  global.console = {
    ...global.console,
    error: mockConsoleError,
    log: mockConsoleLog,
  };
  
  // Mock window.location
  Object.defineProperty(window, 'location', {
    value: { href: 'http://localhost:3000' },
    writable: true,
  });
  
  // Mock navigator
  Object.defineProperty(navigator, 'userAgent', {
    value: 'test-user-agent',
    writable: true,
  });
});

// Test component that throws an error
const ThrowError = ({ error }: { error?: Error }) => {
  if (error) {
    throw error;
  }
  throw new Error('Test error');
};

// Test component that works normally
const WorkingComponent = () => <div>Working component</div>;

describe('ErrorBoundary', () => {
  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <WorkingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Working component')).toBeInTheDocument();
  });

  it('should render error UI when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Go Home')).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom error fallback</div>;
    
    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error fallback')).toBeInTheDocument();
    expect(screen.queryByText('Oops! Something went wrong')).not.toBeInTheDocument();
  });

  it('should show user-friendly message for BaseError', () => {
    const customError = createInvalidCredentialsError();
    
    render(
      <ErrorBoundary>
        <ThrowError error={customError} />
      </ErrorBoundary>
    );

    expect(screen.getByText('The email or password you entered is incorrect. Please try again.')).toBeInTheDocument();
  });

  it('should call onError callback when error occurs', () => {
    const onError = vi.fn();
    
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('should show technical details when showDetails is true', () => {
    render(
      <ErrorBoundary showDetails>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Technical Details')).toBeInTheDocument();
  });

  it('should reset error state when retry button is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Try Again'));

    // Re-render with working component
    rerender(
      <ErrorBoundary>
        <WorkingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Working component')).toBeInTheDocument();
  });

  it('should navigate home when go home button is clicked', () => {
    const originalLocation = window.location.href;
    
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Go Home'));

    expect(window.location.href).toBe('/');
    
    // Restore original location
    window.location.href = originalLocation;
  });

  it('should log error details to console', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(mockConsoleError).toHaveBeenCalledWith(
      'ErrorBoundary caught an error:',
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );

    expect(mockConsoleError).toHaveBeenCalledWith(
      'Error logged:',
      expect.objectContaining({
        message: 'Test error',
        stack: expect.any(String),
        componentStack: expect.any(String),
        errorId: expect.any(String),
        timestamp: expect.any(String),
        userAgent: 'test-user-agent',
        url: 'http://localhost:3000',
      })
    );
  });
});

describe('useErrorHandler', () => {
  const TestComponent = () => {
    const { captureError, resetError } = useErrorHandler();

    return (
      <div>
        <button onClick={() => captureError(new Error('Captured error'))}>
          Capture Error
        </button>
        <button onClick={resetError}>Reset Error</button>
        <span>No error</span>
      </div>
    );
  };

  it('should not throw error initially', () => {
    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should throw error when captureError is called', () => {
    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Capture Error'));

    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
  });
});

describe('AsyncErrorBoundary', () => {
  it('should render children normally', () => {
    render(
      <AsyncErrorBoundary>
        <WorkingComponent />
      </AsyncErrorBoundary>
    );

    expect(screen.getByText('Working component')).toBeInTheDocument();
  });

  it('should handle unhandled promise rejections', () => {
    const { rerender } = render(
      <AsyncErrorBoundary>
        <WorkingComponent />
      </AsyncErrorBoundary>
    );

    // Simulate unhandled promise rejection
    const event = new Event('unhandledrejection') as any;
    event.reason = 'Async error';
    window.dispatchEvent(event);

    // Re-render to trigger error boundary
    rerender(
      <AsyncErrorBoundary>
        <WorkingComponent />
      </AsyncErrorBoundary>
    );

    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
  });

  it('should clean up event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    
    const { unmount } = render(
      <AsyncErrorBoundary>
        <WorkingComponent />
      </AsyncErrorBoundary>
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'unhandledrejection',
      expect.any(Function)
    );
  });
});