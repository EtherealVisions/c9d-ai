/**
 * Design System Showcase
 * 
 * A comprehensive showcase of all design system components
 * for documentation and testing purposes.
 */

'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { 
  BrandGradient, 
  GradientText, 
  GradientBorder,
  GradientOverlay 
} from './brand-gradient'
import { 
  BrandAnimation, 
  FloatingBlob, 
  ScrollAnimation,
  StaggeredAnimation,
  PulseGlow 
} from './brand-animation'
import { 
  BrandTypography, 
  HeroTitle, 
  SectionTitle, 
  BodyText, 
  CaptionText,
  TypographyScale 
} from './brand-typography'
import { 
  BrandAsset, 
  BrandLogo, 
  BrandIcon, 
  BrandAvatar,
  AssetShowcase 
} from './brand-assets'
import { 
  BrandButton, 
  CTAButton, 
  GhostButton, 
  IconButton, 
  ButtonGroup 
} from './brand-button'
import { designTokens } from '@/lib/design-system/tokens'

export function DesignSystemShowcase() {
  const [activeSection, setActiveSection] = useState('overview')

  const sections = [
    { id: 'overview', title: 'Overview' },
    { id: 'colors', title: 'Colors & Gradients' },
    { id: 'typography', title: 'Typography' },
    { id: 'buttons', title: 'Buttons' },
    { id: 'animations', title: 'Animations' },
    { id: 'assets', title: 'Assets' },
    { id: 'tokens', title: 'Design Tokens' },
  ]

  return (
    <div className="min-h-screen bg-c9n-blue-dark text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-c9n-blue-dark/90 backdrop-blur-sm border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <BrandLogo size="md" />
            <div className="flex space-x-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    activeSection === section.id
                      ? 'bg-windsurf-pink-hot text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  )}
                >
                  {section.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {activeSection === 'overview' && <OverviewSection />}
        {activeSection === 'colors' && <ColorsSection />}
        {activeSection === 'typography' && <TypographySection />}
        {activeSection === 'buttons' && <ButtonsSection />}
        {activeSection === 'animations' && <AnimationsSection />}
        {activeSection === 'assets' && <AssetsSection />}
        {activeSection === 'tokens' && <TokensSection />}
      </div>

      {/* Floating Blobs for Visual Interest */}
      <FloatingBlob 
        variant="primary" 
        size="lg" 
        speed="slow" 
        opacity={0.1}
        position={{ top: '10%', right: '10%' }}
      />
      <FloatingBlob 
        variant="secondary" 
        size="md" 
        speed="normal" 
        opacity={0.1}
        position={{ bottom: '20%', left: '5%' }}
      />
      <FloatingBlob 
        variant="accent" 
        size="sm" 
        speed="fast" 
        opacity={0.1}
        position={{ top: '60%', right: '20%' }}
      />
    </div>
  )
}

function OverviewSection() {
  return (
    <div className="space-y-12">
      <BrandAnimation type="fade">
        <HeroTitle>C9d.ai Design System</HeroTitle>
        <BodyText size="large" className="text-center mt-4 max-w-3xl mx-auto">
          A comprehensive design system that ensures brand consistency across all 
          components and pages. Built with accessibility, performance, and developer 
          experience in mind.
        </BodyText>
      </BrandAnimation>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <BrandAnimation type="scale" delay={100}>
          <GradientBorder variant="primary" className="p-6 text-center">
            <div className="text-4xl mb-4">🎨</div>
            <SectionTitle level={3}>Brand Colors</SectionTitle>
            <BodyText size="small" className="mt-2">
              Consistent color palette with gradients and accessibility compliance
            </BodyText>
          </GradientBorder>
        </BrandAnimation>

        <BrandAnimation type="scale" delay={200}>
          <GradientBorder variant="secondary" className="p-6 text-center">
            <div className="text-4xl mb-4">✨</div>
            <SectionTitle level={3}>Animations</SectionTitle>
            <BodyText size="small" className="mt-2">
              Smooth, performant animations with reduced motion support
            </BodyText>
          </GradientBorder>
        </BrandAnimation>

        <BrandAnimation type="scale" delay={300}>
          <GradientBorder variant="accent" className="p-6 text-center">
            <div className="text-4xl mb-4">🔧</div>
            <SectionTitle level={3}>Components</SectionTitle>
            <BodyText size="small" className="mt-2">
              Reusable components following brand guidelines and best practices
            </BodyText>
          </GradientBorder>
        </BrandAnimation>
      </div>
    </div>
  )
}

function ColorsSection() {
  const colorCategories = [
    {
      name: 'Primary Colors',
      colors: designTokens.colors.primary,
    },
    {
      name: 'Secondary Colors',
      colors: designTokens.colors.secondary,
    },
    {
      name: 'Accent Colors',
      colors: designTokens.colors.accent,
    },
  ]

  return (
    <div className="space-y-12">
      <SectionTitle level={1}>Colors & Gradients</SectionTitle>

      {/* Color Palette */}
      <div className="space-y-8">
        {colorCategories.map((category) => (
          <div key={category.name}>
            <SectionTitle level={3}>{category.name}</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
              {Object.entries(category.colors).map(([name, colorGroup]) => (
                <div key={name} className="space-y-2">
                  <div className="text-sm font-medium capitalize">{name}</div>
                  {typeof colorGroup === 'object' ? (
                    Object.entries(colorGroup).map(([shade, color]) => (
                      <div key={shade} className="flex items-center space-x-2">
                        <div 
                          className="w-8 h-8 rounded border border-gray-600"
                          style={{ backgroundColor: color as string }}
                        />
                        <div className="text-xs">
                          <div>{shade}</div>
                          <div className="text-gray-400">{color as string}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-8 h-8 rounded border border-gray-600"
                        style={{ backgroundColor: colorGroup }}
                      />
                      <div className="text-xs text-gray-400">{colorGroup}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Gradient Examples */}
      <div>
        <SectionTitle level={3}>Brand Gradients</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          <BrandGradient variant="primary" className="h-32 rounded-lg flex items-center justify-center">
            <GradientText variant="secondary" className="text-xl font-bold">
              Primary Gradient
            </GradientText>
          </BrandGradient>
          <BrandGradient variant="secondary" className="h-32 rounded-lg flex items-center justify-center">
            <GradientText variant="accent" className="text-xl font-bold">
              Secondary Gradient
            </GradientText>
          </BrandGradient>
          <BrandGradient variant="accent" className="h-32 rounded-lg flex items-center justify-center">
            <GradientText variant="primary" className="text-xl font-bold">
              Accent Gradient
            </GradientText>
          </BrandGradient>
        </div>
      </div>

      {/* Animated Gradients */}
      <div>
        <SectionTitle level={3}>Animated Gradients</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <BrandGradient variant="hero" animated={true} className="h-32 rounded-lg flex items-center justify-center">
            <div className="text-xl font-bold text-white">Hero Gradient</div>
          </BrandGradient>
          <BrandGradient variant="rainbow" animated={true} className="h-32 rounded-lg flex items-center justify-center">
            <div className="text-xl font-bold text-white">Rainbow Gradient</div>
          </BrandGradient>
        </div>
      </div>
    </div>
  )
}

function TypographySection() {
  return (
    <div className="space-y-12">
      <SectionTitle level={1}>Typography System</SectionTitle>
      
      {/* Typography Scale */}
      <TypographyScale />

      {/* Specialized Components */}
      <div className="space-y-8">
        <div>
          <SectionTitle level={3}>Hero Titles</SectionTitle>
          <div className="space-y-4 mt-4">
            <HeroTitle>Hero Title with Gradient</HeroTitle>
            <HeroTitle gradient={false}>Hero Title without Gradient</HeroTitle>
          </div>
        </div>

        <div>
          <SectionTitle level={3}>Section Titles</SectionTitle>
          <div className="space-y-4 mt-4">
            <SectionTitle level={1}>Level 1 Section Title</SectionTitle>
            <SectionTitle level={2}>Level 2 Section Title</SectionTitle>
            <SectionTitle level={3}>Level 3 Section Title</SectionTitle>
            <SectionTitle level={2} gradient={true}>Gradient Section Title</SectionTitle>
          </div>
        </div>

        <div>
          <SectionTitle level={3}>Body Text</SectionTitle>
          <div className="space-y-4 mt-4">
            <BodyText size="large">Large body text for important content and introductions.</BodyText>
            <BodyText size="base">Base body text for regular content and descriptions.</BodyText>
            <BodyText size="small">Small body text for secondary information and details.</BodyText>
          </div>
        </div>

        <div>
          <SectionTitle level={3}>Caption Text</SectionTitle>
          <div className="space-y-2 mt-4">
            <CaptionText size="large">Large caption text</CaptionText>
            <CaptionText size="small">Small caption text</CaptionText>
            <CaptionText color="accent-teal">Accent colored caption</CaptionText>
          </div>
        </div>
      </div>
    </div>
  )
}

function ButtonsSection() {
  return (
    <div className="space-y-12">
      <SectionTitle level={1}>Button Components</SectionTitle>

      {/* Basic Buttons */}
      <div>
        <SectionTitle level={3}>Basic Buttons</SectionTitle>
        <div className="flex flex-wrap gap-4 mt-4">
          <BrandButton variant="primary">Primary Button</BrandButton>
          <BrandButton variant="secondary">Secondary Button</BrandButton>
          <BrandButton variant="accent">Accent Button</BrandButton>
          <BrandButton variant="neutral">Neutral Button</BrandButton>
        </div>
      </div>

      {/* Button Sizes */}
      <div>
        <SectionTitle level={3}>Button Sizes</SectionTitle>
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <BrandButton size="xs">Extra Small</BrandButton>
          <BrandButton size="sm">Small</BrandButton>
          <BrandButton size="md">Medium</BrandButton>
          <BrandButton size="lg">Large</BrandButton>
          <BrandButton size="xl">Extra Large</BrandButton>
        </div>
      </div>

      {/* Button States */}
      <div>
        <SectionTitle level={3}>Button States</SectionTitle>
        <div className="flex flex-wrap gap-4 mt-4">
          <BrandButton>Default</BrandButton>
          <BrandButton loading={true}>Loading</BrandButton>
          <BrandButton disabled={true}>Disabled</BrandButton>
        </div>
      </div>

      {/* Button Effects */}
      <div>
        <SectionTitle level={3}>Button Effects</SectionTitle>
        <div className="flex flex-wrap gap-4 mt-4">
          <BrandButton glow={true}>With Glow</BrandButton>
          <BrandButton animation="pulse">Pulse Animation</BrandButton>
          <BrandButton animation="glow">Glow Animation</BrandButton>
        </div>
      </div>

      {/* Specialized Buttons */}
      <div>
        <SectionTitle level={3}>Specialized Buttons</SectionTitle>
        <div className="flex flex-wrap gap-4 mt-4">
          <CTAButton>Call to Action</CTAButton>
          <GhostButton>Ghost Button</GhostButton>
          <IconButton 
            icon={<span>★</span>} 
            aria-label="Favorite"
            variant="primary"
          />
        </div>
      </div>

      {/* Button Groups */}
      <div>
        <SectionTitle level={3}>Button Groups</SectionTitle>
        <div className="space-y-4 mt-4">
          <ButtonGroup orientation="horizontal">
            <BrandButton variant="primary">First</BrandButton>
            <BrandButton variant="primary">Second</BrandButton>
            <BrandButton variant="primary">Third</BrandButton>
          </ButtonGroup>
          
          <ButtonGroup orientation="vertical">
            <BrandButton variant="secondary">Top</BrandButton>
            <BrandButton variant="secondary">Middle</BrandButton>
            <BrandButton variant="secondary">Bottom</BrandButton>
          </ButtonGroup>
        </div>
      </div>

      {/* Full Width Button */}
      <div>
        <SectionTitle level={3}>Full Width Button</SectionTitle>
        <div className="mt-4">
          <BrandButton fullWidth={true} variant="primary">
            Full Width Button
          </BrandButton>
        </div>
      </div>
    </div>
  )
}

function AnimationsSection() {
  return (
    <div className="space-y-12">
      <SectionTitle level={1}>Animation System</SectionTitle>

      {/* Basic Animations */}
      <div>
        <SectionTitle level={3}>Basic Animations</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          <BrandAnimation type="fade">
            <div className="bg-gray-800 p-6 rounded-lg text-center">
              <div className="text-2xl mb-2">✨</div>
              <div>Fade Animation</div>
            </div>
          </BrandAnimation>
          
          <BrandAnimation type="scale">
            <div className="bg-gray-800 p-6 rounded-lg text-center">
              <div className="text-2xl mb-2">📏</div>
              <div>Scale Animation</div>
            </div>
          </BrandAnimation>
          
          <BrandAnimation type="slide" direction="up">
            <div className="bg-gray-800 p-6 rounded-lg text-center">
              <div className="text-2xl mb-2">⬆️</div>
              <div>Slide Up Animation</div>
            </div>
          </BrandAnimation>
        </div>
      </div>

      {/* Hover Animations */}
      <div>
        <SectionTitle level={3}>Hover Animations</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <BrandAnimation type="scale" trigger="hover">
            <div className="bg-gray-800 p-6 rounded-lg text-center cursor-pointer">
              <div className="text-2xl mb-2">🖱️</div>
              <div>Hover to Scale</div>
            </div>
          </BrandAnimation>
          
          <BrandAnimation type="glow" trigger="hover">
            <div className="bg-gray-800 p-6 rounded-lg text-center cursor-pointer">
              <div className="text-2xl mb-2">💫</div>
              <div>Hover to Glow</div>
            </div>
          </BrandAnimation>
        </div>
      </div>

      {/* Continuous Animations */}
      <div>
        <SectionTitle level={3}>Continuous Animations</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          <BrandAnimation type="float" repeat={true}>
            <div className="bg-gray-800 p-6 rounded-lg text-center">
              <div className="text-2xl mb-2">🎈</div>
              <div>Float Animation</div>
            </div>
          </BrandAnimation>
          
          <PulseGlow variant="primary">
            <div className="bg-gray-800 p-6 rounded-lg text-center">
              <div className="text-2xl mb-2">💖</div>
              <div>Pulse Glow</div>
            </div>
          </PulseGlow>
          
          <BrandAnimation type="bounce" repeat={true}>
            <div className="bg-gray-800 p-6 rounded-lg text-center">
              <div className="text-2xl mb-2">⚽</div>
              <div>Bounce Animation</div>
            </div>
          </BrandAnimation>
        </div>
      </div>

      {/* Staggered Animation */}
      <div>
        <SectionTitle level={3}>Staggered Animation</SectionTitle>
        <StaggeredAnimation staggerDelay={150} animation="fade">
          <div className="bg-gray-800 p-4 rounded-lg">Item 1</div>
          <div className="bg-gray-800 p-4 rounded-lg">Item 2</div>
          <div className="bg-gray-800 p-4 rounded-lg">Item 3</div>
          <div className="bg-gray-800 p-4 rounded-lg">Item 4</div>
        </StaggeredAnimation>
      </div>
    </div>
  )
}

function AssetsSection() {
  return (
    <div className="space-y-12">
      <SectionTitle level={1}>Brand Assets</SectionTitle>
      <AssetShowcase />
    </div>
  )
}

function TokensSection() {
  return (
    <div className="space-y-12">
      <SectionTitle level={1}>Design Tokens</SectionTitle>

      {/* Spacing Scale */}
      <div>
        <SectionTitle level={3}>Spacing Scale</SectionTitle>
        <div className="space-y-2 mt-4">
          {Object.entries(designTokens.spacing).slice(0, 20).map(([key, value]) => (
            <div key={key} className="flex items-center space-x-4">
              <div className="w-16 text-sm text-gray-400">{key}</div>
              <div className="w-20 text-sm text-gray-400">{value}</div>
              <div 
                className="bg-windsurf-pink-hot h-4"
                style={{ width: value }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Border Radius Scale */}
      <div>
        <SectionTitle level={3}>Border Radius Scale</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {Object.entries(designTokens.borderRadius).map(([key, value]) => (
            <div key={key} className="text-center">
              <div 
                className="w-16 h-16 bg-windsurf-blue-electric mx-auto mb-2"
                style={{ borderRadius: value }}
              />
              <div className="text-sm">{key}</div>
              <div className="text-xs text-gray-400">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Shadow Scale */}
      <div>
        <SectionTitle level={3}>Shadow Scale</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          {Object.entries(designTokens.shadows).slice(0, 6).map(([key, value]) => (
            <div key={key} className="text-center">
              <div 
                className="w-24 h-24 bg-gray-800 mx-auto mb-2 rounded-lg"
                style={{ boxShadow: typeof value === 'string' ? value : undefined }}
              />
              <div className="text-sm">{key}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}