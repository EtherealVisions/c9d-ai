import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock the config manager
vi.mock('@/lib/config/manager', () => ({
  getConfigManager: vi.fn(() => ({
    isInitialized: vi.fn(() => true),
    getHealthStatus: vi.fn(() => ({
      healthy: true,
      initialized: true,
      lastError: null,
      phaseHealth: null,
      configValidation: { valid: true, errors: [] }
    })),
    getStats: vi.fn(() => ({
      initialized: true,
      healthy: true,
      configCount: 10,
      lastRefresh: new Date().toISOString(),
      phaseConfigured: false,
      cacheEnabled: true,
      lastError: null
    })),
    performHealthCheck: vi.fn(() => Promise.resolve({
      healthy: true,
      checks: {
        configValidation: { status: 'pass', message: 'Configuration is valid' },
        phaseConnection: { status: 'pass', message: 'Phase.dev connection healthy' },
        initialization: { status: 'pass', message: 'Manager initialized successfully' }
      },
      errors: []
    })),
    get: vi.fn((key: string) => {
      const mockEnv: Record<string, string> = {
        'DATABASE_URL': 'postgresql://test',
        'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY': 'pk_test_123',
        'CLERK_SECRET_KEY': 'sk_test_123',
        'NEXT_PUBLIC_SUPABASE_URL': 'https://test.supabase.co',
        'SUPABASE_SERVICE_ROLE_KEY': 'test_service_role_key_123456789012345678901234567890'
      };
      return mockEnv[key];
    })
  }))
}));

// Mock the build error handler
vi.mock('@/lib/config/build-error-handler', () => ({
  getBuildErrorHandler: vi.fn(() => ({
    generateDiagnosticsReport: vi.fn(() => ({
      nodeVersion: 'v18.0.0',
      turboVersion: '2.5.6',
      pnpmVersion: '10.11.0',
      environment: 'test',
      workingDirectory: '/test',
      buildStartTime: new Date(),
      buildDuration: 1000,
      memoryUsage: {
        rss: 100 * 1024 * 1024,
        heapTotal: 50 * 1024 * 1024,
        heapUsed: 25 * 1024 * 1024,
        external: 5 * 1024 * 1024
      },
      errors: [],
      warnings: []
    }))
  }))
}));

describe('/api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return healthy status when all checks pass', async () => {
    const request = new NextRequest('http://localhost:3000/api/health');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('configuration');
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('environment');
    expect(data).toHaveProperty('checks');
    expect(typeof data.checks).toBe('object');
  });

  it('should include all required health checks', async () => {
    const request = new NextRequest('http://localhost:3000/api/health');
    const response = await GET(request);
    const data = await response.json();

    expect(data.checks).toHaveProperty('configuration');
    expect(data.checks).toHaveProperty('phaseConnection');
    expect(data.checks).toHaveProperty('initialization');
  });

  it('should handle errors gracefully', async () => {
    // Mock a failing config manager
    vi.doMock('@/lib/config/manager', () => ({
      getConfigManager: vi.fn(() => {
        throw new Error('Config manager failed');
      })
    }));

    const request = new NextRequest('http://localhost:3000/api/health');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('error');
    expect(data).toHaveProperty('error');
  });
});