"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Menu, X, ChevronDown, ChevronRight } from 'lucide-react'
import { useMobileOptimized } from '@/hooks/use-mobile-optimized'
import { cn } from '@/lib/utils'

interface NavigationItem {
  id: string
  label: string
  href?: string
  icon?: React.ComponentType<{ className?: string }>
  children?: NavigationItem[]
  badge?: string
  onClick?: () => void
}

interface MobileNavigationProps {
  items: NavigationItem[]
  logo?: React.ReactNode
  className?: string
  onItemClick?: (item: NavigationItem) => void
  showBackdrop?: boolean
  closeOnItemClick?: boolean
  enableSwipeToClose?: boolean
}

export function MobileNavigation({
  items,
  logo,
  className = '',
  onItemClick,
  showBackdrop = true,
  closeOnItemClick = true,
  enableSwipeToClose = true
}: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  
  const { 
    isMobile, 
    isTouch, 
    reducedMotion, 
    handleTouchStart, 
    handleTouchEnd,
    onSwipe 
  } = useMobileOptimized()

  // Handle swipe to close
  useEffect(() => {
    if (!enableSwipeToClose || !isOpen) return

    const cleanup = onSwipe((gesture) => {
      if (gesture.direction === 'left' && gesture.distance > 100) {
        setIsOpen(false)
      }
    })

    return cleanup
  }, [enableSwipeToClose, isOpen, onSwipe])

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
    } else {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }

    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [isOpen])

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const handleItemClick = (item: NavigationItem) => {
    if (item.children && item.children.length > 0) {
      toggleExpanded(item.id)
    } else {
      if (closeOnItemClick) {
        setIsOpen(false)
      }
      onItemClick?.(item)
      item.onClick?.()
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) {
      setIsOpen(false)
    }
  }

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.has(item.id)
    const IconComponent = item.icon

    return (
      <div key={item.id} className="w-full">
        <button
          onClick={() => handleItemClick(item)}
          className={cn(
            'w-full flex items-center justify-between px-4 py-3 text-left',
            'hover:bg-gray-50 active:bg-gray-100 transition-colors duration-150',
            'focus:outline-none focus:bg-gray-50',
            level > 0 && 'pl-8 border-l-2 border-gray-200 ml-4',
            reducedMotion && 'transition-none'
          )}
          style={{ paddingLeft: `${1 + level * 1}rem` }}
        >
          <div className="flex items-center gap-3">
            {IconComponent && (
              <IconComponent className="h-5 w-5 text-gray-600 flex-shrink-0" />
            )}
            <span className="text-gray-900 font-medium">{item.label}</span>
            {item.badge && (
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                {item.badge}
              </span>
            )}
          </div>
          {hasChildren && (
            <ChevronRight 
              className={cn(
                'h-4 w-4 text-gray-400 transition-transform duration-200',
                isExpanded && 'rotate-90',
                reducedMotion && 'transition-none'
              )}
            />
          )}
        </button>

        {/* Submenu */}
        {hasChildren && (
          <div
            className={cn(
              'overflow-hidden transition-all duration-300 ease-in-out',
              isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0',
              reducedMotion && 'transition-none'
            )}
          >
            <div className="bg-gray-50">
              {item.children?.map(child => renderNavigationItem(child, level + 1))}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (!isMobile) {
    return null // Only show on mobile devices
  }

  return (
    <>
      {/* Menu Toggle Button */}
      <button
        onClick={toggleMenu}
        className={cn(
          'relative z-50 p-2 rounded-lg',
          'bg-white shadow-md hover:shadow-lg',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-blue-500',
          reducedMotion && 'transition-none',
          className
        )}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
      >
        <div className="relative w-6 h-6">
          <Menu 
            className={cn(
              'absolute inset-0 h-6 w-6 text-gray-700 transition-all duration-200',
              isOpen ? 'opacity-0 rotate-180 scale-75' : 'opacity-100 rotate-0 scale-100',
              reducedMotion && 'transition-none'
            )}
          />
          <X 
            className={cn(
              'absolute inset-0 h-6 w-6 text-gray-700 transition-all duration-200',
              isOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-180 scale-75',
              reducedMotion && 'transition-none'
            )}
          />
        </div>
      </button>

      {/* Backdrop */}
      {showBackdrop && isOpen && (
        <div
          ref={backdropRef}
          className={cn(
            'fixed inset-0 bg-black/50 z-40 transition-opacity duration-300',
            isOpen ? 'opacity-100' : 'opacity-0',
            reducedMotion && 'transition-none'
          )}
          onClick={handleBackdropClick}
          aria-hidden="true"
        />
      )}

      {/* Mobile Menu */}
      <div
        ref={menuRef}
        className={cn(
          'fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-50',
          'transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
          reducedMotion && 'transition-none'
        )}
        onTouchStart={(e) => {
          if (e.touches.length === 1) {
            setTouchStart({
              x: e.touches[0].clientX,
              y: e.touches[0].clientY
            })
            handleTouchStart(e.nativeEvent)
          }
        }}
        onTouchEnd={(e) => {
          handleTouchEnd(e.nativeEvent)
          setTouchStart(null)
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {logo && (
            <div className="flex-1">
              {logo}
            </div>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className={cn(
              'p-2 rounded-lg hover:bg-gray-100 transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              reducedMotion && 'transition-none'
            )}
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-2">
          <nav role="navigation" aria-label="Mobile navigation">
            {items.map(item => renderNavigationItem(item))}
          </nav>
        </div>

        {/* Swipe indicator */}
        {enableSwipeToClose && isTouch && (
          <div className="absolute top-1/2 left-2 -translate-y-1/2">
            <div className="w-1 h-12 bg-gray-300 rounded-full opacity-50" />
          </div>
        )}
      </div>
    </>
  )
}

// Hook for managing mobile navigation state
export function useMobileNavigation() {
  const [isOpen, setIsOpen] = useState(false)
  const { isMobile } = useMobileOptimized()

  const openMenu = () => setIsOpen(true)
  const closeMenu = () => setIsOpen(false)
  const toggleMenu = () => setIsOpen(!isOpen)

  // Auto-close when switching to desktop
  useEffect(() => {
    if (!isMobile && isOpen) {
      setIsOpen(false)
    }
  }, [isMobile, isOpen])

  return {
    isOpen,
    openMenu,
    closeMenu,
    toggleMenu,
    isMobile
  }
}

// Utility component for navigation items
export function createNavigationItem(
  id: string,
  label: string,
  options: Partial<NavigationItem> = {}
): NavigationItem {
  return {
    id,
    label,
    ...options
  }
}