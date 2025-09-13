/**
 * Brand Asset Management System
 * 
 * Provides optimized delivery of brand assets including logos, icons,
 * and illustrations with proper loading strategies.
 */

'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

export type AssetType = 'logo' | 'icon' | 'illustration' | 'pattern' | 'avatar'
export type AssetVariant = 'primary' | 'secondary' | 'monochrome' | 'white' | 'dark'
export type AssetSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
export type AssetFormat = 'svg' | 'png' | 'webp' | 'avif'

export interface BrandAssetProps {
  /** Asset type */
  type: AssetType
  /** Asset variant */
  variant?: AssetVariant
  /** Asset size */
  size?: AssetSize
  /** Preferred format */
  format?: AssetFormat
  /** Alt text for accessibility */
  alt: string
  /** Loading strategy */
  loading?: 'lazy' | 'eager'
  /** Priority loading for above-fold assets */
  priority?: boolean
  /** Additional CSS classes */
  className?: string
  /** Click handler */
  onClick?: () => void
  /** Custom width/height (overrides size) */
  width?: number
  height?: number
}

// Asset size mappings
const sizeMap: Record<AssetSize, { width: number; height: number }> = {
  xs: { width: 16, height: 16 },
  sm: { width: 24, height: 24 },
  md: { width: 32, height: 32 },
  lg: { width: 48, height: 48 },
  xl: { width: 64, height: 64 },
  '2xl': { width: 96, height: 96 },
  full: { width: 0, height: 0 }, // Will use container dimensions
}

// Asset path generator
function generateAssetPath(
  type: AssetType,
  variant: AssetVariant = 'primary',
  format: AssetFormat = 'svg'
): string {
  const basePath = '/assets'
  
  switch (type) {
    case 'logo':
      return `${basePath}/logos/c9d-logo-${variant}.${format}`
    case 'icon':
      return `${basePath}/icons/icon-${variant}.${format}`
    case 'illustration':
      return `${basePath}/illustrations/illustration-${variant}.${format}`
    case 'pattern':
      return `${basePath}/patterns/pattern-${variant}.${format}`
    case 'avatar':
      return `${basePath}/avatars/avatar-${variant}.${format}`
    default:
      return `${basePath}/placeholder.${format}`
  }
}

export function BrandAsset({
  type,
  variant = 'primary',
  size = 'md',
  format = 'svg',
  alt,
  loading = 'lazy',
  priority = false,
  className,
  onClick,
  width: customWidth,
  height: customHeight,
}: BrandAssetProps) {
  const [imageError, setImageError] = useState(false)
  const [currentFormat, setCurrentFormat] = useState(format)
  
  const dimensions = sizeMap[size]
  const finalWidth = customWidth || dimensions.width
  const finalHeight = customHeight || dimensions.height
  
  const assetPath = generateAssetPath(type, variant, currentFormat)
  
  // Fallback to PNG if WebP/AVIF fails
  const handleImageError = () => {
    if (currentFormat === 'avif') {
      setCurrentFormat('webp')
    } else if (currentFormat === 'webp') {
      setCurrentFormat('png')
    } else {
      setImageError(true)
    }
  }

  // Generate srcSet for responsive images
  const generateSrcSet = () => {
    if (format === 'svg') return undefined
    
    const basePath = generateAssetPath(type, variant, currentFormat)
    const basePathWithoutExt = basePath.replace(`.${currentFormat}`, '')
    
    return [
      `${basePathWithoutExt}.${currentFormat} 1x`,
      `${basePathWithoutExt}@2x.${currentFormat} 2x`,
      `${basePathWithoutExt}@3x.${currentFormat} 3x`,
    ].join(', ')
  }

  const imageClasses = cn(
    'select-none',
    {
      'cursor-pointer': onClick,
      'w-full h-full': size === 'full',
    },
    className
  )

  if (imageError) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center bg-gray-200 text-gray-500 rounded',
          imageClasses
        )}
        style={{ width: finalWidth, height: finalHeight }}
      >
        <span className="text-xs">Asset not found</span>
      </div>
    )
  }

  return (
    <Image
      src={assetPath}
      alt={alt}
      width={finalWidth}
      height={finalHeight}
      loading={loading}
      priority={priority}
      className={imageClasses}
      onClick={onClick}
      onError={handleImageError}
      sizes={size === 'full' ? '100vw' : undefined}
    />
  )
}

// Specialized logo component
export interface BrandLogoProps {
  /** Logo variant */
  variant?: 'primary' | 'secondary' | 'monochrome' | 'white'
  /** Logo size */
  size?: AssetSize
  /** Whether to show company name */
  showText?: boolean
  /** Additional CSS classes */
  className?: string
  /** Click handler */
  onClick?: () => void
}

export function BrandLogo({
  variant = 'primary',
  size = 'lg',
  showText = true,
  className,
  onClick,
}: BrandLogoProps) {
  const logoVariant = showText ? `${variant}-with-text` : variant
  
  return (
    <BrandAsset
      type="logo"
      variant={logoVariant as AssetVariant}
      size={size}
      alt="C9d.ai Logo"
      priority={true}
      className={className}
      onClick={onClick}
    />
  )
}

// Icon component with built-in icon library
export interface BrandIconProps {
  /** Icon name */
  name: string
  /** Icon size */
  size?: AssetSize
  /** Icon color variant */
  variant?: AssetVariant
  /** Additional CSS classes */
  className?: string
  /** Click handler */
  onClick?: () => void
}

export function BrandIcon({
  name,
  size = 'md',
  variant = 'primary',
  className,
  onClick,
}: BrandIconProps) {
  return (
    <BrandAsset
      type="icon"
      variant={`${variant}-${name}` as AssetVariant}
      size={size}
      alt={`${name} icon`}
      className={className}
      onClick={onClick}
    />
  )
}

// Avatar component with fallback
export interface BrandAvatarProps {
  /** Avatar source URL or identifier */
  src?: string
  /** User name for fallback */
  name: string
  /** Avatar size */
  size?: AssetSize
  /** Additional CSS classes */
  className?: string
  /** Click handler */
  onClick?: () => void
}

export function BrandAvatar({
  src,
  name,
  size = 'md',
  className,
  onClick,
}: BrandAvatarProps) {
  const [imageError, setImageError] = useState(false)
  const dimensions = sizeMap[size]
  
  // Generate initials from name
  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const avatarClasses = cn(
    'rounded-full flex items-center justify-center font-medium text-white bg-gradient-to-br from-windsurf-purple-vibrant to-windsurf-pink-hot',
    {
      'cursor-pointer': onClick,
      'text-xs': size === 'xs' || size === 'sm',
      'text-sm': size === 'md',
      'text-base': size === 'lg',
      'text-lg': size === 'xl' || size === '2xl',
    },
    className
  )

  if (!src || imageError) {
    return (
      <div
        className={avatarClasses}
        style={{ width: dimensions.width, height: dimensions.height }}
        onClick={onClick}
      >
        {getInitials(name)}
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={`${name} avatar`}
      width={dimensions.width}
      height={dimensions.height}
      className={cn('rounded-full object-cover', className)}
      onClick={onClick}
      onError={() => setImageError(true)}
    />
  )
}

// Asset preloader for critical assets
export interface AssetPreloaderProps {
  /** Assets to preload */
  assets: Array<{
    type: AssetType
    variant?: AssetVariant
    format?: AssetFormat
  }>
}

export function AssetPreloader({ assets }: AssetPreloaderProps) {
  useEffect(() => {
    // Preload critical assets
    assets.forEach(({ type, variant = 'primary', format = 'svg' }) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = generateAssetPath(type, variant, format)
      document.head.appendChild(link)
    })
  }, [assets])

  return null
}

// Asset showcase component for design system documentation
export function AssetShowcase() {
  const logoVariants: ('primary' | 'secondary' | 'monochrome' | 'white')[] = ['primary', 'secondary', 'monochrome', 'white']
  const sizes: AssetSize[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl']

  return (
    <div className="space-y-12 p-8 bg-c9n-blue-dark">
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Brand Logos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {logoVariants.map((variant) => (
            <div key={variant} className="text-center space-y-2">
              <div className="bg-gray-800 p-4 rounded-lg">
                <BrandLogo variant={variant} size="lg" />
              </div>
              <p className="text-sm text-gray-400 capitalize">{variant}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Size Scale</h2>
        <div className="flex items-end space-x-4">
          {sizes.map((size) => (
            <div key={size} className="text-center space-y-2">
              <div className="bg-gray-800 p-4 rounded-lg flex items-center justify-center">
                <BrandLogo variant="primary" size={size} />
              </div>
              <p className="text-xs text-gray-400">{size}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Avatars</h2>
        <div className="flex items-center space-x-4">
          <BrandAvatar name="John Doe" size="sm" />
          <BrandAvatar name="Jane Smith" size="md" />
          <BrandAvatar name="Alex Johnson" size="lg" />
          <BrandAvatar name="Sarah Wilson" size="xl" />
        </div>
      </div>
    </div>
  )
}