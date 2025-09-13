"use client"

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMobileOptimized, useTouchCarousel } from '@/hooks/use-mobile-optimized'
import { cn } from '@/lib/utils'

interface MobileCarouselProps {
  children: React.ReactNode[]
  className?: string
  itemClassName?: string
  showArrows?: boolean
  showDots?: boolean
  autoPlay?: boolean
  autoPlayDelay?: number
  infinite?: boolean
  itemsPerView?: {
    mobile: number
    tablet: number
    desktop: number
  }
  gap?: string
  enableTouch?: boolean
  snapToItems?: boolean
  centerMode?: boolean
  onSlideChange?: (index: number) => void
}

export function MobileCarousel({
  children,
  className = '',
  itemClassName = '',
  showArrows = true,
  showDots = true,
  autoPlay = false,
  autoPlayDelay = 5000,
  infinite = true,
  itemsPerView = { mobile: 1, tablet: 2, desktop: 3 },
  gap = '1rem',
  enableTouch = true,
  snapToItems = true,
  centerMode = false,
  onSlideChange
}: MobileCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  
  const { 
    isMobile, 
    isTablet, 
    isTouch, 
    reducedMotion, 
    performanceMode,
    handleTouchStart,
    handleTouchEnd 
  } = useMobileOptimized()
  
  const {
    currentIndex,
    isAutoPlaying,
    goToIndex,
    next,
    previous,
    setIsAutoPlaying
  } = useTouchCarousel(children.length, autoPlay, autoPlayDelay)

  // Determine items per view based on screen size
  const getCurrentItemsPerView = useCallback(() => {
    if (isMobile) return itemsPerView.mobile
    if (isTablet) return itemsPerView.tablet
    return itemsPerView.desktop
  }, [isMobile, isTablet, itemsPerView])

  const currentItemsPerView = getCurrentItemsPerView()

  // Calculate slide width
  const getSlideWidth = useCallback(() => {
    if (!containerRef.current) return 0
    const containerWidth = containerRef.current.offsetWidth
    const gapValue = parseFloat(gap) * 16 // Convert rem to px (assuming 1rem = 16px)
    const totalGap = gapValue * (currentItemsPerView - 1)
    return (containerWidth - totalGap) / currentItemsPerView
  }, [currentItemsPerView, gap])

  // Smooth scroll to index
  const scrollToIndex = useCallback((index: number, smooth = true) => {
    if (!trackRef.current) return
    
    const slideWidth = getSlideWidth()
    const gapValue = parseFloat(gap) * 16
    const scrollPosition = index * (slideWidth + gapValue)
    
    if (smooth && !reducedMotion && performanceMode === 'high') {
      trackRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      })
    } else {
      trackRef.current.scrollLeft = scrollPosition
    }
  }, [getSlideWidth, gap, reducedMotion, performanceMode])

  // Update scroll position when currentIndex changes
  useEffect(() => {
    scrollToIndex(currentIndex)
    onSlideChange?.(currentIndex)
  }, [currentIndex, scrollToIndex, onSlideChange])

  // Touch/Mouse drag handlers
  const handleDragStart = useCallback((clientX: number) => {
    if (!enableTouch || !trackRef.current) return
    
    setIsDragging(true)
    setStartX(clientX)
    setScrollLeft(trackRef.current.scrollLeft)
    setIsAutoPlaying(false)
    
    // Add cursor grabbing style
    if (trackRef.current) {
      trackRef.current.style.cursor = 'grabbing'
    }
  }, [enableTouch, setIsAutoPlaying])

  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging || !trackRef.current) return
    
    const deltaX = clientX - startX
    const newScrollLeft = scrollLeft - deltaX
    
    // Apply momentum-based scrolling for better performance
    if (performanceMode === 'high') {
      trackRef.current.scrollLeft = newScrollLeft
    } else {
      // Throttle updates for low performance mode
      requestAnimationFrame(() => {
        if (trackRef.current) {
          trackRef.current.scrollLeft = newScrollLeft
        }
      })
    }
  }, [isDragging, startX, scrollLeft, performanceMode])

  const handleDragEnd = useCallback(() => {
    if (!isDragging || !trackRef.current) return
    
    setIsDragging(false)
    
    // Reset cursor
    trackRef.current.style.cursor = 'grab'
    
    // Snap to nearest item if enabled
    if (snapToItems) {
      const slideWidth = getSlideWidth()
      const gapValue = parseFloat(gap) * 16
      const slideWithGap = slideWidth + gapValue
      const currentScroll = trackRef.current.scrollLeft
      const nearestIndex = Math.round(currentScroll / slideWithGap)
      
      goToIndex(Math.max(0, Math.min(nearestIndex, children.length - currentItemsPerView)))
    }
    
    // Resume auto-play after interaction
    setTimeout(() => setIsAutoPlaying(autoPlay), 3000)
  }, [isDragging, snapToItems, getSlideWidth, gap, goToIndex, children.length, currentItemsPerView, setIsAutoPlaying, autoPlay])

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    handleDragStart(e.clientX)
  }, [handleDragStart])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleDragMove(e.clientX)
  }, [handleDragMove])

  const handleMouseUp = useCallback(() => {
    handleDragEnd()
  }, [handleDragEnd])

  const handleMouseLeave = useCallback(() => {
    handleDragEnd()
  }, [handleDragEnd])

  // Touch event handlers
  const handleTouchStartCarousel = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handleDragStart(e.touches[0].clientX)
      handleTouchStart(e.nativeEvent)
    }
  }, [handleDragStart, handleTouchStart])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handleDragMove(e.touches[0].clientX)
    }
  }, [handleDragMove])

  const handleTouchEndCarousel = useCallback((e: React.TouchEvent) => {
    handleDragEnd()
    handleTouchEnd(e.nativeEvent)
  }, [handleDragEnd, handleTouchEnd])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault()
        previous()
        break
      case 'ArrowRight':
        e.preventDefault()
        next()
        break
      case 'Home':
        e.preventDefault()
        goToIndex(0)
        break
      case 'End':
        e.preventDefault()
        goToIndex(children.length - 1)
        break
    }
  }, [previous, next, goToIndex, children.length])

  // Calculate visible range for infinite scroll
  const getVisibleItems = useCallback(() => {
    if (!infinite) return children
    
    // For infinite scroll, we need to duplicate items
    const extendedItems = [...children, ...children, ...children]
    return extendedItems
  }, [children, infinite])

  const visibleItems = getVisibleItems()

  return (
    <div 
      className={cn(
        'relative w-full overflow-hidden',
        className
      )}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Carousel"
    >
      {/* Carousel Track */}
      <div
        ref={containerRef}
        className="relative overflow-hidden"
      >
        <div
          ref={trackRef}
          className={cn(
            'flex transition-transform duration-300 ease-out',
            enableTouch && 'cursor-grab active:cursor-grabbing',
            reducedMotion && 'transition-none',
            'scrollbar-hide overflow-x-auto scroll-smooth'
          )}
          style={{
            gap,
            scrollSnapType: snapToItems ? 'x mandatory' : 'none',
            WebkitOverflowScrolling: 'touch' // iOS momentum scrolling
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStartCarousel}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEndCarousel}
        >
          {visibleItems.map((child, index) => (
            <div
              key={`carousel-item-${index}`}
              className={cn(
                'flex-shrink-0',
                snapToItems && 'scroll-snap-align-start',
                centerMode && 'scroll-snap-align-center',
                itemClassName
              )}
              style={{
                width: `calc((100% - ${gap} * ${currentItemsPerView - 1}) / ${currentItemsPerView})`,
                minWidth: `calc((100% - ${gap} * ${currentItemsPerView - 1}) / ${currentItemsPerView})`
              }}
            >
              {child}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      {showArrows && !isMobile && (
        <>
          <button
            onClick={previous}
            className={cn(
              'absolute left-2 top-1/2 -translate-y-1/2 z-10',
              'bg-white/90 hover:bg-white shadow-lg hover:shadow-xl',
              'rounded-full p-2 transition-all duration-200',
              'text-gray-700 hover:text-gray-900',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              reducedMotion && 'transition-none'
            )}
            aria-label="Previous slide"
            disabled={!infinite && currentIndex === 0}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <button
            onClick={next}
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2 z-10',
              'bg-white/90 hover:bg-white shadow-lg hover:shadow-xl',
              'rounded-full p-2 transition-all duration-200',
              'text-gray-700 hover:text-gray-900',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              reducedMotion && 'transition-none'
            )}
            aria-label="Next slide"
            disabled={!infinite && currentIndex >= children.length - currentItemsPerView}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dot Indicators */}
      {showDots && (
        <div className="flex justify-center mt-4 gap-2">
          {Array.from({ length: Math.ceil(children.length / currentItemsPerView) }).map((_, index) => (
            <button
              key={index}
              onClick={() => goToIndex(index * currentItemsPerView)}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                Math.floor(currentIndex / currentItemsPerView) === index
                  ? 'bg-blue-500 scale-125'
                  : 'bg-gray-300 hover:bg-gray-400',
                reducedMotion && 'transition-none'
              )}
              aria-label={`Go to slide group ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Auto-play indicator */}
      {autoPlay && isAutoPlaying && (
        <div className="absolute top-2 right-2 z-10">
          <div className="bg-black/50 text-white text-xs px-2 py-1 rounded-full">
            Auto-playing
          </div>
        </div>
      )}
    </div>
  )
}

// Utility component for carousel items
export function CarouselItem({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  return (
    <div className={cn('w-full h-full', className)}>
      {children}
    </div>
  )
}