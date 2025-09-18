/**
 * Maintenance Mode Component
 * Displays service unavailability and maintenance messages
 * Requirements: 10.3
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink, 
  Activity,
  CheckCircle,
  XCircle,
  Wrench,
  Server
} from 'lucide-react';
import { ServiceStatus, networkErrorService } from '@/lib/services/network-error-service';
import { cn } from '@/lib/utils';

interface MaintenanceModeProps {
  className?: string;
  showStatusPage?: boolean;
  showRetryButton?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  customMessage?: string;
  contactSupport?: boolean;
}

/**
 * Get maintenance type icon
 */
function getMaintenanceIcon(status: ServiceStatus['status']): React.ComponentType<any> {
  switch (status) {
    case 'maintenance':
      return Wrench;
    case 'outage':
      return XCircle;
    case 'degraded':
      return AlertTriangle;
    default:
      return Server;
  }
}

/**
 * Get status color scheme
 */
function getStatusColors(status: ServiceStatus['status']) {
  switch (status) {
    case 'maintenance':
      return {
        bg: 'bg-blue-50 border-blue-200',
        text: 'text-blue-900',
        icon: 'text-blue-600',
        badge: 'bg-blue-100 text-blue-800',
        button: 'border-blue-300 hover:bg-blue-50'
      };
    case 'outage':
      return {
        bg: 'bg-red-50 border-red-200',
        text: 'text-red-900',
        icon: 'text-red-600',
        badge: 'bg-red-100 text-red-800',
        button: 'border-red-300 hover:bg-red-50'
      };
    case 'degraded':
      return {
        bg: 'bg-yellow-50 border-yellow-200',
        text: 'text-yellow-900',
        icon: 'text-yellow-600',
        badge: 'bg-yellow-100 text-yellow-800',
        button: 'border-yellow-300 hover:bg-yellow-50'
      };
    default:
      return {
        bg: 'bg-gray-50 border-gray-200',
        text: 'text-gray-900',
        icon: 'text-gray-600',
        badge: 'bg-gray-100 text-gray-800',
        button: 'border-gray-300 hover:bg-gray-50'
      };
  }
}

/**
 * Format time remaining
 */
function formatTimeRemaining(estimatedResolution: Date): string {
  const now = new Date();
  const diff = estimatedResolution.getTime() - now.getTime();
  
  if (diff <= 0) return 'Soon';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Maintenance Mode Component
 */
export const MaintenanceMode: React.FC<MaintenanceModeProps> = ({
  className,
  showStatusPage = true,
  showRetryButton = true,
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
  customMessage,
  contactSupport = true
}) => {
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>(
    networkErrorService.getServiceStatus()
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [timeUntilNextRefresh, setTimeUntilNextRefresh] = useState(0);

  // Listen for service status changes
  useEffect(() => {
    const handleServiceChange = (status: ServiceStatus) => {
      setServiceStatus(status);
      setLastRefresh(new Date());
    };

    networkErrorService.addServiceStatusListener(handleServiceChange);
    return () => networkErrorService.removeServiceStatusListener(handleServiceChange);
  }, []);

  // Auto-refresh logic
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(async () => {
      try {
        await networkErrorService.checkServiceAvailability();
      } catch (error) {
        console.error('Failed to refresh service status:', error);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Countdown timer for next refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastRefresh.getTime();
      const remaining = Math.max(0, refreshInterval - elapsed);
      setTimeUntilNextRefresh(Math.ceil(remaining / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, lastRefresh]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await networkErrorService.checkServiceAvailability();
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to refresh service status:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStatusPage = () => {
    window.open('/status', '_blank');
  };

  const handleContactSupport = () => {
    window.open('/support', '_blank');
  };

  // Don't render if service is operational
  if (serviceStatus.isAvailable && serviceStatus.status === 'operational') {
    return null;
  }

  const MaintenanceIcon = getMaintenanceIcon(serviceStatus.status);
  const colors = getStatusColors(serviceStatus.status);

  const getStatusTitle = () => {
    switch (serviceStatus.status) {
      case 'maintenance':
        return 'Scheduled Maintenance';
      case 'outage':
        return 'Service Outage';
      case 'degraded':
        return 'Service Degraded';
      default:
        return 'Service Unavailable';
    }
  };

  const getStatusDescription = () => {
    if (customMessage) return customMessage;
    
    switch (serviceStatus.status) {
      case 'maintenance':
        return 'We are currently performing scheduled maintenance to improve our services. Authentication may be temporarily unavailable.';
      case 'outage':
        return 'We are experiencing technical difficulties with our authentication service. Our team is working to resolve this issue as quickly as possible.';
      case 'degraded':
        return 'Our authentication service is experiencing some issues. You may encounter slower response times or intermittent failures.';
      default:
        return serviceStatus.message || 'Authentication service is temporarily unavailable. Please try again later.';
    }
  };

  return (
    <div className={cn('w-full max-w-lg mx-auto', className)}>
      <Card className={cn('border-2', colors.bg)}>
        <CardHeader className="text-center pb-4">
          <div className={cn('mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4', colors.bg)}>
            <MaintenanceIcon className={cn('w-8 h-8', colors.icon)} />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <CardTitle className={cn('text-xl font-semibold', colors.text)}>
                {getStatusTitle()}
              </CardTitle>
              <Badge variant="secondary" className={colors.badge}>
                {serviceStatus.status}
              </Badge>
            </div>
            
            <CardDescription className={cn('text-sm leading-relaxed', colors.text)}>
              {getStatusDescription()}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Status Information */}
          <div className="space-y-3">
            {serviceStatus.estimatedResolution && (
              <Alert className={colors.bg}>
                <Clock className={cn('h-4 w-4', colors.icon)} />
                <AlertDescription className={colors.text}>
                  <div className="flex items-center justify-between">
                    <span>Estimated resolution:</span>
                    <span className="font-medium">
                      {formatTimeRemaining(serviceStatus.estimatedResolution)}
                    </span>
                  </div>
                  <div className="text-xs mt-1 opacity-75">
                    Expected by {serviceStatus.estimatedResolution.toLocaleString()}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {serviceStatus.affectedServices.length > 0 && (
              <div className="space-y-2">
                <h4 className={cn('font-medium text-sm', colors.text)}>Affected Services:</h4>
                <div className="flex flex-wrap gap-1">
                  {serviceStatus.affectedServices.map((service, index) => (
                    <Badge key={index} variant="outline" className={cn('text-xs', colors.badge)}>
                      {service}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className={cn('font-medium', colors.text)}>Last Updated:</span>
                <div className={colors.text}>
                  {serviceStatus.lastChecked.toLocaleTimeString()}
                </div>
              </div>
              {autoRefresh && (
                <div className="space-y-1">
                  <span className={cn('font-medium', colors.text)}>Next Check:</span>
                  <div className={colors.text}>
                    {timeUntilNextRefresh > 0 ? `${timeUntilNextRefresh}s` : 'Now'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {showRetryButton && (
              <Button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                variant="outline"
                className={cn('w-full', colors.button)}
              >
                <RefreshCw className={cn('w-4 h-4 mr-2', isRefreshing && 'animate-spin')} />
                {isRefreshing ? 'Checking Status...' : 'Check Status'}
              </Button>
            )}

            <div className="grid grid-cols-2 gap-2">
              {showStatusPage && (
                <Button
                  onClick={handleStatusPage}
                  variant="outline"
                  size="sm"
                  className={colors.button}
                >
                  <Activity className="w-3 h-3 mr-1" />
                  Status Page
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              )}

              {contactSupport && (
                <Button
                  onClick={handleContactSupport}
                  variant="outline"
                  size="sm"
                  className={colors.button}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Support
                </Button>
              )}
            </div>
          </div>

          {/* What You Can Do */}
          <div className="space-y-2">
            <h4 className={cn('font-medium text-sm', colors.text)}>What you can do:</h4>
            <ul className={cn('text-xs space-y-1 list-disc list-inside', colors.text)}>
              <li>Wait for the service to be restored</li>
              <li>Check our status page for updates</li>
              <li>Try refreshing this page in a few minutes</li>
              {serviceStatus.status === 'degraded' && (
                <li>You may still be able to sign in, but expect delays</li>
              )}
              <li>Contact support if you need immediate assistance</li>
            </ul>
          </div>

          {/* Additional Information */}
          {serviceStatus.status === 'maintenance' && (
            <Alert className={colors.bg}>
              <CheckCircle className={cn('h-4 w-4', colors.icon)} />
              <AlertDescription className={cn('text-xs', colors.text)}>
                This is planned maintenance. Your account and data are safe. 
                Normal service will resume shortly.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Compact Maintenance Banner
 */
export const MaintenanceBanner: React.FC<{
  className?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}> = ({ className, dismissible = false, onDismiss }) => {
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>(
    networkErrorService.getServiceStatus()
  );
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleServiceChange = (status: ServiceStatus) => {
      setServiceStatus(status);
      // Show banner again if status changes
      setIsDismissed(false);
    };

    networkErrorService.addServiceStatusListener(handleServiceChange);
    return () => networkErrorService.removeServiceStatusListener(handleServiceChange);
  }, []);

  // Don't render if service is operational or dismissed
  if (serviceStatus.isAvailable && serviceStatus.status === 'operational') {
    return null;
  }

  if (isDismissed) {
    return null;
  }

  const MaintenanceIcon = getMaintenanceIcon(serviceStatus.status);
  const colors = getStatusColors(serviceStatus.status);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <Alert className={cn('mb-4', colors.bg, className)}>
      <MaintenanceIcon className={cn('h-4 w-4', colors.icon)} />
      <AlertDescription className={colors.text}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">Service Notice:</span>
              <Badge variant="secondary" className={colors.badge}>
                {serviceStatus.status}
              </Badge>
            </div>
            <div className="text-sm mt-1">
              {serviceStatus.message || 'Authentication service is experiencing issues'}
              {serviceStatus.estimatedResolution && (
                <span className="ml-2">
                  • Est. resolution: {formatTimeRemaining(serviceStatus.estimatedResolution)}
                </span>
              )}
            </div>
          </div>
          {dismissible && (
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className={cn('ml-2 h-6 w-6 p-0', colors.text)}
            >
              ×
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};