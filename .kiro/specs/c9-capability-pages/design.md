# Design Document

## Overview

The C9 Suite Capability Pages feature implements five dedicated solution-specific pages for each C9 capability: Insight, Persona, Domain, Orchestrator, and Narrative. The design follows a modular, template-based approach that maintains consistency while allowing for capability-specific customization. Each page leverages Next.js App Router for optimal performance, implements responsive design patterns, and integrates with the existing C9d.ai design system including the vibrant color palette and gentle floating animations.

## Architecture

### Page Structure and Routing

The capability pages follow Next.js App Router conventions with dynamic routing for scalability:

```
app/
├── capabilities/
│   ├── [capability]/
│   │   ├── page.tsx           # Dynamic capability page
│   │   ├── loading.tsx        # Loading state
│   │   └── not-found.tsx      # 404 handling
│   ├── layout.tsx             # Shared capability layout
│   └── page.tsx               # Capabilities overview/index
```

### URL Structure
- `/capabilities` - Overview of all capabilities
- `/capabilities/insight` - C9 Insight capability page
- `/capabilities/persona` - C9 Persona capability page  
- `/capabilities/domain` - C9 Domain capability page
- `/capabilities/orchestrator` - C9 Orchestrator capability page
- `/capabilities/narrative` - C9 Narrative capability page

### Data Architecture

Capability data is structured as TypeScript interfaces with comprehensive type safety:

```typescript
interface Capability {
  id: CapabilityId
  name: string
  tagline: string
  description: string
  features: Feature[]
  useCases: UseCase[]
  technicalSpecs: TechnicalSpec[]
  valueProposition: string
  ctaOptions: CTAOption[]
  colorTheme: ColorTheme
  animations: AnimationConfig
}

interface UseCase {
  industry: Industry
  title: string
  description: string
  benefits: string[]
  examples: string[]
}

interface TechnicalSpec {
  category: string
  features: string[]
  apis: APIEndpoint[]
  integrations: Integration[]
}
```

## Components and Interfaces

### Core Components

#### CapabilityPage Component
```typescript
interface CapabilityPageProps {
  capability: Capability
  relatedCapabilities: Capability[]
}

export function CapabilityPage({ capability, relatedCapabilities }: CapabilityPageProps) {
  return (
    <div className="capability-page">
      <CapabilityHero capability={capability} />
      <CapabilityFeatures features={capability.features} />
      <CapabilityUseCases useCases={capability.useCases} />
      <CapabilityTechnicalSpecs specs={capability.technicalSpecs} />
      <CapabilityCTA options={capability.ctaOptions} />
      <RelatedCapabilities capabilities={relatedCapabilities} />
    </div>
  )
}
```

#### CapabilityHero Component
```typescript
interface CapabilityHeroProps {
  capability: Capability
}

export function CapabilityHero({ capability }: CapabilityHeroProps) {
  return (
    <section className="capability-hero">
      <div className="hero-background">
        <FloatingAnimations config={capability.animations} />
      </div>
      <div className="hero-content">
        <h1 className="capability-title">{capability.name}</h1>
        <p className="capability-tagline">{capability.tagline}</p>
        <div className="capability-description">
          {capability.description}
        </div>
        <CapabilityNavigation currentCapability={capability.id} />
      </div>
    </section>
  )
}
```

#### CapabilityFeatures Component
```typescript
interface CapabilityFeaturesProps {
  features: Feature[]
}

export function CapabilityFeatures({ features }: CapabilityFeaturesProps) {
  return (
    <section className="capability-features">
      <h2>Key Features</h2>
      <div className="features-grid">
        {features.map((feature) => (
          <FeatureCard key={feature.id} feature={feature} />
        ))}
      </div>
    </section>
  )
}
```

#### CapabilityUseCases Component
```typescript
interface CapabilityUseCasesProps {
  useCases: UseCase[]
}

export function CapabilityUseCases({ useCases }: CapabilityUseCasesProps) {
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null)
  
  return (
    <section className="capability-use-cases">
      <h2>Use Cases</h2>
      <IndustryFilter 
        industries={getUniqueIndustries(useCases)}
        selected={selectedIndustry}
        onSelect={setSelectedIndustry}
      />
      <UseCaseGrid 
        useCases={filterByIndustry(useCases, selectedIndustry)}
      />
    </section>
  )
}
```

#### CapabilityTechnicalSpecs Component
```typescript
interface CapabilityTechnicalSpecsProps {
  specs: TechnicalSpec[]
}

export function CapabilityTechnicalSpecs({ specs }: CapabilityTechnicalSpecsProps) {
  return (
    <section className="capability-technical-specs">
      <h2>Technical Specifications</h2>
      <div className="specs-accordion">
        {specs.map((spec) => (
          <TechnicalSpecAccordion key={spec.category} spec={spec} />
        ))}
      </div>
    </section>
  )
}
```

### Shared Components

#### CapabilityNavigation Component
```typescript
interface CapabilityNavigationProps {
  currentCapability: CapabilityId
}

export function CapabilityNavigation({ currentCapability }: CapabilityNavigationProps) {
  const capabilities = useCapabilities()
  
  return (
    <nav className="capability-navigation">
      <div className="nav-pills">
        {capabilities.map((capability) => (
          <Link
            key={capability.id}
            href={`/capabilities/${capability.id}`}
            className={cn(
              "nav-pill",
              currentCapability === capability.id && "active"
            )}
          >
            {capability.name}
          </Link>
        ))}
      </div>
    </nav>
  )
}
```

#### FloatingAnimations Component
```typescript
interface FloatingAnimationsProps {
  config: AnimationConfig
}

export function FloatingAnimations({ config }: FloatingAnimationsProps) {
  return (
    <div className="floating-animations">
      {config.elements.map((element, index) => (
        <div
          key={index}
          className={cn("floating-element", element.type)}
          style={{
            '--animation-duration': `${element.duration}s`,
            '--animation-delay': `${element.delay}s`,
            '--color-primary': element.color,
          }}
        />
      ))}
    </div>
  )
}
```

## Data Models

### Capability Data Structure

Each capability is defined with comprehensive data including content, styling, and behavior configuration:

```typescript
// lib/data/capabilities.ts
export const capabilities: Record<CapabilityId, Capability> = {
  insight: {
    id: 'insight',
    name: 'C9 Insight',
    tagline: 'Coordinating patterns across time, space, and data.',
    description: 'C9 Insight turns raw data into foresight. With APIs for correlation, forecasting, and anomaly detection, it helps organizations reveal hidden connections and predict what comes next.',
    features: [
      {
        id: 'correlation-apis',
        title: 'Entity & Temporal Correlation APIs',
        description: 'Advanced correlation analysis across entities and time periods',
        icon: 'correlation'
      },
      {
        id: 'forecasting',
        title: 'Contextual Forecasting & Predictive Models',
        description: 'AI-powered forecasting with contextual awareness',
        icon: 'forecast'
      },
      {
        id: 'anomaly-detection',
        title: 'Time-series Anomaly Detection',
        description: 'Real-time detection of anomalies in time-series data',
        icon: 'anomaly'
      },
      {
        id: 'trend-analysis',
        title: 'Cross-location & Multi-factor Trend Analysis',
        description: 'Comprehensive trend analysis across multiple dimensions',
        icon: 'trends'
      }
    ],
    useCases: [
      {
        industry: 'education',
        title: 'Forecast Class Attendance and Resource Needs',
        description: 'Predict student attendance patterns and optimize resource allocation',
        benefits: [
          'Improved resource utilization',
          'Better student engagement',
          'Cost optimization'
        ],
        examples: [
          'Predicting peak library usage times',
          'Forecasting cafeteria demand',
          'Optimizing classroom scheduling'
        ]
      },
      // ... other use cases
    ],
    technicalSpecs: [
      {
        category: 'APIs',
        features: [
          'RESTful correlation APIs',
          'GraphQL query interface',
          'WebSocket real-time streams'
        ],
        apis: [
          {
            endpoint: '/api/v1/correlations',
            method: 'POST',
            description: 'Analyze correlations between entities'
          }
        ],
        integrations: [
          {
            name: 'Supabase',
            type: 'database',
            description: 'Direct database integration for data analysis'
          }
        ]
      }
    ],
    valueProposition: 'Data doesn\'t just tell you what happened — it can tell you what\'s about to happen. C9 Insight coordinates across time and context to give you clarity before your competitors.',
    ctaOptions: [
      {
        type: 'primary',
        text: 'Request Insight Demo',
        href: '/demo/insight',
        description: 'See C9 Insight in action with your data'
      },
      {
        type: 'secondary',
        text: 'Download Insight Whitepaper',
        href: '/resources/insight-whitepaper',
        description: 'Learn about correlation analysis techniques'
      }
    ],
    colorTheme: {
      primary: 'hsl(var(--electric-blue))',
      secondary: 'hsl(var(--teal-accent))',
      gradient: 'linear-gradient(135deg, var(--electric-blue), var(--teal-accent))'
    },
    animations: {
      elements: [
        {
          type: 'data-point',
          duration: 8,
          delay: 0,
          color: 'hsl(var(--electric-blue))'
        },
        {
          type: 'connection-line',
          duration: 12,
          delay: 2,
          color: 'hsl(var(--teal-accent))'
        }
      ]
    }
  },
  // ... other capabilities (persona, domain, orchestrator, narrative)
}
```

### Content Management Integration

For content management capabilities, the design includes a flexible content structure:

```typescript
// lib/cms/capability-content.ts
interface CapabilityContent {
  capability: CapabilityId
  content: {
    hero: HeroContent
    features: FeatureContent[]
    useCases: UseCaseContent[]
    technicalSpecs: TechnicalSpecContent[]
    cta: CTAContent[]
  }
  metadata: {
    lastUpdated: string
    version: string
    author: string
  }
}

export async function getCapabilityContent(
  capabilityId: CapabilityId
): Promise<CapabilityContent> {
  // Integration with CMS or database
  return await fetchCapabilityContent(capabilityId)
}
```

## Error Handling

### Error Boundaries and Fallbacks

```typescript
// components/capability-error-boundary.tsx
export function CapabilityErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="capability-error">
          <h2>Something went wrong loading this capability</h2>
          <p>We're having trouble loading the capability information.</p>
          <button onClick={resetError}>Try Again</button>
          <Link href="/capabilities">View All Capabilities</Link>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}
```

### 404 Handling for Invalid Capabilities

```typescript
// app/capabilities/[capability]/not-found.tsx
export default function CapabilityNotFound() {
  return (
    <div className="capability-not-found">
      <h1>Capability Not Found</h1>
      <p>The capability you're looking for doesn't exist.</p>
      <div className="available-capabilities">
        <h2>Available Capabilities:</h2>
        <CapabilityGrid capabilities={getAllCapabilities()} />
      </div>
    </div>
  )
}
```

## Testing Strategy

### Component Testing

```typescript
// __tests__/components/capability-page.test.tsx
describe('CapabilityPage', () => {
  const mockCapability = createMockCapability('insight')
  
  it('should render capability hero section', () => {
    render(<CapabilityPage capability={mockCapability} relatedCapabilities={[]} />)
    
    expect(screen.getByText(mockCapability.name)).toBeInTheDocument()
    expect(screen.getByText(mockCapability.tagline)).toBeInTheDocument()
  })
  
  it('should render all use cases', () => {
    render(<CapabilityPage capability={mockCapability} relatedCapabilities={[]} />)
    
    mockCapability.useCases.forEach(useCase => {
      expect(screen.getByText(useCase.title)).toBeInTheDocument()
    })
  })
  
  it('should handle capability navigation', () => {
    render(<CapabilityPage capability={mockCapability} relatedCapabilities={[]} />)
    
    const navLinks = screen.getAllByRole('link')
    expect(navLinks.length).toBeGreaterThan(0)
  })
})
```

### Integration Testing

```typescript
// __tests__/integration/capability-routing.test.tsx
describe('Capability Routing', () => {
  it('should navigate between capability pages', async () => {
    render(<App />)
    
    // Navigate to insight capability
    await user.click(screen.getByText('C9 Insight'))
    expect(screen.getByText('Coordinating patterns across time, space, and data.')).toBeInTheDocument()
    
    // Navigate to persona capability
    await user.click(screen.getByText('C9 Persona'))
    expect(screen.getByText('AI that represents your brand, your way.')).toBeInTheDocument()
  })
  
  it('should handle invalid capability URLs', async () => {
    render(<App initialEntries={['/capabilities/invalid']} />)
    
    expect(screen.getByText('Capability Not Found')).toBeInTheDocument()
  })
})
```

### Performance Testing

```typescript
// __tests__/performance/capability-loading.test.tsx
describe('Capability Page Performance', () => {
  it('should load capability pages within performance budget', async () => {
    const startTime = performance.now()
    
    render(<CapabilityPage capability={mockCapability} relatedCapabilities={[]} />)
    
    await waitFor(() => {
      expect(screen.getByTestId('capability-content')).toBeInTheDocument()
    })
    
    const loadTime = performance.now() - startTime
    expect(loadTime).toBeLessThan(1000) // Should load within 1 second
  })
})
```

## Performance Optimization

### Code Splitting and Lazy Loading

```typescript
// Dynamic imports for capability-specific components
const CapabilityInsightFeatures = lazy(() => import('./insight/insight-features'))
const CapabilityPersonaFeatures = lazy(() => import('./persona/persona-features'))

// Lazy load capability data
export async function getCapabilityData(id: CapabilityId) {
  const { default: capabilityData } = await import(`./data/${id}-capability.json`)
  return capabilityData
}
```

### Image Optimization

```typescript
// Optimized images for capability pages
export function CapabilityImage({ src, alt, capability }: CapabilityImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={800}
      height={600}
      priority={capability === 'insight'} // Prioritize first capability
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,..."
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  )
}
```

### Animation Performance

```typescript
// Hardware-accelerated animations
.floating-element {
  will-change: transform;
  transform: translateZ(0); /* Force hardware acceleration */
  animation: float var(--animation-duration) ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
  25% { transform: translate3d(10px, -10px, 0) rotate(1deg); }
  50% { transform: translate3d(-5px, -20px, 0) rotate(-1deg); }
  75% { transform: translate3d(-10px, -10px, 0) rotate(0.5deg); }
}
```

## SEO and Metadata

### Dynamic Metadata Generation

```typescript
// app/capabilities/[capability]/page.tsx
export async function generateMetadata({ params }: { params: { capability: string } }): Promise<Metadata> {
  const capability = await getCapabilityData(params.capability as CapabilityId)
  
  if (!capability) {
    return {
      title: 'Capability Not Found | C9d.ai',
      description: 'The requested capability page could not be found.'
    }
  }
  
  return {
    title: `${capability.name} | C9d.ai`,
    description: capability.description,
    keywords: [
      capability.name,
      ...capability.features.map(f => f.title),
      ...capability.useCases.map(uc => uc.industry)
    ],
    openGraph: {
      title: `${capability.name} - ${capability.tagline}`,
      description: capability.description,
      images: [`/images/capabilities/${capability.id}-og.jpg`],
      type: 'website'
    },
    twitter: {
      card: 'summary_large_image',
      title: `${capability.name} - ${capability.tagline}`,
      description: capability.description,
      images: [`/images/capabilities/${capability.id}-twitter.jpg`]
    }
  }
}
```

### Structured Data

```typescript
// components/capability-structured-data.tsx
export function CapabilityStructuredData({ capability }: { capability: Capability }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": capability.name,
    "description": capability.description,
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": capability.features.map(f => f.title)
  }
  
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}
```

## Accessibility Implementation

### Semantic HTML Structure

```typescript
// Proper heading hierarchy and semantic elements
export function CapabilityPage({ capability }: CapabilityPageProps) {
  return (
    <main className="capability-page">
      <header>
        <h1>{capability.name}</h1>
        <p className="tagline">{capability.tagline}</p>
      </header>
      
      <section aria-labelledby="features-heading">
        <h2 id="features-heading">Key Features</h2>
        {/* Features content */}
      </section>
      
      <section aria-labelledby="use-cases-heading">
        <h2 id="use-cases-heading">Use Cases</h2>
        {/* Use cases content */}
      </section>
      
      <section aria-labelledby="technical-specs-heading">
        <h2 id="technical-specs-heading">Technical Specifications</h2>
        {/* Technical specs content */}
      </section>
    </main>
  )
}
```

### Keyboard Navigation

```typescript
// Enhanced keyboard navigation for capability navigation
export function CapabilityNavigation({ currentCapability }: CapabilityNavigationProps) {
  const [focusedIndex, setFocusedIndex] = useState(0)
  
  const handleKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowLeft':
        setFocusedIndex(prev => Math.max(0, prev - 1))
        break
      case 'ArrowRight':
        setFocusedIndex(prev => Math.min(capabilities.length - 1, prev + 1))
        break
      case 'Enter':
      case ' ':
        // Navigate to focused capability
        break
    }
  }
  
  return (
    <nav 
      className="capability-navigation"
      role="tablist"
      onKeyDown={handleKeyDown}
    >
      {/* Navigation items */}
    </nav>
  )
}
```

## Analytics and Tracking

### Capability-Specific Analytics

```typescript
// lib/analytics/capability-tracking.ts
export function trackCapabilityView(capabilityId: CapabilityId) {
  analytics.track('Capability Page Viewed', {
    capability: capabilityId,
    timestamp: new Date().toISOString(),
    url: window.location.href
  })
}

export function trackCapabilityCTA(capabilityId: CapabilityId, ctaType: string) {
  analytics.track('Capability CTA Clicked', {
    capability: capabilityId,
    ctaType,
    timestamp: new Date().toISOString()
  })
}

export function trackCapabilityEngagement(capabilityId: CapabilityId, section: string, timeSpent: number) {
  analytics.track('Capability Section Engagement', {
    capability: capabilityId,
    section,
    timeSpent,
    timestamp: new Date().toISOString()
  })
}
```

This comprehensive design provides a solid foundation for implementing the C9 Suite Capability Pages feature with proper architecture, component structure, performance optimization, and user experience considerations.