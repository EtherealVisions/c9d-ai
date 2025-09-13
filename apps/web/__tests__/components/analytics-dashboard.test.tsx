import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AnalyticsDashboard } from '@/components/analytics-dashboard'
import { ConversionFunnelService } from '@/lib/services/conversion-funnel-service'
import { ABTestingService } from '@/lib/services/ab-testing-service'
import { ConversionMetrics, ABTestResult } from '@/lib/types/analytics'

// Mock the services
vi.mock('@/lib/services/conversion-funnel-service', () => ({
  ConversionFunnelService: {
    analyzeConversionFunnel: vi.fn(),
    getTopConversionPaths: vi.fn(),
    optimizeFunnel: vi.fn(),
    exportFunnelData: vi.fn()
  }
}))

vi.mock('@/lib/services/ab-testing-service', () => ({
  ABTestingService: {
    getAllActiveTests: vi.fn(),
    analyzeTestResults: vi.fn(),
    getTestStatus: vi.fn()
  }
}))

// Mock Recharts components
vi.mock('recharts', () => ({
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  FunnelChart: ({ children }: any) => <div data-testid="funnel-chart">{children}</div>,
  Funnel: () => <div data-testid="funnel" />
}))

// Mock URL.createObjectURL and related APIs
Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'mock-url'),
    revokeObjectURL: vi.fn()
  }
})

describe('AnalyticsDashboard', () => {
  const mockConversionMetrics: ConversionMetrics = {
    totalVisitors: 1250,
    totalConversions: 87,
    conversionRate: 6.96,
    averageTimeToConvert: 1800000, // 30 minutes
    dropOffPoints: [
      {
        step: 'form_start',
        visitors: 200,
        dropOffRate: 75.5,
        commonExitPages: ['/pricing', '/contact']
      }
    ],
    funnelSteps: [
      {
        step: 'landing',
        visitors: 1250,
        conversions: 950,
        conversionRate: 76.0,
        averageTime: 45000,
        dropOffRate: 24.0
      },
      {
        step: 'hero_cta_click',
        visitors: 950,
        conversions: 420,
        conversionRate: 44.2,
        averageTime: 120000,
        dropOffRate: 55.8
      },
      {
        step: 'conversion',
        visitors: 87,
        conversions: 0,
        conversionRate: 0,
        averageTime: 0,
        dropOffRate: 0
      }
    ]
  }

  const mockABTestResults: ABTestResult[] = [
    {
      testId: 'hero_cta_test',
      variantId: 'control',
      metric: 'conversion_rate',
      value: 5.2,
      sampleSize: 500,
      conversionRate: 5.2,
      confidenceInterval: [4.1, 6.3],
      statisticalSignificance: 95,
      isWinner: false
    },
    {
      testId: 'hero_cta_test',
      variantId: 'variant_a',
      metric: 'conversion_rate',
      value: 7.8,
      sampleSize: 485,
      conversionRate: 7.8,
      confidenceInterval: [6.5, 9.1],
      statisticalSignificance: 98,
      isWinner: true
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mock returns
    ;(ConversionFunnelService.analyzeConversionFunnel as any).mockReturnValue(mockConversionMetrics)
    ;(ConversionFunnelService.getTopConversionPaths as any).mockReturnValue([
      {
        path: ['landing', 'hero_cta_click', 'conversion'],
        count: 45,
        conversionRate: 85.2
      },
      {
        path: ['landing', 'features_view', 'demo_request'],
        count: 32,
        conversionRate: 62.5
      }
    ])
    ;(ConversionFunnelService.optimizeFunnel as any).mockReturnValue([
      {
        step: 'form_start',
        recommendation: 'High drop-off rate (75.5%). Consider simplifying this step.',
        impact: 'High'
      }
    ])
    ;(ConversionFunnelService.exportFunnelData as any).mockReturnValue(JSON.stringify({ test: 'data' }))
    
    ;(ABTestingService.getAllActiveTests as any).mockReturnValue([
      { testId: 'hero_cta_test', name: 'Hero CTA Test', enabled: true }
    ])
    ;(ABTestingService.analyzeTestResults as any).mockReturnValue(mockABTestResults)
    ;(ABTestingService.getTestStatus as any).mockReturnValue('running')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('rendering', () => {
    it('should render dashboard with loading state initially', () => {
      render(<AnalyticsDashboard />)

      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should render dashboard with data after loading', async () => {
      render(<AnalyticsDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument()
      })

      expect(screen.getByText('1,250')).toBeInTheDocument() // Total visitors
      expect(screen.getByText('87')).toBeInTheDocument() // Total conversions
      expect(screen.getByText('6.96%')).toBeInTheDocument() // Conversion rate
    })

    it('should render all metric cards', async () => {
      render(<AnalyticsDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Total Visitors')).toBeInTheDocument()
        expect(screen.getByText('Conversions')).toBeInTheDocument()
        expect(screen.getByText('Conversion Rate')).toBeInTheDocument()
        expect(screen.getByText('Avg. Time to Convert')).toBeInTheDocument()
      })
    })

    it('should render export button', async () => {
      render(<AnalyticsDashboard />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export data/i })).toBeInTheDocument()
      })
    })
  })

  describe('tabs navigation', () => {
    it('should render all tab triggers', async () => {
      render(<AnalyticsDashboard />)

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: /conversion funnel/i })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: /a\/b tests/i })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: /performance/i })).toBeInTheDocument()
      })
    })

    it('should switch between tabs', async () => {
      render(<AnalyticsDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Conversion Funnel')).toBeInTheDocument()
      })

      // Click on funnel tab
      fireEvent.click(screen.getByRole('tab', { name: /conversion funnel/i }))
      
      await waitFor(() => {
        expect(screen.getByText('Detailed Funnel Analysis')).toBeInTheDocument()
      })

      // Click on A/B tests tab
      fireEvent.click(screen.getByRole('tab', { name: /a\/b tests/i }))
      
      await waitFor(() => {
        expect(screen.getByText('hero_cta_test')).toBeInTheDocument()
      })
    })
  })

  describe('overview tab', () => {
    it('should render conversion funnel chart', async () => {
      render(<AnalyticsDashboard />)

      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
      })
    })

    it('should render top conversion paths', async () => {
      render(<AnalyticsDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Top Conversion Paths')).toBeInTheDocument()
        expect(screen.getByText('85.2% conversion')).toBeInTheDocument()
        expect(screen.getByText('62.5% conversion')).toBeInTheDocument()
      })
    })

    it('should render drop-off points', async () => {
      render(<AnalyticsDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Drop-off Points')).toBeInTheDocument()
        expect(screen.getByText('form_start')).toBeInTheDocument()
        expect(screen.getByText('75.5%')).toBeInTheDocument()
      })
    })
  })

  describe('funnel tab', () => {
    beforeEach(async () => {
      render(<AnalyticsDashboard />)
      
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /conversion funnel/i })).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByRole('tab', { name: /conversion funnel/i }))
    })

    it('should render detailed funnel analysis', async () => {
      await waitFor(() => {
        expect(screen.getByText('Detailed Funnel Analysis')).toBeInTheDocument()
      })

      // Check for funnel steps
      expect(screen.getByText('landing')).toBeInTheDocument()
      expect(screen.getByText('hero_cta_click')).toBeInTheDocument()
      expect(screen.getByText('1,250 visitors')).toBeInTheDocument()
      expect(screen.getByText('76.0% conversion')).toBeInTheDocument()
    })

    it('should render optimization recommendations', async () => {
      await waitFor(() => {
        expect(screen.getByText('Optimization Recommendations')).toBeInTheDocument()
        expect(screen.getByText('High drop-off rate (75.5%). Consider simplifying this step.')).toBeInTheDocument()
        expect(screen.getByText('High Impact')).toBeInTheDocument()
      })
    })
  })

  describe('A/B tests tab', () => {
    beforeEach(async () => {
      render(<AnalyticsDashboard />)
      
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /a\/b tests/i })).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByRole('tab', { name: /a\/b tests/i }))
    })

    it('should render A/B test results', async () => {
      await waitFor(() => {
        expect(screen.getByText('hero_cta_test')).toBeInTheDocument()
        expect(screen.getByText('A/B Test Results')).toBeInTheDocument()
      })

      // Check for variant results
      expect(screen.getByText('Variant control')).toBeInTheDocument()
      expect(screen.getByText('Variant variant_a')).toBeInTheDocument()
      expect(screen.getByText('Winner')).toBeInTheDocument()
    })

    it('should show test status', async () => {
      await waitFor(() => {
        expect(screen.getByText('running')).toBeInTheDocument()
      })
    })

    it('should display variant metrics', async () => {
      await waitFor(() => {
        expect(screen.getByText('500')).toBeInTheDocument() // Sample size
        expect(screen.getByText('5.20%')).toBeInTheDocument() // Conversion rate
        expect(screen.getByText('95%')).toBeInTheDocument() // Confidence
      })
    })
  })

  describe('performance tab', () => {
    beforeEach(async () => {
      render(<AnalyticsDashboard />)
      
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /performance/i })).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByRole('tab', { name: /performance/i }))
    })

    it('should render Core Web Vitals', async () => {
      await waitFor(() => {
        expect(screen.getByText('Core Web Vitals')).toBeInTheDocument()
        expect(screen.getByText('LCP')).toBeInTheDocument()
        expect(screen.getByText('FID')).toBeInTheDocument()
        expect(screen.getByText('CLS')).toBeInTheDocument()
      })
    })

    it('should show performance status badges', async () => {
      await waitFor(() => {
        expect(screen.getAllByText('Good')).toHaveLength(3)
        expect(screen.getByText('Needs Improvement')).toBeInTheDocument()
      })
    })
  })

  describe('data export', () => {
    it('should export data when export button is clicked', async () => {
      // Mock document methods
      const mockAppendChild = vi.fn()
      const mockRemoveChild = vi.fn()
      const mockClick = vi.fn()
      
      const mockAnchor = {
        href: '',
        download: '',
        click: mockClick
      }

      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)
      vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild)
      vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild)

      render(<AnalyticsDashboard />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export data/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /export data/i }))

      expect(ConversionFunnelService.exportFunnelData).toHaveBeenCalled()
      expect(document.createElement).toHaveBeenCalledWith('a')
      expect(mockClick).toHaveBeenCalled()
      expect(mockAppendChild).toHaveBeenCalledWith(mockAnchor)
      expect(mockRemoveChild).toHaveBeenCalledWith(mockAnchor)
    })
  })

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      ;(ConversionFunnelService.analyzeConversionFunnel as any).mockImplementation(() => {
        throw new Error('Service error')
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(<AnalyticsDashboard />)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load analytics data:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })

    it('should show empty state when no A/B tests exist', async () => {
      ;(ABTestingService.getAllActiveTests as any).mockReturnValue([])
      ;(ABTestingService.analyzeTestResults as any).mockReturnValue([])

      render(<AnalyticsDashboard />)

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /a\/b tests/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('tab', { name: /a\/b tests/i }))

      await waitFor(() => {
        expect(screen.getByText('No active A/B tests found')).toBeInTheDocument()
      })
    })
  })

  describe('responsive behavior', () => {
    it('should render metric cards in responsive grid', async () => {
      render(<AnalyticsDashboard />)

      await waitFor(() => {
        const metricsContainer = screen.getByText('Total Visitors').closest('.grid')
        expect(metricsContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4')
      })
    })
  })

  describe('timeframe filtering', () => {
    it('should pass timeframe to analysis functions', async () => {
      const timeframe = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      }

      render(<AnalyticsDashboard timeframe={timeframe} />)

      await waitFor(() => {
        expect(ConversionFunnelService.analyzeConversionFunnel).toHaveBeenCalledWith(timeframe)
      })
    })

    it('should reload data when timeframe changes', async () => {
      const { rerender } = render(<AnalyticsDashboard />)

      await waitFor(() => {
        expect(ConversionFunnelService.analyzeConversionFunnel).toHaveBeenCalledTimes(1)
      })

      const newTimeframe = {
        start: new Date('2024-02-01'),
        end: new Date('2024-02-28')
      }

      rerender(<AnalyticsDashboard timeframe={newTimeframe} />)

      await waitFor(() => {
        expect(ConversionFunnelService.analyzeConversionFunnel).toHaveBeenCalledTimes(2)
        expect(ConversionFunnelService.analyzeConversionFunnel).toHaveBeenLastCalledWith(newTimeframe)
      })
    })
  })
})