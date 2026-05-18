# Design Document

## Overview

The legal document pages feature provides a static, performant, and accessible system for displaying legal documents on the C9D AI platform. The design leverages Next.js 15's App Router with static generation, Markdown-based content management, and modern web standards for accessibility and SEO.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js App Router                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Legal Pages (Static Generation)              │  │
│  │                                                        │  │
│  │  /legal/terms      → Terms of Service                │  │
│  │  /legal/privacy    → Privacy Policy                  │  │
│  │  /legal/data-use   → Data Use Policy                 │  │
│  │  /legal/security   → Security Policy                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Legal Document Component                      │  │
│  │  - Markdown rendering                                 │  │
│  │  - SEO metadata                                       │  │
│  │  - Accessibility features                             │  │
│  │  - Navigation                                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Content Layer                                 │  │
│  │  - Markdown files                                     │  │
│  │  - Metadata extraction                                │  │
│  │  - Content parsing                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Framework**: Next.js 15 with App Router
- **Rendering**: Static Site Generation (SSG)
- **Content**: Markdown with frontmatter
- **Markdown Parser**: `react-markdown` with `remark-gfm`
- **Styling**: Tailwind CSS with typography plugin
- **SEO**: Next.js metadata API
- **Accessibility**: Semantic HTML with ARIA attributes

## Components and Interfaces

### 1. Legal Document Page Component

```typescript
// app/legal/[slug]/page.tsx
interface LegalPageProps {
  params: {
    slug: string
  }
}

interface LegalDocumentMetadata {
  title: string
  description: string
  lastUpdated: string
  effectiveDate: string
}

interface LegalDocument {
  slug: string
  metadata: LegalDocumentMetadata
  content: string
}
```

### 2. Legal Document Layout

```typescript
// app/legal/layout.tsx
interface LegalLayoutProps {
  children: React.ReactNode
}

interface NavigationItem {
  title: string
  href: string
  slug: string
}
```

### 3. Markdown Renderer Component

```typescript
// components/legal/markdown-renderer.tsx
interface MarkdownRendererProps {
  content: string
  className?: string
}
```

### 4. Legal Navigation Component

```typescript
// components/legal/legal-navigation.tsx
interface LegalNavigationProps {
  currentSlug: string
  documents: NavigationItem[]
}
```

### 5. Document Header Component

```typescript
// components/legal/document-header.tsx
interface DocumentHeaderProps {
  title: string
  lastUpdated: string
  effectiveDate: string
}
```

## Data Models

### Legal Document Content Structure

```markdown
---
title: "Terms of Service"
description: "Terms and conditions for using the C9D AI platform"
lastUpdated: "2024-01-15"
effectiveDate: "2024-01-15"
---

# Terms of Service

## 1. Acceptance of Terms

Content here...

## 2. User Responsibilities

Content here...
```

### Legal Document Registry

```typescript
// lib/legal/document-registry.ts
export interface LegalDocumentConfig {
  slug: string
  title: string
  description: string
  filePath: string
  order: number
}

export const LEGAL_DOCUMENTS: LegalDocumentConfig[] = [
  {
    slug: 'terms',
    title: 'Terms of Service',
    description: 'Terms and conditions for using our platform',
    filePath: 'content/legal/terms.md',
    order: 1
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    description: 'How we collect, use, and protect your data',
    filePath: 'content/legal/privacy.md',
    order: 2
  },
  {
    slug: 'data-use',
    title: 'Data Use Policy',
    description: 'Our policies for data usage and processing',
    filePath: 'content/legal/data-use.md',
    order: 3
  },
  {
    slug: 'security',
    title: 'Security Policy',
    description: 'Our commitment to platform security',
    filePath: 'content/legal/security.md',
    order: 4
  }
]
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Document Accessibility

*For any* legal document slug in the registry, accessing `/legal/{slug}` should return a 200 status code and render the document without requiring authentication.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

### Property 2: Content Rendering Completeness

*For any* legal document with Markdown content, all Markdown elements (headings, lists, links, paragraphs) should be rendered as their corresponding HTML elements with proper semantic structure.

**Validates: Requirements 2.1, 2.2, 2.3, 2.5**

### Property 3: Responsive Typography

*For any* legal document viewed at any viewport width, the text should remain readable with appropriate font sizes and line heights that meet WCAG 2.1 Level AA standards.

**Validates: Requirements 2.4, 10.3**

### Property 4: Semantic HTML Structure

*For any* legal document, the rendered HTML should contain a proper heading hierarchy (h1 → h2 → h3) without skipping levels, enabling screen reader navigation.

**Validates: Requirements 3.1, 3.3**

### Property 5: Keyboard Navigation

*For any* interactive element on a legal page, keyboard navigation should provide visible focus indicators and allow access to all functionality without requiring a mouse.

**Validates: Requirements 3.2, 10.2**

### Property 6: SEO Metadata Completeness

*For any* legal document page, the HTML head should contain all required SEO elements: title tag, meta description, Open Graph tags, and canonical URL.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 7: Static Generation

*For any* legal document in the registry, the page should be pre-rendered at build time and served as static HTML without server-side processing.

**Validates: Requirements 6.1, 6.4**

### Property 8: Performance Metrics

*For any* legal document page, the Lighthouse performance score should be ≥ 90 and the page should load within 2 seconds on a simulated 3G network.

**Validates: Requirements 6.2, 6.3**

### Property 9: Navigation Consistency

*For any* legal document page, the navigation menu should list all documents in the registry and highlight the current document.

**Validates: Requirements 7.1, 7.2, 7.3**

### Property 10: Date Display

*For any* legal document with a lastUpdated date in its frontmatter, the rendered page should display this date in a human-readable format (e.g., "January 15, 2024").

**Validates: Requirements 8.1, 8.2, 8.5**

### Property 11: Print Stylesheet

*For any* legal document page, when the print media query is active, navigation and non-essential elements should be hidden and content should be formatted for printing.

**Validates: Requirements 9.1, 9.2, 9.3**

### Property 12: Mobile Viewport

*For any* legal document page viewed on a mobile device, the viewport meta tag should be properly configured and the page should pass Google's mobile-friendly test.

**Validates: Requirements 10.4, 10.5**

## Error Handling

### Content Loading Errors

```typescript
// lib/legal/content-loader.ts
export class LegalContentError extends Error {
  constructor(
    message: string,
    public readonly slug: string,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'LegalContentError'
  }
}

export async function loadLegalDocument(slug: string): Promise<LegalDocument> {
  try {
    const config = LEGAL_DOCUMENTS.find(doc => doc.slug === slug)
    if (!config) {
      throw new LegalContentError(`Unknown legal document: ${slug}`, slug)
    }
    
    const filePath = path.join(process.cwd(), config.filePath)
    const fileContent = await fs.readFile(filePath, 'utf-8')
    
    const { data: metadata, content } = matter(fileContent)
    
    return {
      slug,
      metadata: metadata as LegalDocumentMetadata,
      content
    }
  } catch (error) {
    if (error instanceof LegalContentError) {
      throw error
    }
    throw new LegalContentError(
      `Failed to load legal document: ${slug}`,
      slug,
      error as Error
    )
  }
}
```

### 404 Handling

```typescript
// app/legal/[slug]/page.tsx
export async function generateStaticParams() {
  return LEGAL_DOCUMENTS.map(doc => ({
    slug: doc.slug
  }))
}

// Next.js will automatically return 404 for non-existent slugs
```

### Markdown Parsing Errors

```typescript
// components/legal/markdown-renderer.tsx
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  try {
    return (
      <ReactMarkdown
        className={className}
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    )
  } catch (error) {
    console.error('Markdown rendering error:', error)
    return (
      <div className="text-red-600" role="alert">
        <p>Error rendering document content. Please try again later.</p>
      </div>
    )
  }
}
```

## Testing Strategy

### Unit Testing

**Framework**: Vitest with React Testing Library

**Test Coverage**:
- Content loader functions
- Markdown rendering component
- Navigation component
- Document header component
- Date formatting utilities
- Metadata extraction

**Example Unit Test**:
```typescript
// __tests__/unit/legal-content-loader.test.ts
describe('loadLegalDocument', () => {
  it('should load and parse legal document', async () => {
    const doc = await loadLegalDocument('terms')
    
    expect(doc.slug).toBe('terms')
    expect(doc.metadata.title).toBeDefined()
    expect(doc.content).toBeDefined()
  })
  
  it('should throw error for unknown document', async () => {
    await expect(loadLegalDocument('unknown')).rejects.toThrow(LegalContentError)
  })
})
```

### Integration Testing

**Test Coverage**:
- Full page rendering with real Markdown content
- Navigation between legal documents
- SEO metadata generation
- Static generation process

**Example Integration Test**:
```typescript
// __tests__/integration/legal-pages.integration.test.ts
describe('Legal Pages Integration', () => {
  it('should render complete legal page', async () => {
    const { container } = render(<LegalPage params={{ slug: 'terms' }} />)
    
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(container.querySelector('time')).toBeInTheDocument()
  })
})
```

### E2E Testing

**Framework**: Playwright

**Test Coverage**:
- User navigation through all legal documents
- Accessibility testing with axe-core
- Mobile responsiveness
- Print functionality
- Performance metrics

**Example E2E Test**:
```typescript
// __tests__/e2e/legal-navigation.e2e.test.ts
test('should navigate through all legal documents', async ({ page }) => {
  await page.goto('/legal/terms')
  
  // Verify initial page
  await expect(page.locator('h1')).toContainText('Terms of Service')
  
  // Navigate to privacy policy
  await page.click('a[href="/legal/privacy"]')
  await expect(page.locator('h1')).toContainText('Privacy Policy')
  
  // Verify navigation highlight
  await expect(page.locator('nav a[href="/legal/privacy"]')).toHaveClass(/active/)
})
```

### Accessibility Testing

**Tools**: axe-core, WAVE, Lighthouse

**Test Coverage**:
- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation
- Screen reader compatibility
- Color contrast ratios

**Example Accessibility Test**:
```typescript
// __tests__/accessibility/legal-pages.a11y.test.ts
test('should have no accessibility violations', async ({ page }) => {
  await page.goto('/legal/terms')
  
  const results = await new AxeBuilder({ page }).analyze()
  
  expect(results.violations).toHaveLength(0)
})
```

### Performance Testing

**Tools**: Lighthouse CI, WebPageTest

**Metrics**:
- Lighthouse Performance Score ≥ 90
- First Contentful Paint < 1.5s
- Largest Contentful Paint < 2.5s
- Time to Interactive < 3.5s
- Cumulative Layout Shift < 0.1

**Example Performance Test**:
```typescript
// __tests__/performance/legal-pages.perf.test.ts
test('should meet performance benchmarks', async ({ page }) => {
  await page.goto('/legal/terms')
  
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0]
    return {
      loadTime: navigation.loadEventEnd - navigation.fetchStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart
    }
  })
  
  expect(metrics.loadTime).toBeLessThan(2000) // 2 seconds
  expect(metrics.domContentLoaded).toBeLessThan(1500) // 1.5 seconds
})
```

### Property-Based Testing

**Framework**: fast-check

**Test Coverage**:
- Markdown rendering with arbitrary content
- Date formatting with various date inputs
- URL generation with different slugs

**Example Property Test**:
```typescript
// __tests__/property/markdown-rendering.property.test.ts
test('should safely render any valid markdown', () => {
  fc.assert(
    fc.property(fc.string(), (markdown) => {
      const result = renderMarkdown(markdown)
      
      // Should not throw errors
      expect(result).toBeDefined()
      
      // Should not contain script tags
      expect(result).not.toContain('<script')
    })
  )
})
```

## Implementation Details

### File Structure

```
apps/web/
├── app/
│   └── legal/
│       ├── layout.tsx                 # Legal pages layout
│       ├── [slug]/
│       │   └── page.tsx              # Dynamic legal page
│       └── page.tsx                  # Legal index page
├── components/
│   └── legal/
│       ├── markdown-renderer.tsx     # Markdown rendering
│       ├── legal-navigation.tsx      # Navigation menu
│       ├── document-header.tsx       # Document header
│       └── print-styles.tsx          # Print-specific styles
├── content/
│   └── legal/
│       ├── terms.md                  # Terms of Service
│       ├── privacy.md                # Privacy Policy
│       ├── data-use.md               # Data Use Policy
│       └── security.md               # Security Policy
├── lib/
│   └── legal/
│       ├── content-loader.ts         # Content loading utilities
│       ├── document-registry.ts      # Document configuration
│       └── metadata-generator.ts     # SEO metadata generation
└── __tests__/
    ├── unit/
    │   └── legal/
    ├── integration/
    │   └── legal/
    ├── e2e/
    │   └── legal/
    ├── accessibility/
    │   └── legal/
    └── performance/
        └── legal/
```

### Static Generation Configuration

```typescript
// app/legal/[slug]/page.tsx
export const dynamic = 'force-static'
export const revalidate = false // Never revalidate

export async function generateStaticParams() {
  return LEGAL_DOCUMENTS.map(doc => ({
    slug: doc.slug
  }))
}

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
  const document = await loadLegalDocument(params.slug)
  
  return {
    title: `${document.metadata.title} | C9D AI`,
    description: document.metadata.description,
    openGraph: {
      title: document.metadata.title,
      description: document.metadata.description,
      type: 'website',
      url: `https://c9d.ai/legal/${params.slug}`
    },
    alternates: {
      canonical: `https://c9d.ai/legal/${params.slug}`
    }
  }
}
```

### Markdown Component Customization

```typescript
// components/legal/markdown-components.tsx
export const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-4xl font-bold mb-6 mt-8">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-3xl font-semibold mb-4 mt-6">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-2xl font-semibold mb-3 mt-4">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mb-4 leading-relaxed">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-blue-600 hover:text-blue-800 underline"
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
    >
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
      {children}
    </code>
  )
}
```

### Print Styles

```css
/* styles/legal-print.css */
@media print {
  /* Hide navigation and non-essential elements */
  nav,
  footer,
  .no-print {
    display: none !important;
  }
  
  /* Optimize typography for print */
  body {
    font-size: 12pt;
    line-height: 1.5;
    color: #000;
  }
  
  /* Ensure proper page breaks */
  h1, h2, h3 {
    page-break-after: avoid;
  }
  
  /* Add URL to footer */
  @page {
    margin: 2cm;
    @bottom-right {
      content: "Page " counter(page) " of " counter(pages);
    }
  }
  
  /* Prevent orphans and widows */
  p {
    orphans: 3;
    widows: 3;
  }
}
```

### Accessibility Features

```typescript
// components/legal/legal-page.tsx
export function LegalPage({ document }: { document: LegalDocument }) {
  return (
    <article
      role="article"
      aria-labelledby="document-title"
      className="legal-document"
    >
      <header>
        <h1 id="document-title">{document.metadata.title}</h1>
        <time
          dateTime={document.metadata.lastUpdated}
          aria-label={`Last updated on ${formatDate(document.metadata.lastUpdated)}`}
        >
          Last updated: {formatDate(document.metadata.lastUpdated)}
        </time>
      </header>
      
      <nav aria-label="Legal documents navigation">
        <LegalNavigation currentSlug={document.slug} />
      </nav>
      
      <main>
        <MarkdownRenderer content={document.content} />
      </main>
    </article>
  )
}
```

## Performance Optimization

### Build-Time Optimization

1. **Static Generation**: All legal pages pre-rendered at build time
2. **Asset Optimization**: Images and fonts optimized during build
3. **Code Splitting**: Markdown renderer loaded only for legal pages
4. **Tree Shaking**: Unused code eliminated from bundles

### Runtime Optimization

1. **Caching Headers**: Long-term caching for static assets
2. **Compression**: Gzip/Brotli compression enabled
3. **CDN Distribution**: Static files served from edge locations
4. **Lazy Loading**: Non-critical resources loaded on demand

### Monitoring

```typescript
// lib/legal/analytics.ts
export function trackLegalPageView(slug: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'page_view', {
      page_title: `Legal - ${slug}`,
      page_location: window.location.href,
      page_path: `/legal/${slug}`
    })
  }
}
```

## Security Considerations

### Content Security

1. **Markdown Sanitization**: Prevent XSS through markdown content
2. **Link Validation**: Validate external links before rendering
3. **Content Integrity**: Hash verification for content files

### Access Control

1. **Public Access**: No authentication required
2. **Rate Limiting**: Prevent abuse of legal pages
3. **CORS Headers**: Appropriate CORS configuration

## Deployment Strategy

### Build Process

```json
// package.json
{
  "scripts": {
    "build:legal": "next build && npm run validate:legal",
    "validate:legal": "node scripts/validate-legal-content.js"
  }
}
```

### Content Validation Script

```typescript
// scripts/validate-legal-content.ts
import { LEGAL_DOCUMENTS } from '../lib/legal/document-registry'
import { loadLegalDocument } from '../lib/legal/content-loader'

async function validateLegalContent() {
  for (const config of LEGAL_DOCUMENTS) {
    try {
      const doc = await loadLegalDocument(config.slug)
      
      // Validate metadata
      if (!doc.metadata.title) {
        throw new Error(`Missing title for ${config.slug}`)
      }
      if (!doc.metadata.lastUpdated) {
        throw new Error(`Missing lastUpdated for ${config.slug}`)
      }
      
      // Validate content
      if (!doc.content || doc.content.length < 100) {
        throw new Error(`Insufficient content for ${config.slug}`)
      }
      
      console.log(`✓ Validated ${config.slug}`)
    } catch (error) {
      console.error(`✗ Validation failed for ${config.slug}:`, error)
      process.exit(1)
    }
  }
  
  console.log('All legal documents validated successfully')
}

validateLegalContent()
```

## Maintenance and Updates

### Content Update Process

1. Edit Markdown file in `content/legal/`
2. Update `lastUpdated` date in frontmatter
3. Commit changes to version control
4. Trigger build and deployment
5. Verify changes in production

### Version Control

```
content/legal/
├── terms.md          # Current version
├── privacy.md        # Current version
└── archive/          # Historical versions
    ├── terms-2023-01-01.md
    └── privacy-2023-01-01.md
```

## Success Metrics

### Performance Metrics
- Lighthouse Performance Score ≥ 90
- First Contentful Paint < 1.5s
- Time to Interactive < 3.5s
- Page load time < 2s on 3G

### Accessibility Metrics
- WCAG 2.1 Level AA compliance
- Zero critical accessibility violations
- Keyboard navigation support
- Screen reader compatibility

### SEO Metrics
- All pages indexed by search engines
- Proper meta tags on all pages
- Mobile-friendly score of 100
- Structured data validation

### User Experience Metrics
- Zero 404 errors for legal pages
- Print functionality working
- Mobile responsiveness verified
- Cross-browser compatibility
