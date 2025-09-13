/**
 * Design Token System for C9d.ai Landing Page
 * 
 * This file defines the comprehensive design token system that ensures
 * brand consistency across all components and pages.
 */

// Brand Color Palette
export const brandColors = {
  // Primary Brand Colors
  primary: {
    purple: {
      deep: '#300D4F',
      vibrant: '#7B2CBF',
      light: '#9D4EDD',
      50: '#F8F4FF',
      100: '#E9D5FF',
      200: '#D8B4FE',
      300: '#C084FC',
      400: '#A855F7',
      500: '#7B2CBF',
      600: '#6B21A8',
      700: '#581C87',
      800: '#4C1D95',
      900: '#300D4F',
    },
    pink: {
      hot: '#E71D73',
      vibrant: '#F91880',
      light: '#FDEFF5',
      50: '#FDF2F8',
      100: '#FCE7F3',
      200: '#FBCFE8',
      300: '#F9A8D4',
      400: '#F472B6',
      500: '#E71D73',
      600: '#DB2777',
      700: '#BE185D',
      800: '#9D174D',
      900: '#831843',
    },
  },
  
  // Secondary Brand Colors
  secondary: {
    blue: {
      dark: '#0A192F',
      mid: '#0F203A',
      electric: '#00B2FF',
      50: '#EFF6FF',
      100: '#DBEAFE',
      200: '#BFDBFE',
      300: '#93C5FD',
      400: '#60A5FA',
      500: '#00B2FF',
      600: '#2563EB',
      700: '#1D4ED8',
      800: '#1E40AF',
      900: '#0A192F',
    },
    teal: {
      accent: '#2CE4B8',
      light: '#7DD3FC',
      50: '#F0FDFA',
      100: '#CCFBF1',
      200: '#99F6E4',
      300: '#5EEAD4',
      400: '#2DD4BF',
      500: '#2CE4B8',
      600: '#0D9488',
      700: '#0F766E',
      800: '#115E59',
      900: '#134E4A',
    },
  },
  
  // Accent Colors
  accent: {
    yellow: {
      bright: '#FFD700',
      warm: '#FCD34D',
      50: '#FFFBEB',
      100: '#FEF3C7',
      200: '#FDE68A',
      300: '#FCD34D',
      400: '#FBBF24',
      500: '#FFD700',
      600: '#D97706',
      700: '#B45309',
      800: '#92400E',
      900: '#78350F',
    },
    lime: {
      bright: '#AFFF3C',
      vibrant: '#84CC16',
      50: '#F7FEE7',
      100: '#ECFCCB',
      200: '#D9F99D',
      300: '#BEF264',
      400: '#A3E635',
      500: '#AFFF3C',
      600: '#65A30D',
      700: '#4D7C0F',
      800: '#365314',
      900: '#1A2E05',
    },
  },
  
  // Neutral Colors
  neutral: {
    white: '#FFFFFF',
    offWhite: '#F7F9FA',
    gray: {
      light: '#E0E6ED',
      medium: '#9FB3C8',
      dark: '#64748B',
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      300: '#CBD5E1',
      400: '#94A3B8',
      500: '#64748B',
      600: '#475569',
      700: '#334155',
      800: '#1E293B',
      900: '#0F172A',
    },
  },
} as const

// Gradient Definitions
export const brandGradients = {
  primary: {
    purplePink: 'linear-gradient(135deg, #7B2CBF 0%, #E71D73 100%)',
    purplePinkVertical: 'linear-gradient(180deg, #7B2CBF 0%, #E71D73 100%)',
    purplePinkRadial: 'radial-gradient(circle, #7B2CBF 0%, #E71D73 100%)',
  },
  secondary: {
    blueTeal: 'linear-gradient(135deg, #00B2FF 0%, #2CE4B8 100%)',
    blueTealVertical: 'linear-gradient(180deg, #00B2FF 0%, #2CE4B8 100%)',
    blueTealRadial: 'radial-gradient(circle, #00B2FF 0%, #2CE4B8 100%)',
  },
  accent: {
    yellowLime: 'linear-gradient(135deg, #FFD700 0%, #AFFF3C 100%)',
    yellowLimeVertical: 'linear-gradient(180deg, #FFD700 0%, #AFFF3C 100%)',
    yellowLimeRadial: 'radial-gradient(circle, #FFD700 0%, #AFFF3C 100%)',
  },
  complex: {
    rainbow: 'linear-gradient(135deg, #7B2CBF 0%, #E71D73 25%, #00B2FF 50%, #2CE4B8 75%, #AFFF3C 100%)',
    hero: 'linear-gradient(135deg, #300D4F 0%, #7B2CBF 30%, #E71D73 70%, #0A192F 100%)',
    feature: 'linear-gradient(135deg, #7B2CBF 0%, #E71D73 33%, #FFD700 66%, #2CE4B8 100%)',
  },
} as const

// Typography Scale
export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'Consolas', 'monospace'],
    display: ['Inter', 'system-ui', 'sans-serif'],
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    '5xl': ['3rem', { lineHeight: '1' }],
    '6xl': ['3.75rem', { lineHeight: '1' }],
    '7xl': ['4.5rem', { lineHeight: '1' }],
    '8xl': ['6rem', { lineHeight: '1' }],
    '9xl': ['8rem', { lineHeight: '1' }],
  },
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const

// Spacing Scale
export const spacing = {
  px: '1px',
  0: '0px',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  3.5: '0.875rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  11: '2.75rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  28: '7rem',
  32: '8rem',
  36: '9rem',
  40: '10rem',
  44: '11rem',
  48: '12rem',
  52: '13rem',
  56: '14rem',
  60: '15rem',
  64: '16rem',
  72: '18rem',
  80: '20rem',
  96: '24rem',
} as const

// Border Radius Scale
export const borderRadius = {
  none: '0px',
  sm: '0.125rem',
  DEFAULT: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
} as const

// Shadow Scale
export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: '0 0 #0000',
  // Brand-specific glows
  glow: {
    purple: '0 0 20px rgba(123, 44, 191, 0.3)',
    pink: '0 0 20px rgba(231, 29, 115, 0.3)',
    blue: '0 0 20px rgba(0, 178, 255, 0.3)',
    teal: '0 0 20px rgba(44, 228, 184, 0.3)',
    yellow: '0 0 20px rgba(255, 215, 0, 0.3)',
    lime: '0 0 20px rgba(175, 255, 60, 0.3)',
  },
} as const

// Animation Durations and Easings
export const animations = {
  duration: {
    75: '75ms',
    100: '100ms',
    150: '150ms',
    200: '200ms',
    300: '300ms',
    500: '500ms',
    700: '700ms',
    1000: '1000ms',
  },
  easing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    // Brand-specific easings
    gentle: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  keyframes: {
    gentleFloat: {
      '0%, 100%': { transform: 'translate3d(0px, 0px, 0px)' },
      '25%': { transform: 'translate3d(15px, -20px, 0px)' },
      '50%': { transform: 'translate3d(-20px, 15px, 0px)' },
      '75%': { transform: 'translate3d(20px, -15px, 0px)' },
    },
    gradientWave: {
      '0%': { backgroundPosition: '0% 50%' },
      '50%': { backgroundPosition: '100% 50%' },
      '100%': { backgroundPosition: '0% 50%' },
    },
    pulseGlow: {
      '0%, 100%': { 
        boxShadow: '0 0 20px rgba(231, 29, 115, 0.3)',
        transform: 'scale(1)'
      },
      '50%': { 
        boxShadow: '0 0 40px rgba(231, 29, 115, 0.6)',
        transform: 'scale(1.02)'
      },
    },
    fadeInUp: {
      '0%': { 
        opacity: '0', 
        transform: 'translateY(30px)' 
      },
      '100%': { 
        opacity: '1', 
        transform: 'translateY(0)' 
      },
    },
    scaleIn: {
      '0%': { 
        opacity: '0', 
        transform: 'scale(0.9)' 
      },
      '100%': { 
        opacity: '1', 
        transform: 'scale(1)' 
      },
    },
  },
} as const

// Breakpoints
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  // Mobile-specific breakpoints
  mobile: '375px',
  mobileLg: '414px',
  tablet: '768px',
} as const

// Z-Index Scale
export const zIndex = {
  auto: 'auto',
  0: '0',
  10: '10',
  20: '20',
  30: '30',
  40: '40',
  50: '50',
  // Component-specific z-indexes
  dropdown: '1000',
  sticky: '1020',
  fixed: '1030',
  modalBackdrop: '1040',
  modal: '1050',
  popover: '1060',
  tooltip: '1070',
  toast: '1080',
} as const

// Component-specific token mappings
export const componentTokens = {
  button: {
    primary: {
      background: brandGradients.primary.purplePink,
      color: brandColors.neutral.white,
      shadow: shadows.glow.pink,
      borderRadius: borderRadius.lg,
    },
    secondary: {
      background: brandGradients.secondary.blueTeal,
      color: brandColors.neutral.white,
      shadow: shadows.glow.blue,
      borderRadius: borderRadius.lg,
    },
    accent: {
      background: brandGradients.accent.yellowLime,
      color: brandColors.secondary.blue.dark,
      shadow: shadows.glow.yellow,
      borderRadius: borderRadius.lg,
    },
  },
  card: {
    background: brandColors.secondary.blue.mid,
    border: brandColors.neutral.gray[700],
    shadow: shadows.xl,
    borderRadius: borderRadius.xl,
  },
  hero: {
    background: brandGradients.complex.hero,
    titleColor: brandColors.neutral.white,
    subtitleColor: brandColors.neutral.gray.light,
  },
} as const

// Export all tokens as a single object for easy access
export const designTokens = {
  colors: brandColors,
  gradients: brandGradients,
  typography,
  spacing,
  borderRadius,
  shadows,
  animations,
  breakpoints,
  zIndex,
  componentTokens,
} as const

// Type definitions for TypeScript support
export type BrandColors = typeof brandColors
export type BrandGradients = typeof brandGradients
export type Typography = typeof typography
export type Spacing = typeof spacing
export type BorderRadius = typeof borderRadius
export type Shadows = typeof shadows
export type Animations = typeof animations
export type Breakpoints = typeof breakpoints
export type ZIndex = typeof zIndex
export type ComponentTokens = typeof componentTokens
export type DesignTokens = typeof designTokens