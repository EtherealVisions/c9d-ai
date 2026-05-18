# Implementation Plan

- [ ] 1. Set up project structure and dependencies
  - Create directory structure for legal pages
  - Install required dependencies (react-markdown, remark-gfm, gray-matter)
  - Configure TypeScript types for legal documents
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 2. Create legal document content files
  - [ ] 2.1 Create Terms of Service markdown file with frontmatter
    - Write content/legal/terms.md with title, description, dates
    - Include proper heading hierarchy and sections
    - _Requirements: 1.1, 2.1, 5.1, 8.1_

  - [ ] 2.2 Create Privacy Policy markdown file with frontmatter
    - Write content/legal/privacy.md with title, description, dates
    - Include proper heading hierarchy and sections
    - _Requirements: 1.2, 2.1, 5.1, 8.1_

  - [ ] 2.3 Create Data Use Policy markdown file with frontmatter
    - Write content/legal/data-use.md with title, description, dates
    - Include proper heading hierarchy and sections
    - _Requirements: 1.3, 2.1, 5.1, 8.1_

  - [ ] 2.4 Create Security Policy markdown file with frontmatter
    - Write content/legal/security.md with title, description, dates
    - Include proper heading hierarchy and sections
    - _Requirements: 1.4, 2.1, 5.1, 8.1_

- [ ] 3. Implement core legal document infrastructure
  - [ ] 3.1 Create document registry configuration
    - Implement lib/legal/document-registry.ts with LEGAL_DOCUMENTS array
    - Define LegalDocumentConfig interface
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ] 3.2 Implement content loader utility
    - Create lib/legal/content-loader.ts with loadLegalDocument function
    - Implement LegalContentError class
    - Add frontmatter parsing with gray-matter
    - _Requirements: 1.5, 5.1, 5.5_

  - [ ] 3.3 Write property test for content loader
    - **Property 1: Document Accessibility**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

  - [ ] 3.4 Implement metadata generator utility
    - Create lib/legal/metadata-generator.ts
    - Generate SEO metadata from document frontmatter
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ] 3.5 Write property test for metadata generation
    - **Property 6: SEO Metadata Completeness**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [ ] 4. Build markdown rendering components
  - [ ] 4.1 Create markdown renderer component
    - Implement components/legal/markdown-renderer.tsx
    - Configure react-markdown with remark-gfm
    - Add error boundary for parsing errors
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 4.2 Create custom markdown components
    - Implement components/legal/markdown-components.tsx
    - Style headings, paragraphs, lists, links, code blocks
    - Ensure semantic HTML structure
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.3_

  - [ ] 4.3 Write property test for markdown rendering
    - **Property 2: Content Rendering Completeness**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.5**

  - [ ] 4.4 Write property test for semantic HTML
    - **Property 4: Semantic HTML Structure**
    - **Validates: Requirements 3.1, 3.3**

- [ ] 5. Implement navigation components
  - [ ] 5.1 Create legal navigation component
    - Implement components/legal/legal-navigation.tsx
    - Display all documents from registry
    - Highlight current document
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ] 5.2 Write property test for navigation
    - **Property 9: Navigation Consistency**
    - **Validates: Requirements 7.1, 7.2, 7.3**

  - [ ] 5.3 Create document header component
    - Implement components/legal/document-header.tsx
    - Display title and last updated date
    - Format dates in human-readable format
    - _Requirements: 8.1, 8.2, 8.5_

  - [ ] 5.4 Write property test for date display
    - **Property 10: Date Display**
    - **Validates: Requirements 8.1, 8.2, 8.5**

- [ ] 6. Create legal page routes
  - [ ] 6.1 Implement legal layout
    - Create app/legal/layout.tsx
    - Add common navigation and footer
    - Include accessibility landmarks
    - _Requirements: 3.1, 7.4, 7.5_

  - [ ] 6.2 Implement dynamic legal page
    - Create app/legal/[slug]/page.tsx
    - Configure static generation with generateStaticParams
    - Implement generateMetadata for SEO
    - Load and render legal documents
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 4.4_

  - [ ] 6.3 Write property test for static generation
    - **Property 7: Static Generation**
    - **Validates: Requirements 6.1, 6.4**

  - [ ] 6.4 Create legal index page
    - Create app/legal/page.tsx
    - List all available legal documents
    - Provide navigation to each document
    - _Requirements: 7.1, 7.3_

- [ ] 7. Implement styling and responsive design
  - [ ] 7.1 Create base legal page styles
    - Add Tailwind CSS classes for typography
    - Implement responsive breakpoints
    - Ensure mobile-friendly layout
    - _Requirements: 2.4, 10.1, 10.3_

  - [ ] 7.2 Write property test for responsive typography
    - **Property 3: Responsive Typography**
    - **Validates: Requirements 2.4, 10.3**

  - [ ] 7.3 Implement print styles
    - Create styles/legal-print.css
    - Hide navigation and non-essential elements for print
    - Optimize typography for print
    - Add page breaks and print footer
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ] 7.4 Write property test for print styles
    - **Property 11: Print Stylesheet**
    - **Validates: Requirements 9.1, 9.2, 9.3**

- [ ] 8. Implement accessibility features
  - [ ] 8.1 Add ARIA labels and semantic HTML
    - Add role attributes to legal page components
    - Include aria-labelledby and aria-describedby
    - Ensure proper heading hierarchy
    - _Requirements: 3.1, 3.3, 3.5_

  - [ ] 8.2 Write property test for ARIA attributes
    - **Property 5: Keyboard Navigation**
    - **Validates: Requirements 3.2, 10.2**

  - [ ] 8.3 Implement keyboard navigation support
    - Ensure all interactive elements are keyboard accessible
    - Add visible focus indicators
    - Test tab order
    - _Requirements: 3.2, 10.2_

  - [ ] 8.4 Add descriptive link text
    - Ensure all links have meaningful text
    - Avoid generic "click here" text
    - _Requirements: 3.4_

- [ ] 9. Implement SEO optimization
  - [ ] 9.1 Configure metadata for all pages
    - Add title tags with proper format
    - Add meta descriptions
    - Add Open Graph tags
    - Add canonical URLs
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ] 9.2 Add structured data markup
    - Implement JSON-LD for legal documents
    - Include document type, date published, date modified
    - _Requirements: 4.5_

  - [ ] 9.3 Configure mobile viewport
    - Add viewport meta tag
    - Ensure proper mobile rendering
    - _Requirements: 10.4_

  - [ ] 9.4 Write property test for mobile viewport
    - **Property 12: Mobile Viewport**
    - **Validates: Requirements 10.4, 10.5**

- [ ] 10. Implement performance optimizations
  - [ ] 10.1 Configure static generation
    - Set dynamic = 'force-static'
    - Set revalidate = false
    - Implement generateStaticParams
    - _Requirements: 6.1_

  - [ ] 10.2 Optimize assets
    - Configure image optimization
    - Enable compression
    - Add cache headers
    - _Requirements: 6.4, 6.5_

  - [ ] 10.3 Write property test for cache headers
    - **Property 8: Performance Metrics**
    - **Validates: Requirements 6.2, 6.3**

- [ ] 11. Create content validation script
  - [ ] 11.1 Implement validation script
    - Create scripts/validate-legal-content.ts
    - Validate all documents have required metadata
    - Validate content length and structure
    - _Requirements: 5.2_

  - [ ] 11.2 Write unit tests for validation script
    - Test metadata validation
    - Test content validation
    - Test error handling
    - _Requirements: 5.2_

- [ ] 12. Write comprehensive unit tests
  - [ ] 12.1 Test content loader
    - Test successful document loading
    - Test error handling for missing documents
    - Test frontmatter parsing
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.1_

  - [ ] 12.2 Test markdown renderer
    - Test heading rendering
    - Test list rendering
    - Test link rendering
    - Test error handling
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 12.3 Test navigation component
    - Test document list rendering
    - Test current document highlighting
    - Test navigation links
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ] 12.4 Test document header
    - Test title display
    - Test date formatting
    - Test date display
    - _Requirements: 8.1, 8.2, 8.5_

- [ ] 13. Write integration tests
  - [ ] 13.1 Test full page rendering
    - Test complete legal page with real content
    - Test navigation integration
    - Test metadata generation
    - _Requirements: 1.5, 4.1, 4.2, 4.3, 4.4_

  - [ ] 13.2 Test static generation process
    - Test generateStaticParams
    - Test generateMetadata
    - Test page rendering
    - _Requirements: 6.1, 6.4_

  - [ ] 13.3 Test navigation between documents
    - Test clicking navigation links
    - Test current page highlighting
    - Test footer navigation
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [ ] 14. Write E2E tests
  - [ ] 14.1 Test user navigation flow
    - Test navigating to each legal document
    - Test navigation menu functionality
    - Test back to main site link
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 7.3, 7.4_

  - [ ] 14.2 Test accessibility with axe-core
    - Test semantic HTML structure
    - Test ARIA labels
    - Test keyboard navigation
    - Test screen reader compatibility
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 14.3 Test mobile responsiveness
    - Test responsive design at various breakpoints
    - Test touch-friendly navigation
    - Test mobile typography
    - _Requirements: 2.4, 10.1, 10.2, 10.3_

  - [ ] 14.4 Test print functionality
    - Test print styles application
    - Test navigation hiding
    - Test page breaks
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 15. Write performance tests
  - [ ] 15.1 Test Lighthouse performance
    - Test performance score ≥ 90
    - Test First Contentful Paint
    - Test Largest Contentful Paint
    - Test Time to Interactive
    - _Requirements: 6.2_

  - [ ] 15.2 Test load time on 3G
    - Test page load within 2 seconds
    - Test asset loading
    - _Requirements: 6.3_

  - [ ] 15.3 Test mobile-friendly score
    - Test Google mobile-friendly test
    - Test viewport configuration
    - _Requirements: 10.4, 10.5_

- [ ] 16. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Documentation and deployment
  - [ ] 17.1 Create README for legal pages
    - Document content update process
    - Document file structure
    - Document testing procedures
    - _Requirements: 5.2, 5.4_

  - [ ] 17.2 Add legal pages to sitemap
    - Include all legal pages in sitemap.xml
    - Set appropriate priority and change frequency
    - _Requirements: 4.1_

  - [ ] 17.3 Configure build validation
    - Add legal content validation to build process
    - Ensure build fails if validation fails
    - _Requirements: 5.2_

  - [ ] 17.4 Deploy and verify
    - Deploy to staging environment
    - Verify all legal pages load correctly
    - Verify SEO metadata
    - Verify accessibility
    - Verify performance metrics
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 4.2, 4.3, 4.4, 6.2, 6.3_

- [ ] 18. Final Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.
