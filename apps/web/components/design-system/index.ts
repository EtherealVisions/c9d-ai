/**
 * Brand Design System - Main Export File
 * 
 * This file exports all design system components and utilities
 * for easy importing throughout the application.
 */

// Design Tokens
export * from '@/lib/design-system/tokens'
export * from '@/lib/design-system/brand-guidelines'

// Core Components
export * from './brand-gradient'
export * from './brand-animation'
export * from './brand-typography'
export * from './brand-assets'

// Re-export commonly used types
export type {
  BrandColors,
  BrandGradients,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Animations,
  Breakpoints,
  ZIndex,
  ComponentTokens,
  DesignTokens,
} from '@/lib/design-system/tokens'

export type {
  BrandColorUsage,
  ComponentVariant,
  ComponentSize,
  ComponentState,
  TypographyHierarchy,
  AnimationGuidelines,
  GradientUsage,
  SpacingGuidelines,
  BrandAsset,
  ColorContrastGuidelines,
  BrandTheme,
} from '@/lib/design-system/brand-guidelines'