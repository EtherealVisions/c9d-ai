/**
 * Brand Guidelines Enforcement System
 * 
 * This file provides TypeScript interfaces and utilities to enforce
 * brand consistency across all components and ensure proper usage
 * of design tokens.
 */

import { designTokens, brandColors, brandGradients } from './tokens'

// Brand Color Usage Guidelines
export interface BrandColorUsage {
    primary: string
    secondary: string
    accent: string
    neutral: string
}

// Component Variant System
export type ComponentVariant = 'primary' | 'secondary' | 'accent' | 'neutral'
export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
export type ComponentState = 'default' | 'hover' | 'active' | 'disabled' | 'loading'

// Brand-compliant Button Interface
export interface BrandButtonProps {
    variant: ComponentVariant
    size: ComponentSize
    state?: ComponentState
    gradient?: boolean
    glow?: boolean
    animation?: 'none' | 'pulse' | 'glow' | 'float'
    children: React.ReactNode
    className?: string
    onClick?: () => void
    disabled?: boolean
    loading?: boolean
}

// Brand-compliant Card Interface
export interface BrandCardProps {
    variant?: 'default' | 'elevated' | 'interactive' | 'feature'
    size?: ComponentSize
    gradient?: boolean
    glow?: boolean
    animation?: 'none' | 'hover' | 'float' | 'scale'
    children: React.ReactNode
    className?: string
    onClick?: () => void
}

// Typography Hierarchy Interface
export interface TypographyHierarchy {
    display: {
        size: 'hero' | 'title' | 'subtitle'
        weight: 'bold' | 'extrabold' | 'black'
        color: 'white' | 'gradient'
        gradient?: keyof typeof brandGradients.primary | keyof typeof brandGradients.secondary
    }
    heading: {
        level: 1 | 2 | 3 | 4 | 5 | 6
        size: ComponentSize
        weight: 'medium' | 'semibold' | 'bold'
        color: 'white' | 'gray' | 'accent'
    }
    body: {
        size: 'sm' | 'base' | 'lg'
        weight: 'normal' | 'medium'
        color: 'white' | 'gray-light' | 'gray-medium'
    }
    caption: {
        size: 'xs' | 'sm'
        weight: 'normal' | 'medium'
        color: 'gray-light' | 'gray-medium'
    }
}

// Animation Guidelines Interface
export interface AnimationGuidelines {
    duration: 'fast' | 'normal' | 'slow'
    easing: 'gentle' | 'smooth' | 'bounce'
    type: 'fade' | 'slide' | 'scale' | 'float' | 'glow'
    trigger: 'hover' | 'scroll' | 'auto' | 'click'
    reducedMotion: boolean
}

// Gradient Usage Guidelines
export interface GradientUsage {
    type: 'linear' | 'radial' | 'conic'
    direction?: 'horizontal' | 'vertical' | 'diagonal'
    colors: {
        primary: string
        secondary: string
        accent: string
        complex: string
    }
    opacity?: number
    animation?: boolean
}

// Spacing Guidelines Interface
export interface SpacingGuidelines {
    component: {
        padding: ComponentSize
        margin: ComponentSize
        gap: ComponentSize
    }
    layout: {
        section: 'sm' | 'md' | 'lg' | 'xl'
        container: 'sm' | 'md' | 'lg' | 'xl' | 'full'
    }
}

// Brand Asset Interface
export interface BrandAsset {
    type: 'logo' | 'icon' | 'illustration' | 'pattern'
    variant: 'primary' | 'secondary' | 'monochrome' | 'white'
    size: ComponentSize
    format: 'svg' | 'png' | 'webp' | 'avif'
    optimized: boolean
    alt: string
    loading?: 'lazy' | 'eager'
}

// Color Contrast Guidelines
export interface ColorContrastGuidelines {
    background: string
    foreground: string
    ratio: number
    wcagLevel: 'AA' | 'AAA'
    valid: boolean
}

// Brand Validation Functions
export class BrandValidator {
    /**
     * Validates if a color combination meets WCAG contrast requirements
     */
    static validateColorContrast(
        background: string,
        foreground: string,
        level: 'AA' | 'AAA' = 'AA'
    ): ColorContrastGuidelines {
        // This would integrate with a color contrast calculation library
        // For now, returning a mock implementation
        const ratio = this.calculateContrastRatio(background, foreground)
        const minRatio = level === 'AAA' ? 7 : 4.5

        return {
            background,
            foreground,
            ratio,
            wcagLevel: level,
            valid: ratio >= minRatio,
        }
    }

    /**
     * Validates if a gradient follows brand guidelines
     */
    static validateGradient(gradient: string): boolean {
        const validGradients = Object.values(brandGradients).flatMap(category =>
            Object.values(category)
        )
        return validGradients.includes(gradient as any)
    }

    /**
     * Validates if spacing follows the design system scale
     */
    static validateSpacing(value: string): boolean {
        const validSpacing = Object.values(designTokens.spacing)
        return validSpacing.includes(value as any)
    }

    /**
     * Validates if typography follows the hierarchy
     */
    static validateTypography(
        size: string,
        weight: string,
        _lineHeight: string
    ): boolean {
        const validSizes = Object.keys(designTokens.typography.fontSize)
        const validWeights = Object.keys(designTokens.typography.fontWeight)

        return validSizes.includes(size) && validWeights.includes(weight)
    }

    private static calculateContrastRatio(_bg: string, _fg: string): number {
        // Mock implementation - in real use, this would calculate actual contrast
        // using a library like 'color' or implementing the WCAG formula
        return 4.5 // Mock value
    }
}

// Brand Theme Configuration
export interface BrandTheme {
    name: string
    colors: {
        primary: string
        secondary: string
        accent: string
        background: string
        surface: string
        text: {
            primary: string
            secondary: string
            accent: string
        }
    }
    gradients: {
        primary: string
        secondary: string
        accent: string
        hero: string
    }
    typography: {
        fontFamily: string
        scale: Record<string, readonly [string, { readonly lineHeight: string }]>
    }
    spacing: Record<string, string>
    borderRadius: Record<string, string>
    shadows: Record<string, string | Record<string, string>>
    animations: {
        duration: Record<string, string>
        easing: Record<string, string>
    }
}

// Default Brand Theme
export const defaultBrandTheme: BrandTheme = {
    name: 'C9d.ai Default',
    colors: {
        primary: brandColors.primary.purple.vibrant,
        secondary: brandColors.secondary.blue.electric,
        accent: brandColors.accent.yellow.bright,
        background: brandColors.secondary.blue.dark,
        surface: brandColors.secondary.blue.mid,
        text: {
            primary: brandColors.neutral.white,
            secondary: brandColors.neutral.gray.light,
            accent: brandColors.secondary.teal.accent,
        },
    },
    gradients: {
        primary: brandGradients.primary.purplePink,
        secondary: brandGradients.secondary.blueTeal,
        accent: brandGradients.accent.yellowLime,
        hero: brandGradients.complex.hero,
    },
    typography: {
        fontFamily: designTokens.typography.fontFamily.sans.join(', '),
        scale: designTokens.typography.fontSize,
    },
    spacing: designTokens.spacing,
    borderRadius: designTokens.borderRadius,
    shadows: designTokens.shadows,
    animations: {
        duration: designTokens.animations.duration,
        easing: designTokens.animations.easing,
    },
}

// Component Style Generators
export class BrandStyleGenerator {
    /**
     * Generates brand-compliant button styles
     */
    static generateButtonStyles(props: BrandButtonProps): Record<string, string> {
        const { variant, size, gradient, glow, animation } = props

        const baseStyles = {
            borderRadius: designTokens.borderRadius.lg,
            fontWeight: designTokens.typography.fontWeight.medium,
            transition: 'all 0.2s ease',
        }

        const variantStyles = this.getVariantStyles(variant)
        const sizeStyles = this.getSizeStyles(size)
        const effectStyles = this.getEffectStyles({ gradient, glow, animation })

        return {
            ...baseStyles,
            ...variantStyles,
            ...sizeStyles,
            ...effectStyles,
        }
    }

    /**
     * Generates brand-compliant card styles
     */
    static generateCardStyles(props: BrandCardProps): Record<string, string> {
        const { variant = 'default', size = 'md', gradient, glow, animation } = props

        const baseStyles = {
            backgroundColor: brandColors.secondary.blue.mid,
            borderRadius: designTokens.borderRadius.xl,
            border: `1px solid ${brandColors.neutral.gray[700]}`,
            boxShadow: designTokens.shadows.xl,
        }

        const variantStyles = this.getCardVariantStyles(variant)
        const sizeStyles = this.getSizeStyles(size)
        const effectStyles = this.getEffectStyles({ gradient, glow, animation })

        return {
            ...baseStyles,
            ...variantStyles,
            ...sizeStyles,
            ...effectStyles,
        }
    }

    private static getVariantStyles(variant: ComponentVariant): Record<string, string> {
        switch (variant) {
            case 'primary':
                return {
                    background: brandGradients.primary.purplePink,
                    color: brandColors.neutral.white,
                }
            case 'secondary':
                return {
                    background: brandGradients.secondary.blueTeal,
                    color: brandColors.neutral.white,
                }
            case 'accent':
                return {
                    background: brandGradients.accent.yellowLime,
                    color: brandColors.secondary.blue.dark,
                }
            case 'neutral':
                return {
                    backgroundColor: brandColors.neutral.gray[700],
                    color: brandColors.neutral.white,
                }
            default:
                return {}
        }
    }

    private static getCardVariantStyles(variant: string): Record<string, string> {
        switch (variant) {
            case 'elevated':
                return {
                    boxShadow: designTokens.shadows['2xl'],
                    transform: 'translateY(-2px)',
                }
            case 'interactive':
                return {
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    // Note: CSS-in-JS hover states would be handled differently in actual implementation
                }
            case 'feature':
                return {
                    background: brandGradients.complex.feature,
                    border: 'none',
                }
            default:
                return {}
        }
    }

    private static getSizeStyles(size: ComponentSize): Record<string, string> {
        const sizeMap = {
            xs: { padding: designTokens.spacing[2], fontSize: designTokens.typography.fontSize.xs[0] },
            sm: { padding: designTokens.spacing[3], fontSize: designTokens.typography.fontSize.sm[0] },
            md: { padding: designTokens.spacing[4], fontSize: designTokens.typography.fontSize.base[0] },
            lg: { padding: designTokens.spacing[6], fontSize: designTokens.typography.fontSize.lg[0] },
            xl: { padding: designTokens.spacing[8], fontSize: designTokens.typography.fontSize.xl[0] },
            '2xl': { padding: designTokens.spacing[10], fontSize: designTokens.typography.fontSize['2xl'][0] },
        }

        return sizeMap[size] || sizeMap.md
    }

    private static getEffectStyles(effects: {
        gradient?: boolean
        glow?: boolean
        animation?: string
    }): Record<string, string> {
        const styles: Record<string, string> = {}

        if (effects.glow) {
            styles.boxShadow = designTokens.shadows.glow.pink
        }

        if (effects.animation) {
            switch (effects.animation) {
                case 'pulse':
                    styles.animation = 'pulse-glow 3s ease-in-out infinite'
                    break
                case 'glow':
                    styles.animation = 'pulse-glow 2s ease-in-out infinite'
                    break
                case 'float':
                    styles.animation = 'gentle-float-1 25s ease-in-out infinite'
                    break
            }
        }

        return styles
    }
}

// Export additional types for external use
export type {
    BrandColorUsage as BrandColorUsageType,
    ComponentVariant as ComponentVariantType,
    ComponentSize as ComponentSizeType,
    ComponentState as ComponentStateType,
    TypographyHierarchy as TypographyHierarchyType,
    AnimationGuidelines as AnimationGuidelinesType,
    GradientUsage as GradientUsageType,
    SpacingGuidelines as SpacingGuidelinesType,
    BrandAsset as BrandAssetType,
    ColorContrastGuidelines as ColorContrastGuidelinesType,
    BrandTheme as BrandThemeType,
}