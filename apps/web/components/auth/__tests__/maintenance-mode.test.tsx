/**
 * Maintenance Mode Component Tests
 * Tests for service unavailability and maintenance messages
 * Requirements: 10.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MaintenanceMode, MaintenanceBanner } from '../maintenance-mode';
import { networkErrorService } from '@/lib/services/network-error-service';

// Mock the network error service
vi.mock('@/lib/services/network-error-service', () => ({
  networkErrorService: {
    getServiceStatus: vi.fn(),
    addServiceStatusListener: vi.fn(),
    removeServiceStatusListener: vi.fn(),
    checkServiceAvailability: vi.fn()
  }
}));

// Mock window.open
Object.defineProperty(window, 'open', {
  value: vi.fn(),
  writable: true
});

describe('MaintenanceMode', () => {
  const mockServiceStatus = {
    isAvailable: false,
    status: 'maintenance' as const,
    message: 'Scheduled maintenance in progress',
    estimatedResolution: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
    affectedServices: ['auth', 'api'],
    lastChecked: new Date()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock returns
    (networkErrorService.getServiceStatus as any).mockReturnValue(mockServiceStatus);
    (networkErrorService.checkServiceAvailability as any).mockResolvedValue(mockServiceStatus);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Maintenance State', () => {
    it('should render maintenance mode component', () => {
      render(<MaintenanceMode />);
      
      expect(screen.getByText(/scheduled maintenance/i)).toBeInTheDocument();
      expect(screen.getByText(/maintenance/i)).toBeInTheDocument();
      expect(screen.getByText(/scheduled maintenance in progress/i)).toBeInTheDocument();
    });

    it('should show estimated resolution time', () => {
      render(<MaintenanceMode />);
      
      expect(screen.getByText(/estimated resolution/i)).toBeInTheDocument();
      expect(screen.getByText(/expected by/i)).toBeInTheDocument();
    });

    it('should show affected services', () => {
      render(<MaintenanceMode />);
      
      expect(screen.getByText(/affected services/i)).toBeInTheDocument();
      expect(screen.getByText(/auth/i)).toBeInTheDocument();
      expect(screen.getByText(/api/i)).toBeInTheDocument();
    });

    it('should show last updated time', () => {
      render(<MaintenanceMode />);
      
      expect(screen.getByText(/last updated/i)).toBeInTheDocument();
    });

    it('should show maintenance-specific guidance', () => {
      render(<MaintenanceMode />);
      
      expect(screen.getByText(/this is planned maintenance/i)).toBeInTheDocument();
      expect(screen.getByText(/your account and data are safe/i)).toBeInTheDocument();
    });
  });

  describe('Outage State', () => {
    beforeEach(() => {
      (networkErrorService.getServiceStatus as any).mockReturnValue({
        ...mockServiceStatus,
        status: 'outage',
        message: 'Service experiencing technical difficulties'
      });
    });

    it('should render outage mode component', () => {
      render(<MaintenanceMode />);
      
      expect(screen.getByText(/service outage/i)).toBeInTheDocument();
      expect(screen.getByText(/outage/i)).toBeInTheDocument();
      expect(screen.getByText(/technical difficulties/i)).toBeInTheDocument();
    });

    it('should not show maintenance-specific guidance for outages', () => {
      render(<MaintenanceMode />);
      
      expect(screen.queryByText(/this is planned maintenance/i)).not.toBeInTheDocument();
    });
  });

  describe('Degraded State', () => {
    beforeEach(() => {
      (networkErrorService.getServiceStatus as any).mockReturnValue({
        ...mockServiceStatus,
        isAvailable: true,
        status: 'degraded',
        message: 'Service experiencing some issues'
      });
    });

    it('should render degraded service component', () => {
      render(<MaintenanceMode />);
      
      expect(screen.getByText(/service degraded/i)).toBeInTheDocument();
      expect(screen.getByText(/degraded/i)).toBeInTheDocument();
      expect(screen.getByText(/experiencing some issues/i)).toBeInTheDocument();
    });
  });

  describe('Operational State', () => {
    beforeEach(() => {
      (networkErrorService.getServiceStatus as any).mockReturnValue({
        ...mockServiceStatus,
        isAvailable: true,
        status: 'operational'
      });
    });

    it('should not render when service is operational', () => {
      render(<MaintenanceMode />);
      
      expect(screen.queryByText(/scheduled maintenance/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/service outage/i)).not.toBeInTheDocument();
    });
  });

  describe('Custom Messages', () => {
    it('should display custom message when provided', () => {
      const customMessage = 'Custom maintenance message for testing';
      
      render(<MaintenanceMode customMessage={customMessage} />);
      
      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should render check status button by default', () => {
      render(<MaintenanceMode />);
      
      expect(screen.getByText(/check status/i)).toBeInTheDocument();
    });

    it('should handle check status button click', async () => {
      render(<MaintenanceMode />);
      
      const checkButton = screen.getByText(/check status/i);
      fireEvent.click(checkButton);
      
      await waitFor(() => {
        expect(networkErrorService.checkServiceAvailability).toHaveBeenCalled();
      });
    });

    it('should render status page button when enabled', () => {
      render(<MaintenanceMode showStatusPage={true} />);
      
      expect(screen.getByText(/status page/i)).toBeInTheDocument();
    });

    it('should handle status page button click', () => {
      render(<MaintenanceMode showStatusPage={true} />);
      
      const statusButton = screen.getByText(/status page/i);
      fireEvent.click(statusButton);
      
      expect(window.open).toHaveBeenCalledWith('/status', '_blank');
    });

    it('should render support button when enabled', () => {
      render(<MaintenanceMode contactSupport={true} />);
      
      expect(screen.getByText(/support/i)).toBeInTheDocument();
    });

    it('should handle support button click', () => {
      render(<MaintenanceMode contactSupport={true} />);
      
      const supportButton = screen.getByText(/support/i);
      fireEvent.click(supportButton);
      
      expect(window.open).toHaveBeenCalledWith('/support', '_blank');
    });

    it('should not render retry button when disabled', () => {
      render(<MaintenanceMode showRetryButton={false} />);
      
      expect(screen.queryByText(/check status/i)).not.toBeInTheDocument();
    });
  });

  describe('Auto Refresh', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should show next check countdown when auto refresh is enabled', () => {
      render(<MaintenanceMode autoRefresh={true} refreshInterval={30000} />);
      
      expect(screen.getByText(/next check/i)).toBeInTheDocument();
    });

    it('should auto refresh service status', async () => {
      render(<MaintenanceMode autoRefresh={true} refreshInterval={1000} />);
      
      // Fast forward time
      vi.advanceTimersByTime(1000);
      
      await waitFor(() => {
        expect(networkErrorService.checkServiceAvailability).toHaveBeenCalled();
      });
    });

    it('should not show next check when auto refresh is disabled', () => {
      render(<MaintenanceMode autoRefresh={false} />);
      
      expect(screen.queryByText(/next check/i)).not.toBeInTheDocument();
    });
  });

  describe('Time Formatting', () => {
    it('should format time remaining correctly for hours and minutes', () => {
      const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000 + 30 * 60 * 1000); // 2h 30m from now
      
      (networkErrorService.getServiceStatus as any).mockReturnValue({
        ...mockServiceStatus,
        estimatedResolution: futureTime
      });
      
      render(<MaintenanceMode />);
      
      expect(screen.getByText(/2h 30m/i)).toBeInTheDocument();
    });

    it('should format time remaining correctly for minutes only', () => {
      const futureTime = new Date(Date.now() + 15 * 60 * 1000); // 15m from now
      
      (networkErrorService.getServiceStatus as any).mockReturnValue({
        ...mockServiceStatus,
        estimatedResolution: futureTime
      });
      
      render(<MaintenanceMode />);
      
      expect(screen.getByText(/15m/i)).toBeInTheDocument();
    });

    it('should show "Soon" for past estimated resolution times', () => {
      const pastTime = new Date(Date.now() - 10 * 60 * 1000); // 10m ago
      
      (networkErrorService.getServiceStatus as any).mockReturnValue({
        ...mockServiceStatus,
        estimatedResolution: pastTime
      });
      
      render(<MaintenanceMode />);
      
      expect(screen.getByText(/soon/i)).toBeInTheDocument();
    });
  });

  describe('What You Can Do Section', () => {
    it('should show general guidance', () => {
      render(<MaintenanceMode />);
      
      expect(screen.getByText(/what you can do/i)).toBeInTheDocument();
      expect(screen.getByText(/wait for the service to be restored/i)).toBeInTheDocument();
      expect(screen.getByText(/check our status page/i)).toBeInTheDocument();
      expect(screen.getByText(/try refreshing this page/i)).toBeInTheDocument();
      expect(screen.getByText(/contact support/i)).toBeInTheDocument();
    });

    it('should show degraded service specific guidance', () => {
      (networkErrorService.getServiceStatus as any).mockReturnValue({
        ...mockServiceStatus,
        isAvailable: true,
        status: 'degraded'
      });
      
      render(<MaintenanceMode />);
      
      expect(screen.getByText(/you may still be able to sign in/i)).toBeInTheDocument();
    });
  });

  describe('Event Listeners', () => {
    it('should add and remove service status listeners', () => {
      const { unmount } = render(<MaintenanceMode />);
      
      expect(networkErrorService.addServiceStatusListener).toHaveBeenCalled();
      
      unmount();
      
      expect(networkErrorService.removeServiceStatusListener).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should show loading state when refreshing', async () => {
      (networkErrorService.checkServiceAvailability as any).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      
      render(<MaintenanceMode />);
      
      const checkButton = screen.getByText(/check status/i);
      fireEvent.click(checkButton);
      
      expect(screen.getByText(/checking status/i)).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText(/check status/i)).toBeInTheDocument();
      });
    });
  });
});

describe('MaintenanceBanner', () => {
  const mockServiceStatus = {
    isAvailable: false,
    status: 'maintenance' as const,
    message: 'Scheduled maintenance in progress',
    estimatedResolution: new Date(Date.now() + 30 * 60 * 1000),
    affectedServices: ['auth'],
    lastChecked: new Date()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (networkErrorService.getServiceStatus as any).mockReturnValue(mockServiceStatus);
  });

  describe('Banner Display', () => {
    it('should render maintenance banner', () => {
      render(<MaintenanceBanner />);
      
      expect(screen.getByText(/service notice/i)).toBeInTheDocument();
      expect(screen.getByText(/scheduled maintenance in progress/i)).toBeInTheDocument();
      expect(screen.getByText(/maintenance/i)).toBeInTheDocument();
    });

    it('should show estimated resolution in banner', () => {
      render(<MaintenanceBanner />);
      
      expect(screen.getByText(/est\. resolution/i)).toBeInTheDocument();
    });

    it('should not render when service is operational', () => {
      (networkErrorService.getServiceStatus as any).mockReturnValue({
        ...mockServiceStatus,
        isAvailable: true,
        status: 'operational'
      });
      
      render(<MaintenanceBanner />);
      
      expect(screen.queryByText(/service notice/i)).not.toBeInTheDocument();
    });
  });

  describe('Dismissible Banner', () => {
    it('should render dismiss button when dismissible', () => {
      render(<MaintenanceBanner dismissible={true} />);
      
      expect(screen.getByText(/×/)).toBeInTheDocument();
    });

    it('should handle dismiss action', () => {
      const onDismiss = vi.fn();
      
      render(<MaintenanceBanner dismissible={true} onDismiss={onDismiss} />);
      
      const dismissButton = screen.getByText(/×/);
      fireEvent.click(dismissButton);
      
      expect(onDismiss).toHaveBeenCalled();
    });

    it('should hide banner after dismissal', () => {
      render(<MaintenanceBanner dismissible={true} />);
      
      const dismissButton = screen.getByText(/×/);
      fireEvent.click(dismissButton);
      
      expect(screen.queryByText(/service notice/i)).not.toBeInTheDocument();
    });

    it('should show banner again when status changes after dismissal', () => {
      const { rerender } = render(<MaintenanceBanner dismissible={true} />);
      
      // Dismiss banner
      const dismissButton = screen.getByText(/×/);
      fireEvent.click(dismissButton);
      
      expect(screen.queryByText(/service notice/i)).not.toBeInTheDocument();
      
      // Change status
      (networkErrorService.getServiceStatus as any).mockReturnValue({
        ...mockServiceStatus,
        status: 'outage',
        message: 'Service outage detected'
      });
      
      rerender(<MaintenanceBanner dismissible={true} />);
      
      expect(screen.getByText(/service notice/i)).toBeInTheDocument();
      expect(screen.getByText(/service outage detected/i)).toBeInTheDocument();
    });
  });

  describe('Different Service States', () => {
    it('should render outage banner', () => {
      (networkErrorService.getServiceStatus as any).mockReturnValue({
        ...mockServiceStatus,
        status: 'outage',
        message: 'Service experiencing outage'
      });
      
      render(<MaintenanceBanner />);
      
      expect(screen.getByText(/service experiencing outage/i)).toBeInTheDocument();
      expect(screen.getByText(/outage/i)).toBeInTheDocument();
    });

    it('should render degraded service banner', () => {
      (networkErrorService.getServiceStatus as any).mockReturnValue({
        ...mockServiceStatus,
        isAvailable: true,
        status: 'degraded',
        message: 'Service experiencing delays'
      });
      
      render(<MaintenanceBanner />);
      
      expect(screen.getByText(/service experiencing delays/i)).toBeInTheDocument();
      expect(screen.getByText(/degraded/i)).toBeInTheDocument();
    });
  });

  describe('Event Listeners', () => {
    it('should add and remove service status listeners', () => {
      const { unmount } = render(<MaintenanceBanner />);
      
      expect(networkErrorService.addServiceStatusListener).toHaveBeenCalled();
      
      unmount();
      
      expect(networkErrorService.removeServiceStatusListener).toHaveBeenCalled();
    });
  });
});