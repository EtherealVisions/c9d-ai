// Comprehensive tests for PhaseSDKCache
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PhaseSDKCache, CacheInvalidationPattern, getPhaseSDKCache, clearPhaseSDKCache } from '../phase-sdk-cache';
import { TokenSource } from '../phase-token-loader';

// Mock timers for testing TTL behavior
vi.useFakeTimers();

describe('PhaseSDKCache', () => {
  let cache: PhaseSDKCache;
  
  const mockTokenSource: TokenSource = {
    source: 'process.env',
    token: 'test-token',
    path: undefined
  };

  const mockSecrets = {
    'DATABASE_URL': 'postgresql://test',
    'API_KEY': 'secret-key',
    'DEBUG': 'true'
  };

  beforeEach(() => {
    // Get fresh cache instance
    cache = PhaseSDKCache.getInstance();
    cache.clear(); // Clear any existing entries
    vi.clearAllTimers();
  });

  afterEach(() => {
    cache.shutdown(); // Properly shutdown to clear intervals
    vi.clearAllTimers();
  });

  // Global cleanup after all tests
  afterAll(() => {
    vi.useRealTimers();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const cache1 = PhaseSDKCache.getInstance();
      const cache2 = PhaseSDKCache.getInstance();
      
      expect(cache1).toBe(cache2);
    });

    it('should work with convenience function', () => {
      const cache1 = getPhaseSDKCache();
      const cache2 = PhaseSDKCache.getInstance();
      
      expect(cache1).toBe(cache2);
    });
  });

  describe('basic cache operations', () => {
    it('should store and retrieve secrets', () => {
      cache.set('TestApp', 'development', mockSecrets, mockTokenSource);
      
      const retrieved = cache.get('TestApp', 'development', mockTokenSource);
      
      expect(retrieved).toEqual(mockSecrets);
      expect(retrieved).not.toBe(mockSecrets); // Should be a copy
    });

    it('should return null for non-existent entries', () => {
      const result = cache.get('NonExistent', 'development', mockTokenSource);
      
      expect(result).toBeNull();
    });

    it('should check if cache has entry', () => {
      cache.set('TestApp', 'development', mockSecrets, mockTokenSource);
      
      expect(cache.has('TestApp', 'development', mockTokenSource)).toBe(true);
      expect(cache.has('NonExistent', 'development', mockTokenSource)).toBe(false);
    });

    it('should create separate entries for different apps', () => {
      const secrets1 = { VAR1: 'value1' };
      const secrets2 = { VAR2: 'value2' };
      
      cache.set('App1', 'development', secrets1, mockTokenSource);
      cache.set('App2', 'development', secrets2, mockTokenSource);
      
      expect(cache.get('App1', 'development', mockTokenSource)).toEqual(secrets1);
      expect(cache.get('App2', 'development', mockTokenSource)).toEqual(secrets2);
    });

    it('should create separate entries for different environments', () => {
      const devSecrets = { ENV: 'development' };
      const prodSecrets = { ENV: 'production' };
      
      cache.set('TestApp', 'development', devSecrets, mockTokenSource);
      cache.set('TestApp', 'production', prodSecrets, mockTokenSource);
      
      expect(cache.get('TestApp', 'development', mockTokenSource)).toEqual(devSecrets);
      expect(cache.get('TestApp', 'production', mockTokenSource)).toEqual(prodSecrets);
    });

    it('should create separate entries for different token sources', () => {
      const tokenSource1: TokenSource = { source: 'process.env', token: 'token1' };
      const tokenSource2: TokenSource = { source: 'local.env.local', token: 'token2', path: '.env.local' };
      
      const secrets1 = { SOURCE: 'env' };
      const secrets2 = { SOURCE: 'file' };
      
      cache.set('TestApp', 'development', secrets1, tokenSource1);
      cache.set('TestApp', 'development', secrets2, tokenSource2);
      
      expect(cache.get('TestApp', 'development', tokenSource1)).toEqual(secrets1);
      expect(cache.get('TestApp', 'development', tokenSource2)).toEqual(secrets2);
    });
  });

  describe('TTL and expiration', () => {
    it('should expire entries after TTL', () => {
      const customTTL = 1000; // 1 second
      
      cache.set('TestApp', 'development', mockSecrets, mockTokenSource, customTTL);
      
      // Should be available immediately
      expect(cache.get('TestApp', 'development', mockTokenSource)).toEqual(mockSecrets);
      
      // Advance time past TTL
      vi.advanceTimersByTime(customTTL + 1);
      
      // Should be expired
      expect(cache.get('TestApp', 'development', mockTokenSource)).toBeNull();
      expect(cache.has('TestApp', 'development', mockTokenSource)).toBe(false);
    });

    it('should use default TTL when not specified', () => {
      cache.set('TestApp', 'development', mockSecrets, mockTokenSource);
      
      // Should be available before default TTL (5 minutes)
      vi.advanceTimersByTime(4 * 60 * 1000); // 4 minutes
      expect(cache.get('TestApp', 'development', mockTokenSource)).toEqual(mockSecrets);
      
      // Should expire after default TTL
      vi.advanceTimersByTime(2 * 60 * 1000); // +2 minutes = 6 minutes total
      expect(cache.get('TestApp', 'development', mockTokenSource)).toBeNull();
    });

    it('should clean up expired entries automatically', () => {
      const shortTTL = 1000;
      
      cache.set('TestApp1', 'development', mockSecrets, mockTokenSource, shortTTL);
      cache.set('TestApp2', 'development', mockSecrets, mockTokenSource); // Default TTL
      
      // Advance time to expire first entry
      vi.advanceTimersByTime(shortTTL + 1);
      
      // Trigger cleanup (runs every 2 minutes)
      vi.advanceTimersByTime(2 * 60 * 1000);
      
      expect(cache.has('TestApp1', 'development', mockTokenSource)).toBe(false);
      expect(cache.has('TestApp2', 'development', mockTokenSource)).toBe(true);
    });
  });

  describe('cache invalidation', () => {
    beforeEach(() => {
      // Set up test data
      cache.set('App1', 'development', { VAR: 'dev1' }, mockTokenSource);
      cache.set('App1', 'production', { VAR: 'prod1' }, mockTokenSource);
      cache.set('App2', 'development', { VAR: 'dev2' }, mockTokenSource);
      cache.set('App2', 'production', { VAR: 'prod2' }, mockTokenSource);
    });

    it('should invalidate all entries', () => {
      const deletedCount = cache.invalidate(CacheInvalidationPattern.ALL);
      
      expect(deletedCount).toBe(4);
      expect(cache.has('App1', 'development', mockTokenSource)).toBe(false);
      expect(cache.has('App1', 'production', mockTokenSource)).toBe(false);
      expect(cache.has('App2', 'development', mockTokenSource)).toBe(false);
      expect(cache.has('App2', 'production', mockTokenSource)).toBe(false);
    });

    it('should invalidate entries by app', () => {
      const deletedCount = cache.invalidate(CacheInvalidationPattern.BY_APP, { appName: 'App1' });
      
      expect(deletedCount).toBe(2);
      expect(cache.has('App1', 'development', mockTokenSource)).toBe(false);
      expect(cache.has('App1', 'production', mockTokenSource)).toBe(false);
      expect(cache.has('App2', 'development', mockTokenSource)).toBe(true);
      expect(cache.has('App2', 'production', mockTokenSource)).toBe(true);
    });

    it('should invalidate entries by environment', () => {
      const deletedCount = cache.invalidate(CacheInvalidationPattern.BY_ENVIRONMENT, { environment: 'development' });
      
      expect(deletedCount).toBe(2);
      expect(cache.has('App1', 'development', mockTokenSource)).toBe(false);
      expect(cache.has('App2', 'development', mockTokenSource)).toBe(false);
      expect(cache.has('App1', 'production', mockTokenSource)).toBe(true);
      expect(cache.has('App2', 'production', mockTokenSource)).toBe(true);
    });

    it('should invalidate entries by token source', () => {
      const altTokenSource: TokenSource = { source: 'local.env.local', token: 'alt-token', path: '.env.local' };
      cache.set('App3', 'development', { VAR: 'alt' }, altTokenSource);
      
      const deletedCount = cache.invalidate(CacheInvalidationPattern.BY_TOKEN_SOURCE, { tokenSource: 'process.env' });
      
      expect(deletedCount).toBe(4); // Original 4 entries
      expect(cache.has('App3', 'development', altTokenSource)).toBe(true); // Alt source should remain
    });

    it('should invalidate only expired entries', () => {
      const shortTTL = 1000;
      cache.set('ExpiredApp', 'development', { VAR: 'expired' }, mockTokenSource, shortTTL);
      
      // Advance time to expire one entry
      vi.advanceTimersByTime(shortTTL + 1);
      
      const deletedCount = cache.invalidate(CacheInvalidationPattern.EXPIRED_ONLY);
      
      expect(deletedCount).toBe(1);
      expect(cache.has('ExpiredApp', 'development', mockTokenSource)).toBe(false);
      // Other entries should still exist
      expect(cache.has('App1', 'development', mockTokenSource)).toBe(true);
    });

    it('should throw error for invalid invalidation criteria', () => {
      expect(() => {
        cache.invalidate(CacheInvalidationPattern.BY_APP);
      }).toThrow('appName is required for BY_APP invalidation');

      expect(() => {
        cache.invalidate(CacheInvalidationPattern.BY_ENVIRONMENT);
      }).toThrow('environment is required for BY_ENVIRONMENT invalidation');

      expect(() => {
        cache.invalidate(CacheInvalidationPattern.BY_TOKEN_SOURCE);
      }).toThrow('tokenSource is required for BY_TOKEN_SOURCE invalidation');
    });
  });

  describe('metrics and monitoring', () => {
    it('should track cache hits and misses', () => {
      cache.set('TestApp', 'development', mockSecrets, mockTokenSource);
      
      // Hit
      cache.get('TestApp', 'development', mockTokenSource);
      
      // Miss
      cache.get('NonExistent', 'development', mockTokenSource);
      
      const metrics = cache.getMetrics();
      
      expect(metrics.totalHits).toBe(1);
      expect(metrics.totalMisses).toBe(1);
      expect(metrics.hitRate).toBe(0.5);
    });

    it('should calculate memory usage estimate', () => {
      cache.set('TestApp', 'development', mockSecrets, mockTokenSource);
      
      const metrics = cache.getMetrics();
      
      expect(metrics.totalEntries).toBe(1);
      expect(metrics.memoryUsageEstimate).toBeGreaterThan(0);
      expect(metrics.averageEntrySize).toBeGreaterThan(0);
    });

    it('should track entry ages', () => {
      cache.set('TestApp', 'development', mockSecrets, mockTokenSource);
      
      vi.advanceTimersByTime(5000); // 5 seconds
      
      const metrics = cache.getMetrics();
      
      expect(metrics.oldestEntry).toBe(5000);
      expect(metrics.newestEntry).toBe(5000);
    });

    it('should provide cache status', () => {
      cache.set('TestApp', 'development', mockSecrets, mockTokenSource);
      
      const status = cache.getStatus();
      
      expect(status.enabled).toBe(true);
      expect(status.entryCount).toBe(1);
      expect(status.maxEntries).toBeGreaterThan(0);
      expect(status.defaultTTL).toBeGreaterThan(0);
      expect(status.cleanupRunning).toBe(true);
      expect(status.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('cache configuration', () => {
    it('should update default TTL', () => {
      const newTTL = 10000; // 10 seconds
      
      cache.configure({ defaultTTL: newTTL });
      cache.set('TestApp', 'development', mockSecrets, mockTokenSource);
      
      // Should not expire before new TTL
      vi.advanceTimersByTime(newTTL - 1000);
      expect(cache.has('TestApp', 'development', mockTokenSource)).toBe(true);
      
      // Should expire after new TTL
      vi.advanceTimersByTime(2000);
      expect(cache.has('TestApp', 'development', mockTokenSource)).toBe(false);
    });

    it('should update max entries and evict if necessary', () => {
      // Fill cache with multiple entries
      for (let i = 0; i < 5; i++) {
        cache.set(`App${i}`, 'development', { VAR: `value${i}` }, mockTokenSource);
      }
      
      expect(cache.getStatus().entryCount).toBe(5);
      
      // Reduce max entries
      cache.configure({ maxEntries: 3 });
      
      expect(cache.getStatus().entryCount).toBe(3);
      expect(cache.getStatus().maxEntries).toBe(3);
    });
  });

  describe('cache warming', () => {
    it('should configure cache warming', () => {
      const warmingConfig = {
        enabled: true,
        apps: [
          { appName: 'App1', environment: 'production', priority: 1 },
          { appName: 'App2', environment: 'development', priority: 2 }
        ],
        warmingInterval: 60000, // 1 minute
        maxConcurrentWarming: 2
      };
      
      cache.configureCacheWarming(warmingConfig);
      
      const status = cache.getStatus();
      expect(status.warmingEnabled).toBe(true);
    });

    it('should manually warm cache', async () => {
      const secretLoader = vi.fn().mockResolvedValue(mockSecrets);
      
      const result = await cache.warmCache('TestApp', 'development', mockTokenSource, secretLoader);
      
      expect(result).toBe(true);
      expect(secretLoader).toHaveBeenCalledWith('TestApp', 'development');
      expect(cache.has('TestApp', 'development', mockTokenSource)).toBe(true);
    });

    it('should handle warming failures', async () => {
      const secretLoader = vi.fn().mockRejectedValue(new Error('Loading failed'));
      
      const result = await cache.warmCache('TestApp', 'development', mockTokenSource, secretLoader);
      
      expect(result).toBe(false);
      expect(cache.has('TestApp', 'development', mockTokenSource)).toBe(false);
    });
  });

  describe('memory management and security', () => {
    it('should evict oldest entries when max capacity reached', () => {
      cache.configure({ maxEntries: 2 });
      
      // Add entries with time gaps
      cache.set('App1', 'development', { VAR: 'value1' }, mockTokenSource);
      vi.advanceTimersByTime(1000);
      
      cache.set('App2', 'development', { VAR: 'value2' }, mockTokenSource);
      vi.advanceTimersByTime(1000);
      
      // This should evict App1 (oldest)
      cache.set('App3', 'development', { VAR: 'value3' }, mockTokenSource);
      
      expect(cache.has('App1', 'development', mockTokenSource)).toBe(false);
      expect(cache.has('App2', 'development', mockTokenSource)).toBe(true);
      expect(cache.has('App3', 'development', mockTokenSource)).toBe(true);
    });

    it('should clear cache with convenience function', () => {
      cache.set('TestApp', 'development', mockSecrets, mockTokenSource);
      
      clearPhaseSDKCache();
      
      expect(cache.has('TestApp', 'development', mockTokenSource)).toBe(false);
    });

    it('should handle shutdown gracefully', () => {
      cache.set('TestApp', 'development', mockSecrets, mockTokenSource);
      
      cache.shutdown();
      
      expect(cache.getStatus().entryCount).toBe(0);
      expect(cache.getStatus().cleanupRunning).toBe(false);
    });
  });

  describe('access tracking', () => {
    it('should track access count and last accessed time', () => {
      cache.set('TestApp', 'development', mockSecrets, mockTokenSource);
      
      // Access multiple times
      cache.get('TestApp', 'development', mockTokenSource);
      vi.advanceTimersByTime(1000);
      cache.get('TestApp', 'development', mockTokenSource);
      
      const metrics = cache.getMetrics();
      expect(metrics.totalHits).toBe(2);
    });

    it('should update last accessed time on each access', () => {
      cache.set('TestApp', 'development', mockSecrets, mockTokenSource);
      
      const initialTime = Date.now();
      cache.get('TestApp', 'development', mockTokenSource);
      
      vi.advanceTimersByTime(5000);
      cache.get('TestApp', 'development', mockTokenSource);
      
      // Entry should still be accessible (last accessed time updated)
      expect(cache.has('TestApp', 'development', mockTokenSource)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle empty secrets gracefully', () => {
      const emptySecrets = {};
      
      cache.set('TestApp', 'development', emptySecrets, mockTokenSource);
      
      const retrieved = cache.get('TestApp', 'development', mockTokenSource);
      expect(retrieved).toEqual(emptySecrets);
    });

    it('should handle special characters in secrets', () => {
      const specialSecrets = {
        'UNICODE_VAR': '🔐 Secret with emoji',
        'JSON_VAR': '{"nested": "value"}',
        'MULTILINE_VAR': 'line1\nline2\nline3'
      };
      
      cache.set('TestApp', 'development', specialSecrets, mockTokenSource);
      
      const retrieved = cache.get('TestApp', 'development', mockTokenSource);
      expect(retrieved).toEqual(specialSecrets);
    });
  });
});