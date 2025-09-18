/**
 * Offline Mode Indicator Component
 * Displays network status and offline mode information
 * Requirements: 10.2, 10.3
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  Clock, 
  RefreshCw, 
  Signal,
  SignalHigh,
  SignalMedium,
  SignalLow,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { 
  NetworkErrorService, 
  NetworkStatus, 
  ServiceStatus,
  networkErrorService 
} from '@/lib/services/network-error-service';
import { cn } from '@/lib/utils';

interface OfflineModeIndicatorProps {
  className?: string;
  showDetails?: boolean;
  autoHide?: boolean;
  hideDelay?: number;
}

/**
 * Get network quality icon
 */
function getNetworkQualityIcon(quality: string): React.ComponentType<any> {
  switch (quality) {
    case 'excellent':
      return SignalHigh;
    case 'good':
      return Signal;
    case 'fair':
      return SignalMedium;
    case 'poor':
      return SignalLow;
    case 'offline':
      return WifiOff;
    default:
      return Wifi;
  }
}

/**
 * Get service status icon
 */
function getServiceStatusIcon(status: ServiceStatus['status']): React.ComponentType<any> {
  switch (status) {
    case 'operational':
      return CheckCircle;
    case 'degraded':
      return AlertTriangle;
    case 'maintenance':
      return Clock;
    case 'outage':
      return XCircle;
    default:
      return Activity;
  }
}

/**
 * Get status color classes
 */
function getStatusColors(isOnline: boolean, serviceStatus: ServiceStatus['status']) {
  if (!isOnline) {
    return {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-800',
      icon: 'text-red-600',
      badge: 'bg-red-100 text-red-800'
    };
  }

  switch (serviceStatus) {
    case 'operational':
      return {
        bg: 'bg-green-50 border-green-200',
        text: 'text-green-800',
        icon: 'text-green-600',
        badge: 'bg-green-100 text-green-800'
      };
    case 'degraded':
      return {
        bg: 'bg-yellow-50 border-yellow-200',
        text: 'text-yellow-800',
        icon: 'text-yellow-600',
        badge: 'bg-yellow-100 text-yellow-800'
      };
    case 'maintenance':
      return {
        bg: 'bg-blue-50 border-blue-200',
        text: 'text-blue-800',
        icon: 'text-blue-600',
        badge: 'bg-blue-100 text-blue-800'
      };
    case 'outage':
      return {
        bg: 'bg-red-50 border-red-200',
        text: 'text-red-800',
        icon: 'text-red-600',
        badge: 'bg-red-100 text-red-800'
      };
    default:
      return {
        bg: 'bg-gray-50 border-gray-200',
        text: 'text-gray-800',
        icon: 'text-gray-600',
        badge: 'bg-gray-100 text-gray-800'
      };
  }
}

/**
 * Offline Mode Indicator Component
 */
export const OfflineModeIndicator: React.FC<OfflineModeIndicatorProps> = ({
  className,
  showDetails = false,
  autoHide = false,
  hideDelay = 5000
}) => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(
    networkErrorService.getNetworkStatus()
  );
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>(
    networkErrorService.getServiceStatus()
  );
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  // Update network and service status
  useEffect(() => {
    const handleNetworkChange = (status: NetworkStatus) => {
      setNetworkStatus(status);
      setIsVisible(true); // Show indicator when status changes
    };

    const handleServiceChange = (status: ServiceStatus) => {
      setServiceStatus(status);
      setIsVisible(true); // Show indicator when status changes
    };

    networkErrorService.addNetworkStatusListener(handleNetworkChange);
    networkErrorService.addServiceStatusListener(handleServiceChange);

    return () => {
      networkErrorService.removeNetworkStatusListener(handleNetworkChange);
      networkErrorService.removeServiceStatusListener(handleServiceChange);
    };
  }, []);

  // Auto-hide logic
  useEffect(() => {
    if (autoHide && networkStatus.isOnline && serviceStatus.isAvailable) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, hideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, hideDelay, networkStatus.isOnline, serviceStatus.isAvailable]);

  const isOnline = networkStatus.isOnline;
  const networkQuality = networkErrorService.getNetworkQuality();
  const offlineCapabilities = networkErrorService.getOfflineCapabilities();
  const retryRecommendations = networkErrorService.getRetryRecommendations();

  const NetworkQualityIcon = getNetworkQualityIcon(networkQuality);
  const ServiceStatusIcon = getServiceStatusIcon(serviceStatus.status);
  const colors = getStatusColors(isOnline, serviceStatus.status);

  // Don't render if not visible
  if (!isVisible) return null;

  // Don't render if everything is operational and not showing details
  if (isOnline && serviceStatus.isAvailable && !showDetails && !isExpanded) {
    return null;
  }

  const handleRetryConnection = async () => {
    try {
      await networkErrorService.checkServiceAvailability();
    } catch (error) {
      console.error('Failed to check service availability:', error);
    }
  };

  const handleToggleOfflineMode = () => {
    if (offlineCapabilities.canSignIn) {
      networkErrorService.disableOfflineMode();
    } else {
      networkErrorService.enableOfflineMode();
    }
  };

  return (
    <div className={cn('w-full max-w-md mx-auto', className)}>
      {/* Compact Indicator */}
      {!isExpanded && (
        <Alert className={cn('cursor-pointer transition-all', colors.bg)} onClick={() => setIsExpanded(true)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <NetworkQualityIcon className={cn('h-4 w-4', colors.icon)} />
              <AlertDescription className={colors.text}>
                {!isOnline ? 'Offline' : 
                 !serviceStatus.isAvailable ? 'Service Unavailable' :
                 serviceStatus.status === 'degraded' ? 'Limited Connectivity' :
                 serviceStatus.status === 'maintenance' ? 'Maintenance Mode' :
                 `Network: ${networkQuality}`}
              </AlertDescription>
            </div>
            <Badge variant="secondary" className={colors.badge}>
              {!isOnline ? 'Offline' : serviceStatus.status}
            </Badge>
          </div>
        </Alert>
      )}

      {/* Detailed View */}
      {isExpanded && (
        <Card className={cn('border', colors.bg)}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <NetworkQualityIcon className={cn('h-5 w-5', colors.icon)} />
                <CardTitle className={cn('text-lg', colors.text)}>
                  Connection Status
                </CardTitle>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className={colors.badge}>
                  {!isOnline ? 'Offline' : serviceStatus.status}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className={colors.text}
                >
                  ×
                </Button>
              </div>
            </div>
            <CardDescription className={colors.text}>
              {!isOnline 
                ? 'You are currently offline. Some features may not be available.'
                : serviceStatus.message || 'Connection and service status information'
              }
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Network Status */}
            <div className="space-y-2">
              <h4 className={cn('font-medium text-sm', colors.text)}>Network</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className={colors.text}>Status:</span>
                  <span className={cn('font-medium', colors.text)}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={colors.text}>Quality:</span>
                  <span className={cn('font-medium capitalize', colors.text)}>
                    {networkQuality}
                  </span>
                </div>
                {networkStatus.connectionType !== 'unknown' && (
                  <div className="flex justify-between">
                    <span className={colors.text}>Type:</span>
                    <span className={cn('font-medium capitalize', colors.text)}>
                      {networkStatus.connectionType}
                    </span>
                  </div>
                )}
                {networkStatus.effectiveType !== 'unknown' && (
                  <div className="flex justify-between">
                    <span className={colors.text}>Speed:</span>
                    <span className={cn('font-medium uppercase', colors.text)}>
                      {networkStatus.effectiveType}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Service Status */}
            <div className="space-y-2">
              <h4 className={cn('font-medium text-sm flex items-center space-x-2', colors.text)}>
                <ServiceStatusIcon className="h-4 w-4" />
                <span>Authentication Service</span>
              </h4>
              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className={colors.text}>Status:</span>
                  <span className={cn('font-medium capitalize', colors.text)}>
                    {serviceStatus.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={colors.text}>Last Checked:</span>
                  <span className={cn('font-medium', colors.text)}>
                    {serviceStatus.lastChecked.toLocaleTimeString()}
                  </span>
                </div>
                {serviceStatus.estimatedResolution && (
                  <div className="flex justify-between">
                    <span className={colors.text}>Est. Resolution:</span>
                    <span className={cn('font-medium', colors.text)}>
                      {serviceStatus.estimatedResolution.toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Offline Capabilities */}
            {!isOnline && (
              <div className="space-y-2">
                <h4 className={cn('font-medium text-sm', colors.text)}>Available Actions</h4>
                <div className="text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={colors.text}>Sign In:</span>
                    <span className={cn('font-medium', offlineCapabilities.canSignIn ? 'text-green-600' : 'text-red-600')}>
                      {offlineCapabilities.canSignIn ? 'Available' : 'Requires Internet'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={colors.text}>Sign Up:</span>
                    <span className={cn('font-medium', offlineCapabilities.canSignUp ? 'text-green-600' : 'text-red-600')}>
                      {offlineCapabilities.canSignUp ? 'Available' : 'Requires Internet'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={colors.text}>Password Reset:</span>
                    <span className={cn('font-medium', offlineCapabilities.canResetPassword ? 'text-green-600' : 'text-red-600')}>
                      {offlineCapabilities.canResetPassword ? 'Available' : 'Requires Internet'}
                    </span>
                  </div>
                </div>
                <p className={cn('text-xs mt-2', colors.text)}>
                  {offlineCapabilities.message}
                </p>
              </div>
            )}

            {/* Retry Recommendations */}
            {retryRecommendations.shouldRetry && (
              <div className="space-y-2">
                <h4 className={cn('font-medium text-sm', colors.text)}>Retry Information</h4>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className={colors.text}>Recommended Delay:</span>
                    <span className={cn('font-medium', colors.text)}>
                      {Math.round(retryRecommendations.recommendedDelay / 1000)}s
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={colors.text}>Max Attempts:</span>
                    <span className={cn('font-medium', colors.text)}>
                      {retryRecommendations.maxAttempts}
                    </span>
                  </div>
                  <p className={cn('text-xs mt-1', colors.text)}>
                    {retryRecommendations.reason}
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryConnection}
                className="flex-1"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Check Connection
              </Button>
              
              {!isOnline && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleOfflineMode}
                  className="flex-1"
                >
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline Mode
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

/**
 * Simple Network Status Badge
 */
export const NetworkStatusBadge: React.FC<{
  className?: string;
  showQuality?: boolean;
}> = ({ className, showQuality = false }) => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(
    networkErrorService.getNetworkStatus()
  );

  useEffect(() => {
    const handleNetworkChange = (status: NetworkStatus) => {
      setNetworkStatus(status);
    };

    networkErrorService.addNetworkStatusListener(handleNetworkChange);
    return () => networkErrorService.removeNetworkStatusListener(handleNetworkChange);
  }, []);

  const isOnline = networkStatus.isOnline;
  const quality = networkErrorService.getNetworkQuality();
  const NetworkIcon = getNetworkQualityIcon(quality);

  return (
    <Badge 
      variant={isOnline ? 'default' : 'destructive'} 
      className={cn('flex items-center space-x-1', className)}
    >
      <NetworkIcon className="h-3 w-3" />
      <span>
        {!isOnline ? 'Offline' : showQuality ? quality : 'Online'}
      </span>
    </Badge>
  );
};

/**
 * Service Status Banner
 */
export const ServiceStatusBanner: React.FC<{
  className?: string;
  service?: string;
}> = ({ className, service = 'auth' }) => {
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>(
    networkErrorService.getServiceStatus()
  );

  useEffect(() => {
    const handleServiceChange = (status: ServiceStatus) => {
      setServiceStatus(status);
    };

    networkErrorService.addServiceStatusListener(handleServiceChange);
    return () => networkErrorService.removeServiceStatusListener(handleServiceChange);
  }, []);

  // Don't show banner if service is operational
  if (serviceStatus.isAvailable && serviceStatus.status === 'operational') {
    return null;
  }

  const StatusIcon = getServiceStatusIcon(serviceStatus.status);
  const colors = getStatusColors(true, serviceStatus.status);

  return (
    <Alert className={cn('mb-4', colors.bg, className)}>
      <StatusIcon className={cn('h-4 w-4', colors.icon)} />
      <AlertDescription className={colors.text}>
        <div className="flex items-center justify-between">
          <div>
            <strong>Service Notice:</strong> {serviceStatus.message || 'Service status has changed'}
            {serviceStatus.estimatedResolution && (
              <div className="text-xs mt-1">
                Estimated resolution: {serviceStatus.estimatedResolution.toLocaleString()}
              </div>
            )}
          </div>
          <Badge variant="secondary" className={colors.badge}>
            {serviceStatus.status}
          </Badge>
        </div>
      </AlertDescription>
    </Alert>
  );
};