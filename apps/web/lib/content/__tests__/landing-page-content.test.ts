import { describe, it, expect, beforeEach } from 'vitest'
import { 
  ContentManager, 
  DEFAULT_LANDING_PAGE_CONTENT,
  HeroContentSchema,
  C9CapabilityContentSchema,
  LandingPageContentSchema
} from '../landing-page-content'

describe('Landing Page Content Management', () => {
  let contentManager: ContentManager

  beforeEach(() => {
    contentManager = new ContentManager()
  })

  describe('Content Schemas', () => {
    it('validates hero content schema', () => {
      const validHero = {
        title: 'Test Title',
        highlightedText: 'Highlighted',
        subtitle: 'Test subtitle',
        ctaText: 'Click Here',
        ctaHref: '/test',
        bottomText: 'Bottom text'
      }

      expect(() => HeroContentSchema.parse(validHero)).not.toThrow()
    })

    it('rejects invalid hero content', () => {
      const invalidHero = {
        title: 'Test Title',
        // Missing required fields
      }

      expect(() => HeroContentSchema.parse(invalidHero)).toThrow()
    })

    it('validates C9 capability content', () => {
      const validCapability = {
        id: 'insight',
        name: 'C9 Insight',
        tagline: 'Test tagline',
        description: 'Test description',
        keyFeatures: ['Feature 1', 'Feature 2'],
        ctaText: 'Learn More',
        ctaHref: '/api/insight'
      }

      expect(() => C9CapabilityContentSchema.parse(validCapability)).not.toThrow()
    })

    it('rejects invalid capability ID', () => {
      const invalidCapability = {
        id: 'invalid-id',
        name: 'Test',
        tagline: 'Test',
        description: 'Test',
        keyFeatures: [],
        ctaText: 'Test',
        ctaHref: '/test'
      }

      expect(() => C9CapabilityContentSchema.parse(invalidCapability)).toThrow()
    })
  })

  describe('ContentManager', () => {
    it('initializes with default content', () => {
      const content = contentManager.getContent()
      expect(content).toEqual(DEFAULT_LANDING_PAGE_CONTENT)
    })

    it('updates hero content', () => {
      const updates = {
        title: 'New Title',
        subtitle: 'New Subtitle'
      }

      const updated = contentManager.updateHero(updates)

      expect(updated.hero.title).toBe('New Title')
      expect(updated.hero.subtitle).toBe('New Subtitle')
      expect(updated.hero.ctaText).toBe(DEFAULT_LANDING_PAGE_CONTENT.hero.ctaText)
    })

    it('updates capability content', () => {
      const updates = {
        tagline: 'Updated Tagline',
        description: 'Updated Description'
      }

      const updated = contentManager.updateCapability('insight', updates)
      const capability = updated.capabilities.find(c => c.id === 'insight')

      expect(capability?.tagline).toBe('Updated Tagline')
      expect(capability?.description).toBe('Updated Description')
    })

    it('adds new features', () => {
      const newFeature = {
        id: 'new-feature',
        title: 'New Feature',
        description: 'Feature description',
        icon: 'star',
        benefits: ['Benefit 1', 'Benefit 2']
      }

      const updated = contentManager.addFeature(newFeature)
      const feature = updated.features.find(f => f.id === 'new-feature')

      expect(feature).toEqual(newFeature)
    })

    it('updates existing features', () => {
      const updated = contentManager.updateFeature('real-time-analysis', {
        title: 'Updated Title',
        description: 'Updated Description'
      })

      const feature = updated.features.find(f => f.id === 'real-time-analysis')
      expect(feature?.title).toBe('Updated Title')
      expect(feature?.description).toBe('Updated Description')
    })

    it('removes features', () => {
      const initialCount = contentManager.getContent().features.length
      const updated = contentManager.removeFeature('real-time-analysis')

      expect(updated.features.length).toBe(initialCount - 1)
      expect(updated.features.find(f => f.id === 'real-time-analysis')).toBeUndefined()
    })

    it('adds testimonials', () => {
      const newTestimonial = {
        id: 'test-testimonial',
        quote: 'Great product!',
        author: 'John Doe',
        title: 'CEO',
        company: 'Test Corp',
        rating: 5
      }

      const updated = contentManager.addTestimonial(newTestimonial)
      const testimonial = updated.testimonials.find(t => t.id === 'test-testimonial')

      expect(testimonial).toEqual(newTestimonial)
    })

    it('validates content successfully', () => {
      const validation = contentManager.validateContent()
      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('detects validation errors', () => {
      // Create new content manager with corrupted data
      const testManager = new ContentManager()
      const content = testManager.getContent()
      // @ts-ignore - intentionally setting invalid value for test
      content.capabilities[0].id = 'invalid-id'

      const validation = testManager.validateContent()
      expect(validation.valid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })

    it('exports content as JSON', () => {
      const exported = contentManager.exportContent()
      const parsed = JSON.parse(exported)

      expect(parsed).toEqual(contentManager.getContent())
    })

    it('imports valid content', () => {
      const customContent = {
        ...DEFAULT_LANDING_PAGE_CONTENT,
        hero: {
          ...DEFAULT_LANDING_PAGE_CONTENT.hero,
          title: 'Imported Title'
        }
      }

      const result = contentManager.importContent(JSON.stringify(customContent))
      expect(result.success).toBe(true)
      expect(contentManager.getContent().hero.title).toBe('Imported Title')
    })

    it('rejects invalid imported content', () => {
      const invalidContent = {
        hero: {
          // Missing required fields
          title: 'Only Title'
        }
      }

      const result = contentManager.importContent(JSON.stringify(invalidContent))
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('updates metadata on changes', () => {
      const initialVersion = contentManager.getContent().metadata.version
      const initialTimestamp = contentManager.getContent().metadata.lastUpdated

      // Wait a bit to ensure timestamp changes
      setTimeout(() => {
        contentManager.updateHero({ title: 'New Title' })
        const updated = contentManager.getContent()

        expect(updated.metadata.version).not.toBe(initialVersion)
        expect(updated.metadata.lastUpdated).not.toBe(initialTimestamp)
      }, 10)
    })

    it('increments version correctly', () => {
      const content = contentManager.getContent()
      content.metadata.version = '1.2.3'

      contentManager.updateHero({ title: 'Test' })
      const updated = contentManager.getContent()

      expect(updated.metadata.version).toBe('1.2.4')
    })
  })

  describe('Default Content', () => {
    it('contains all five C9 capabilities', () => {
      // Get fresh default content
      const freshContent = new ContentManager().getContent()
      const capabilities = freshContent.capabilities
      const ids = capabilities.map(c => c.id)

      expect(ids).toEqual(['insight', 'persona', 'domain', 'orchestrator', 'narrative'])
    })

    it('has valid metadata', () => {
      const freshContent = new ContentManager().getContent()
      const metadata = freshContent.metadata
      
      expect(metadata.version).toMatch(/^\d+\.\d+\.\d+$/)
      expect(new Date(metadata.lastUpdated)).toBeInstanceOf(Date)
      expect(metadata.author).toBeDefined()
    })

    it('passes schema validation', () => {
      const freshContent = new ContentManager().getContent()
      expect(() => LandingPageContentSchema.parse(freshContent)).not.toThrow()
    })
  })
})