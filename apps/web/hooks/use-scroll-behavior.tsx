'use client'

import { useState, useEffect, useCallback } from 'react'

interface ScrollBehaviorOptions {
  showAfterScroll?: number
  hideOnSections?: string[]
  throttleMs?: number
}

interface ScrollBehaviorState {
  scrollY: number
  isVisible: boolean
  currentSection: string | null
  scrollDirection: 'up' | 'down' | null
  scrollProgress: number
}

export function useScrollBehavior(options: ScrollBehaviorOptions = {}) {
  const {
    showAfterScroll = 300,
    hideOnSections = [],
    throttleMs = 16
  } = options

  const [state, setState] = useState<ScrollBehaviorState>({
    scrollY: 0,
    isVisible: false,
    currentSection: null,
    scrollDirection: null,
    scrollProgress: 0
  })

  const [lastScrollY, setLastScrollY] = useState(0)
  const [ticking, setTicking] = useState(false)

  const updateScrollState = useCallback(() => {
    const scrollY = window.scrollY
    const documentHeight = document.documentElement.scrollHeight - window.innerHeight
    const scrollProgress = documentHeight > 0 ? (scrollY / documentHeight) * 100 : 0

    // Determine scroll direction
    const scrollDirection = scrollY > lastScrollY ? 'down' : scrollY < lastScrollY ? 'up' : null

    // Find current section
    const sections = document.querySelectorAll('[data-section]')
    let currentSection: string | null = null

    sections.forEach((section) => {
      const rect = section.getBoundingClientRect()
      const sectionId = section.getAttribute('data-section')
      
      // Consider section active if it's in the top half of viewport
      if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
        currentSection = sectionId
      }
    })

    // Determine visibility based on scroll position and current section
    const shouldShow = scrollY >= showAfterScroll
    const shouldHide = currentSection && hideOnSections.includes(currentSection)
    const isVisible = shouldShow && !shouldHide

    setState({
      scrollY,
      isVisible,
      currentSection,
      scrollDirection,
      scrollProgress
    })

    setLastScrollY(scrollY)
    setTicking(false)
  }, [showAfterScroll, hideOnSections, lastScrollY])

  const requestTick = useCallback(() => {
    if (!ticking) {
      setTicking(true)
      requestAnimationFrame(updateScrollState)
    }
  }, [ticking, updateScrollState])

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const handleScroll = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(requestTick, throttleMs)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    
    // Initial state
    updateScrollState()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(timeoutId)
    }
  }, [requestTick, throttleMs, updateScrollState])

  return state
}

// Hook for tracking user engagement based on scroll behavior
export function useScrollEngagement() {
  const [engagement, setEngagement] = useState({
    timeOnPage: 0,
    scrollDepth: 0,
    maxScrollDepth: 0,
    scrollEvents: 0,
    isEngaged: false
  })

  useEffect(() => {
    const startTime = Date.now()
    let scrollEventCount = 0
    let maxDepth = 0

    const updateEngagement = () => {
      const timeOnPage = Date.now() - startTime
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollDepth = documentHeight > 0 ? (window.scrollY / documentHeight) * 100 : 0
      
      if (scrollDepth > maxDepth) {
        maxDepth = scrollDepth
      }

      // Consider user engaged if they've been on page > 30s or scrolled > 50%
      const isEngaged = timeOnPage > 30000 || maxDepth > 50

      setEngagement({
        timeOnPage,
        scrollDepth,
        maxScrollDepth: maxDepth,
        scrollEvents: scrollEventCount,
        isEngaged
      })
    }

    const handleScroll = () => {
      scrollEventCount++
      updateEngagement()
    }

    const interval = setInterval(updateEngagement, 1000)
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      clearInterval(interval)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return engagement
}