/**
 * Timer mocking utilities for tests with time-dependent components
 */

import { vi } from 'vitest'

/**
 * Mock timers and provide utilities for controlling time in tests
 */
export function setupTimerMocks() {
  vi.useFakeTimers()
  
  return {
    /**
     * Advance timers by specified milliseconds
     */
    advanceTime: (ms: number) => {
      vi.advanceTimersByTime(ms)
    },
    
    /**
     * Run all pending timers
     */
    runAllTimers: () => {
      vi.runAllTimers()
    },
    
    /**
     * Run only currently pending timers
     */
    runOnlyPendingTimers: () => {
      vi.runOnlyPendingTimers()
    },
    
    /**
     * Cleanup timers
     */
    cleanup: () => {
      vi.useRealTimers()
    }
  }
}

/**
 * Mock requestAnimationFrame for smooth animations in tests
 */
export function mockAnimationFrame() {
  let frameId = 0
  const callbacks = new Map<number, FrameRequestCallback>()
  
  global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
    const id = ++frameId
    callbacks.set(id, callback)
    // Execute immediately in tests
    setTimeout(() => {
      if (callbacks.has(id)) {
        callback(performance.now())
        callbacks.delete(id)
      }
    }, 0)
    return id
  })
  
  global.cancelAnimationFrame = vi.fn((id: number) => {
    callbacks.delete(id)
  })
}

/**
 * Mock performance.now for consistent timing in tests
 */
export function mockPerformanceNow() {
  let now = 0
  
  Object.defineProperty(performance, 'now', {
    value: vi.fn(() => now),
    writable: true
  })
  
  return {
    setTime: (time: number) => {
      now = time
    },
    advanceTime: (ms: number) => {
      now += ms
    }
  }
}