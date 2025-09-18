/**
 * Offline Mode Indicator Component Tests
 * Tests for network status display and offline mode functionality
 * Requirements: 10.2, 10.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OfflineModeIndicator, NetworkStatusBadge, ServiceStatusBanner } from '../offline-mode-indicator';
import { networkErrorService } from '@/lib/services/network-error-service';

// Mock the network error service
vi.mock('@/lib/services/network-error-service', () => ({
  networkErrorService: {
    getNetworkStatus: vi.fn(),
    getServiceStatus: vi.fn(),
    getNetworkQuality: vi.fn(),
    getOfflineCapabilities: vi.fn(),
    getRetryRecommendations: vi.fn(),
    addNetworkStatusListener: vi.fn(),
    removeNetworkStatusListener: vi.fn(),
    addServiceStatusListener: vi.fn(),
    removeServiceStatusListener: vi.fn(),
    checkServiceAvailability: vi.fn(),
    enableOfflineMode: vi.fn(),
    disableOfflineMode: vi.fn()
  }
}));

describe('OfflineModeIndicator', () => {
  const mockNetworkStatus = {
    isOnline: true,
    connectionType: 'wifi' as const,
    effectiveType: '4g' as const,
    downlink: 10,
    rtt: 50,
    saveData: false
  };

  const mockServiceStatus = {
    isAvailable: true,
    status: 'operational' as const,
    affectedServices: [],
    lastChecked: new Date()
  };

  const mockOfflineCapabilities = {
    canSignIn: false,
    canSignUp: false,
    canResetPassword: false,
    canVerifyEmail: false,
    message: 'Authentication requires an internet connection'
  };

  const mockRetryRecommendations = {
    shouldRetry: true,
    recommendedDelay: 1000,
    maxAttempts: 3,
    reason: 'Good network conditions'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock returns
    (networkErrorService.getNetworkStatus as any).mockReturnValue(mockNetworkStatus);
    (networkErrorService.getServiceStatus as any).mockReturnValue(mockServiceStatus);
    (networkErrorService.getNetworkQuality as any).mockReturnValue('excellent');
    (networkErrorService.getOfflineCapabilities as any).mockReturnValue(mockOfflineCapabilities);
    (networkErrorService.getRetryRecommendations as any).mockReturnValue(mockRetryRecommendations);
    (networkErrorService.checkServiceAvailability as any).mockResolvedValue(mockServiceStatus);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Online State', () => {
    it('should not render when online and service operational without showDetails', () => {
      render(<OfflineModeIndicator />);
      
      // Should not render anything when everything is operational
      expect(screen.queryByText(/connection status/i)).not.toBeInTheDocument();
    });

    it('should render when showDetails is true', () => {
      render(<OfflineModeIndicator showDetails={true} />);
      
      // Should render compact indicator that can be expanded
      expect(screen.getByText(/network: excellent/i)).toBeInTheDocument();
    });

    it('should expand to show detailed view when clicked', async () => {
      render(<OfflineModeIndicator showDetails={true} />);
      
      // Click to expand
      fireEvent.click(screen.getByText(/network: excellent/i));
      
      await waitFor(() => {
        expect(screen.getByText(/connection status/i)).toBeInTheDocument();
      });
    });
  });

  describe('Offline State', () => {
    beforeEach(() => {
      (networkErrorService.getNetworkStatus as any).mockReturnValue({
        ...mockNetworkStatus,
        isOnline: false
      });
      (networkErrorService.getNetworkQuality as any).mockReturnValue('offline');
    });

    it('should render offline indicator', () => {
      render(<OfflineModeIndicator />);
      
      expect(screen.getByText(/offline/i)).toBeInTheDocument();
    });

    it('should show offline capabilities when expanded', async () => {
      render(<OfflineModeIndicator />);
      
      // Click to expand
      fireEvent.click(screen.getByText(/offline/i));
      
      await waitFor(() => {
        expect(screen.getByText(/available actions/i)).toBeInTheDocument();
        expect(screen.getByText(/requires internet/i)).toBeInTheDocument();
      });
    });

    it('should show offline mode toggle button', async () => {
      render(<OfflineModeIndicator />);
      
      // Expand the indicator
      fireEvent.click(screen.getByText(/offline/i));
      
      await waitFor(() => {
        expect(screen.getByText(/offline mode/i)).toBeInTheDocument();
      });
    });
  });

  describe('Service Unavailable State', () => {
    beforeEach(() => {
      (networkErrorService.getServiceStatus as any).mockReturnValue({
        ...mockServiceStatus,
        isAvailable: false,
        status: 'outage'
      });
    });

    it('should render service unavailable indicator', () => {
      render(<OfflineModeIndicator />);
      
      expect(screen.getByText(/service unavailable/i)).toBeInTheDocument();
    });

    it('should show service status details when expanded', async () => {
      render(<OfflineModeIndicator />);
      
      // Click to expand
      fireEvent.click(screen.getByText(/service unavailable/i));
      
      await waitFor(() => {
        expect(screen.getByText(/authentication service/i)).toBeInTheDocument();
        expect(screen.getByText(/outage/i)).toBeInTheDocument();
      });
    });
  });

  describe('Degraded Service State', () => {
    beforeEach(() => {
      (networkErrorService.getServiceStatus as any).mockReturnValue({
        ...mockServiceStatus,
        isAvailable: true,
        status: 'degraded',
        message: 'Service experiencing delays'
      });
    });

    it('should render degraded service indicator', () => {
      render(<OfflineModeIndicator />);
      
      expect(screen.getByText(/limited connectivity/i)).toBeInTheDocument();
    });
  });

  describe('Maintenance Mode State', () => {
    beforeEach(() => {
      (networkErrorService.getServiceStatus as any).mockReturnValue({
        ...mockServiceStatus,
        isAvailable: false,
        status: 'maintenance',
        message: 'Scheduled maintenance in progress',
        estimatedResolution: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
      });
    });

    it('should render maintenance mode indicator', () => {
      render(<OfflineModeIndicator />);
      
      expect(screen.getByText(/maintenance mode/i)).toBeInTheDocument();
    });

    it('should show estimated resolution time', async () => {
      render(<OfflineModeIndicator />);
      
      // Click to expand
      fireEvent.click(screen.getByText(/maintenance mode/i));
      
      await waitFor(() => {
        expect(screen.getByText(/est\. resolution/i)).toBeInTheDocument();
      });
    });
  });

  describe('Network Quality Display', () => {
    it('should show network quality information when expanded', async () => {
      (networkErrorService.getNetworkQuality as any).mockReturnValue('good');
      
      render(<OfflineModeIndicator showDetails={true} />);
      
      // Click to expand
      fireEvent.click(screen.getByText(/network: good/i));
      
      await waitFor(() => {
        expect(screen.getByText(/quality:/i)).toBeInTheDocument();
        expect(screen.getByText(/good/i)).toBeInTheDocument();
      });
    });

    it('should show connection type and speed when available', async () => {
      render(<OfflineModeIndicator showDetails={true} />);
      
      // Click to expand
      fireEvent.click(screen.getByText(/network: excellent/i));
      
      await waitFor(() => {
        expect(screen.getByText(/type:/i)).toBeInTheDocument();
        expect(screen.getByText(/wifi/i)).toBeInTheDocument();
        expect(screen.getByText(/speed:/i)).toBeInTheDocument();
        expect(screen.getByText(/4g/i)).toBeInTheDocument();
      });
    });
  });

  describe('Retry Recommendations', () => {
    beforeEach(() => {
      (networkErrorService.getRetryRecommendations as any).mockReturnValue({
        shouldRetry: true,
        recommendedDelay: 5000,
        maxAttempts: 2,
        reason: 'Poor network conditions - extended delays recommended'
      });
    });

    it('should show retry information when available', async () => {
      render(<OfflineModeIndicator showDetails={true} />);
      
      // Click to expand
      fireEvent.click(screen.getByText(/network: excellent/i));
      
      await waitFor(() => {
        expect(screen.getByText(/retry information/i)).toBeInTheDocument();
        expect(screen.getByText(/5s/i)).toBeInTheDocument();
        expect(screen.getByText(/2/i)).toBeInTheDocument();
      });
    });
  });

  describe('Action Buttons', () => {
    it('should handle check connection button click', async () => {
      render(<OfflineModeIndicator showDetails={true} />);
      
      // Click to expand
      fireEvent.click(screen.getByText(/network: excellent/i));
      
      await waitFor(() => {
        const checkButton = screen.getByText(/check connection/i);
        fireEvent.click(checkButton);
      });
      
      expect(networkErrorService.checkServiceAvailability).toHaveBeenCalled();
    });

    it('should handle offline mode toggle', async () => {
      (networkErrorService.getNetworkStatus as any).mockReturnValue({
        ...mockNetworkStatus,
        isOnline: false
      });
      
      render(<OfflineModeIndicator />);
      
      // Click to expand
      fireEvent.click(screen.getByText(/offline/i));
      
      await waitFor(() => {
        const offlineButton = screen.getByText(/offline mode/i);
        fireEvent.click(offlineButton);
      });
      
      expect(networkErrorService.enableOfflineMode).toHaveBeenCalled();
    });
  });

  describe('Auto Hide Functionality', () => {
    it('should auto-hide when conditions are met', async () => {
      const { rerender } = render(
        <OfflineModeIndicator autoHide={true} hideDelay={100} />
      );
      
      // Initially should not render (operational state)
      expect(screen.queryByText(/connection status/i)).not.toBeInTheDocument();
      
      // Change to offline state
      (networkErrorService.getNetworkStatus as any).mockReturnValue({
        ...mockNetworkStatus,
        isOnline: false
      });
      
      rerender(<OfflineModeIndicator autoHide={true} hideDelay={100} />);
      
      // Should show offline indicator
      expect(screen.getByText(/offline/i)).toBeInTheDocument();
    });
  });

  describe('Event Listeners', () => {
    it('should add and remove network status listeners', () => {
      const { unmount } = render(<OfflineModeIndicator />);
      
      expect(networkErrorService.addNetworkStatusListener).toHaveBeenCalled();
      expect(networkErrorService.addServiceStatusListener).toHaveBeenCalled();
      
      unmount();
      
      expect(networkErrorService.removeNetworkStatusListener).toHaveBeenCalled();
      expect(networkErrorService.removeServiceStatusListener).toHaveBeenCalled();
    });
  });
});

describe('NetworkStatusBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    (networkErrorService.getNetworkStatus as any).mockReturnValue({
      isOnline: true,
      connectionType: 'wifi',
      effectiveType: '4g',
      downlink: 10,
      rtt: 50,
      saveData: false
    });
    (networkErrorService.getNetworkQuality as any).mockReturnValue('excellent');
  });

  it('should render online badge', () => {
    render(<NetworkStatusBadge />);
    
    expect(screen.getByText(/online/i)).toBeInTheDocument();
  });

  it('should render offline badge when offline', () => {
    (networkErrorService.getNetworkStatus as any).mockReturnValue({
      isOnline: false,
      connectionType: 'unknown',
      effectiveType: 'unknown',
      downlink: 0,
      rtt: 0,
      saveData: false
    });
    
    render(<NetworkStatusBadge />);
    
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
  });

  it('should show network quality when enabled', () => {
    render(<NetworkStatusBadge showQuality={true} />);
    
    expect(screen.getByText(/excellent/i)).toBeInTheDocument();
  });
});

describe('ServiceStatusBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when service is operational', () => {
    (networkErrorService.getServiceStatus as any).mockReturnValue({
      isAvailable: true,
      status: 'operational',
      affectedServices: [],
      lastChecked: new Date()
    });
    
    render(<ServiceStatusBanner />);
    
    expect(screen.queryByText(/service notice/i)).not.toBeInTheDocument();
  });

  it('should render when service is degraded', () => {
    (networkErrorService.getServiceStatus as any).mockReturnValue({
      isAvailable: true,
      status: 'degraded',
      message: 'Service experiencing delays',
      affectedServices: ['auth'],
      lastChecked: new Date()
    });
    
    render(<ServiceStatusBanner />);
    
    expect(screen.getByText(/service notice/i)).toBeInTheDocument();
    expect(screen.getByText(/service experiencing delays/i)).toBeInTheDocument();
    expect(screen.getByText(/degraded/i)).toBeInTheDocument();
  });

  it('should render when service is in maintenance', () => {
    const estimatedResolution = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    
    (networkErrorService.getServiceStatus as any).mockReturnValue({
      isAvailable: false,
      status: 'maintenance',
      message: 'Scheduled maintenance in progress',
      estimatedResolution,
      affectedServices: ['auth'],
      lastChecked: new Date()
    });
    
    render(<ServiceStatusBanner />);
    
    expect(screen.getByText(/service notice/i)).toBeInTheDocument();
    expect(screen.getByText(/scheduled maintenance/i)).toBeInTheDocument();
    expect(screen.getByText(/maintenance/i)).toBeInTheDocument();
    expect(screen.getByText(/estimated resolution/i)).toBeInTheDocument();
  });

  it('should render when service is experiencing outage', () => {
    (networkErrorService.getServiceStatus as any).mockReturnValue({
      isAvailable: false,
      status: 'outage',
      message: 'Service temporarily unavailable',
      affectedServices: ['auth', 'api'],
      lastChecked: new Date()
    });
    
    render(<ServiceStatusBanner />);
    
    expect(screen.getByText(/service notice/i)).toBeInTheDocument();
    expect(screen.getByText(/service temporarily unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/outage/i)).toBeInTheDocument();
  });
});