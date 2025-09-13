"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useMobileOptimized } from '@/hooks/use-mobile-optimized'

interface ProgressiveImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  sizes?: string
  quality?: number
  loading?: 'lazy' | 'eager'
  onLoad?: () => void
  onError?: () => void
  fallbackSrc?: string
  webpSrc?: string
  avifSrc?: string
  lowQualitySrc?: string
  aspectRatio?: string
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
  enableProgressiveLoading?: boolean
  showLoadingSpinner?: boolean
}

interface ImageSource {
  src: string
  type: string
}

export function ProgressiveImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  placeholder = 'blur',
  blurDataURL,
  sizes,
  quality,
  loading = 'lazy',
  onLoad,
  onError,
  fallbackSrc,
  webpSrc,
  avifSrc,
  lowQualitySrc,
  aspectRatio,
  objectFit = 'cover',
  enableProgressiveLoading = true,
  showLoadingSpinner = true
}: ProgressiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isError, setIsError] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(lowQualitySrc || src)
  const [isInView, setIsInView] = useState(priority || loading === 'eager')
  const imgRef = useRef<HTMLImageElement>(null)
  const { connectionSpeed, performanceMode, isMobile } = useMobileOptimized()

  // Generate responsive image sources
  const generateSources = useCallback((): ImageSource[] => {
    const sources: ImageSource[] = []
    
    // Add AVIF source if provided and supported
    if (avifSrc && typeof window !== 'undefined') {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (ctx && canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0) {
        sources.push({ src: avifSrc, type: 'image/avif' })
      }
    }
    
    // Add WebP source if provided
    if (webpSrc) {
      sources.push({ src: webpSrc, type: 'image/webp' })
    }
    
    // Add original source as fallback
    sources.push({ src: src, type: 'image/jpeg' })
    
    return sources
  }, [src, webpSrc, avifSrc])

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || loading === 'eager') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before the image comes into view
        threshold: 0.1
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [priority, loading])

  // Progressive loading logic
  useEffect(() => {
    if (!isInView || !enableProgressiveLoading) return

    let isCancelled = false

    const loadHighQualityImage = async () => {
      try {
        const sources = generateSources()
        let bestSrc = src

        // Choose best source based on performance mode and connection
        if (performanceMode === 'high' && connectionSpeed === 'fast') {
          bestSrc = sources[0]?.src || src
        } else if (webpSrc && connectionSpeed === 'fast') {
          bestSrc = webpSrc
        }

        // Preload the high-quality image
        const img = new window.Image()
        img.onload = () => {
          if (!isCancelled) {
            setCurrentSrc(bestSrc)
            setIsLoaded(true)
            onLoad?.()
          }
        }
        img.onerror = () => {
          if (!isCancelled) {
            if (fallbackSrc) {
              setCurrentSrc(fallbackSrc)
            } else {
              setIsError(true)
            }
            onError?.()
          }
        }
        img.src = bestSrc
      } catch (error) {
        if (!isCancelled) {
          setIsError(true)
          onError?.()
        }
      }
    }

    // Delay loading for low-quality placeholder
    if (lowQualitySrc) {
      setTimeout(loadHighQualityImage, 100)
    } else {
      loadHighQualityImage()
    }

    return () => {
      isCancelled = true
    }
  }, [isInView, enableProgressiveLoading, generateSources, src, webpSrc, fallbackSrc, lowQualitySrc, performanceMode, connectionSpeed, onLoad, onError])

  // Generate blur data URL if not provided
  const getBlurDataURL = useCallback(() => {
    if (blurDataURL) return blurDataURL
    
    // Generate a simple blur data URL
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHZpZXdCb3g9IjAgMCAxMCAxMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjRjNGNEY2Ii8+Cjwvc3ZnPgo='
  }, [blurDataURL])

  // Determine optimal quality based on device and connection
  const getOptimalQuality = useCallback(() => {
    if (quality) return quality
    
    if (performanceMode === 'low' || connectionSpeed === 'slow') {
      return isMobile ? 60 : 70
    }
    
    return isMobile ? 80 : 90
  }, [quality, performanceMode, connectionSpeed, isMobile])

  // Generate responsive sizes if not provided
  const getResponsiveSizes = useCallback(() => {
    if (sizes) return sizes
    
    return '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
  }, [sizes])

  if (isError) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-200 text-gray-500 ${className}`}
        style={{ aspectRatio }}
      >
        <span className="text-sm">Failed to load image</span>
      </div>
    )
  }

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ aspectRatio }}
    >
      {/* Loading spinner */}
      {showLoadingSpinner && !isLoaded && isInView && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Progressive image loading */}
      {isInView && (
        <>
          {/* Low quality placeholder */}
          {lowQualitySrc && !isLoaded && (
            <Image
              src={lowQualitySrc}
              alt={alt}
              fill={!width || !height}
              width={width}
              height={height}
              className={`transition-opacity duration-300 ${objectFit === 'cover' ? 'object-cover' : `object-${objectFit}`}`}
              quality={30}
              priority={priority}
              placeholder={placeholder}
              blurDataURL={getBlurDataURL()}
              sizes={getResponsiveSizes()}
            />
          )}

          {/* High quality image */}
          <Image
            src={currentSrc}
            alt={alt}
            fill={!width || !height}
            width={width}
            height={height}
            className={`transition-opacity duration-500 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            } ${objectFit === 'cover' ? 'object-cover' : `object-${objectFit}`}`}
            quality={getOptimalQuality()}
            priority={priority}
            loading={loading}
            placeholder={placeholder}
            blurDataURL={getBlurDataURL()}
            sizes={getResponsiveSizes()}
            onLoad={() => {
              setIsLoaded(true)
              onLoad?.()
            }}
            onError={() => {
              setIsError(true)
              onError?.()
            }}
          />
        </>
      )}

      {/* Placeholder when not in view */}
      {!isInView && (
        <div 
          className="w-full h-full bg-gray-200 animate-pulse"
          style={{ aspectRatio }}
        />
      )}
    </div>
  )
}

// Utility function to generate WebP/AVIF sources from original image path
export function generateImageSources(originalSrc: string) {
  const basePath = originalSrc.replace(/\.[^/.]+$/, '')
  const extension = originalSrc.split('.').pop()
  
  return {
    avifSrc: `${basePath}.avif`,
    webpSrc: `${basePath}.webp`,
    lowQualitySrc: `${basePath}-low.${extension}`,
    fallbackSrc: originalSrc
  }
}

// Hook for managing multiple progressive images
export function useProgressiveImageLoader(images: string[]) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const { connectionSpeed, performanceMode } = useMobileOptimized()

  const preloadImages = useCallback(async (imagesToPreload: string[]) => {
    const preloadPromises = imagesToPreload.map(src => {
      return new Promise<void>((resolve) => {
        const img = new window.Image()
        img.onload = () => {
          setLoadedImages(prev => new Set([...prev, src]))
          resolve()
        }
        img.onerror = () => {
          setFailedImages(prev => new Set([...prev, src]))
          resolve()
        }
        img.src = src
      })
    })

    await Promise.all(preloadPromises)
  }, [])

  useEffect(() => {
    // Only preload critical images on slow connections
    if (connectionSpeed === 'slow') {
      const criticalImages = images.slice(0, 3) // First 3 images
      preloadImages(criticalImages)
    } else {
      preloadImages(images)
    }
  }, [images, connectionSpeed, preloadImages])

  return {
    loadedImages,
    failedImages,
    isImageLoaded: (src: string) => loadedImages.has(src),
    isImageFailed: (src: string) => failedImages.has(src),
    preloadImages
  }
}