/**
 * Design System Entry Point
 * 
 * This file provides the main exports for the C9d.ai design system,
 * including design tokens, brand guidelines, and utility functions.
 */

// Core design tokens
import {
  brandColors,
  brandGradients,
  typography,
  spacing,
  borderRadius,
  shadows,
  animations,
  breakpoints,
  zIndex,
  componentTokens,
  designTokens,
} from './tokens'

// Re-export for external use
export {
  brandColors,
  brandGradients,
  typography,
  spacing,
  borderRadius,
  shadows,
  animations,
  breakpoints,
  zIndex,
  componentTokens,
  designTokens,
}

// Type exports for design tokens
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
} from './tokens'

// Brand guidelines and validation
import {
  BrandValidator,
  BrandStyleGenerator,
  defaultBrandTheme,
} from './brand-guidelines'

// Re-export for external use
export {
  BrandValidator,
  BrandStyleGenerator,
  defaultBrandTheme,
}

// Type exports for brand guidelines
export type {
  BrandColorUsage,
  ComponentVariant,
  ComponentSize,
  ComponentState,
  BrandButtonProps,
  BrandCardProps,
  TypographyHierarchy,
  AnimationGuidelines,
  GradientUsage,
  SpacingGuidelines,
  BrandAsset,
  ColorContrastGuidelines,
  BrandTheme,
} from './brand-guidelines'

// Utility functions for design system usage
export const getColorValue = (colorPath: string): string => {
  const paths = colorPath.split('.')
  let current: any = brandColors
  
  for (const path of paths) {
    current = current[path]
    if (!current) return ''
  }
  
  return current
}

export const getSpacingValue = (size: keyof typeof spacing): string => {
  return spacing[size]
}

export const getTypographyValue = (size: keyof typeof typography.fontSize): readonly [string, { readonly lineHeight: string }] => {
  return typography.fontSize[size]
}

export const getShadowValue = (shadow: keyof typeof shadows): string => {
  const shadowValue = shadows[shadow]
  return typeof shadowValue === 'string' ? shadowValue : ''
}

// Design system validation utilities
export const validateDesignTokenUsage = {
  color: (color: string): boolean => BrandValidator.validateColorContrast(color, '#FFFFFF', 'AA').valid,
  spacing: (value: string): boolean => BrandValidator.validateSpacing(value),
  gradient: (gradient: string): boolean => BrandValidator.validateGradient(gradient),
  typography: (size: string, weight: string): boolean => BrandValidator.validateTypography(size, weight, '1.5'),
}

// Component style generators
export const generateComponentStyles = {
  button: BrandStyleGenerator.generateButtonStyles,
  card: BrandStyleGenerator.generateCardStyles,
}

// Design system constants
export const DESIGN_SYSTEM_VERSION = '1.0.0'

export const SUPPORTED_BREAKPOINTS = Object.keys(breakpoints) as Array<keyof typeof breakpoints>

export const BRAND_COLOR_NAMES = {
  primary: Object.keys(brandColors.primary),
  secondary: Object.keys(brandColors.secondary),
  accent: Object.keys(brandColors.accent),
  neutral: Object.keys(brandColors.neutral),
} as const

// Re-export commonly used tokens for convenience
export const colors = brandColors
export const gradients = brandGradients
export const fonts = typography
export const space = spacing
export const radii = borderRadius
export const boxShadows = shadows
export const motion = animations
export const screens = breakpoints
export const layers = zIndex
export const components = componentTokens

// Default export with all design system utilities
export default {
  tokens: designTokens,
  colors: brandColors,
  gradients: brandGradients,
  typography,
  spacing,
  shadows,
  animations,
  breakpoints,
  zIndex,
  componentTokens,
  validator: BrandValidator,
  styleGenerator: BrandStyleGenerator,
  theme: defaultBrandTheme,
  utils: {
    getColorValue,
    getSpacingValue,
    getTypographyValue,
    getShadowValue,
    validateDesignTokenUsage,
    generateComponentStyles,
  },
  constants: {
    VERSION: DESIGN_SYSTEM_VERSION,
    BREAKPOINTS: SUPPORTED_BREAKPOINTS,
    COLOR_NAMES: BRAND_COLOR_NAMES,
  },
}