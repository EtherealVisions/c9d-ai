/**
 * Analytics Events API Route
 * 
 * This API route handles the collection and storage of authentication analytics events.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'

// Validation schema for analytics events
const AuthEventSchema = z.object({
  eventType: z.string(),
  userId: z.string().optional(),
  sessionId: z.string(),
  timestamp: z.number(),
  metadata: z.record(z.any()),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  referrer: z.string().optional(),
  utm: z.object({
    source: z.string().optional(),
    medium: z.string().optional(),
    campaign: z.string().optional(),
    term: z.string().optional(),
    content: z.string().optional()
  }).optional()
})

const AnalyticsRequestSchema = z.object({
  events: z.array(AuthEventSchema)
})

/**
 * POST /api/analytics/events
 * Store authentication analytics events
 */
export async function POST(request: NextRequest) {
  try {
    // Get client IP address
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'

    // Parse and validate request body
    const body = await request.json()
    const validatedData = AnalyticsRequestSchema.parse(body)

    // Add IP address to events
    const eventsWithIP = validatedData.events.map(event => ({
      ...event,
      ipAddress: clientIP,
      receivedAt: Date.now()
    }))

    // In a real implementation, you would store these events in a database
    // For now, we'll just log them and return success
    console.log('Analytics events received:', {
      count: eventsWithIP.length,
      events: eventsWithIP.map(e => ({
        type: e.eventType,
        timestamp: new Date(e.timestamp).toISOString(),
        sessionId: e.sessionId,
        userId: e.userId
      }))
    })

    // Store events in database (implementation would go here)
    await storeAnalyticsEvents(eventsWithIP)

    return NextResponse.json({ 
      success: true, 
      eventsProcessed: eventsWithIP.length 
    })

  } catch (error) {
    console.error('Analytics events processing error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid event data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to process analytics events' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/analytics/events
 * Retrieve analytics events (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin permissions
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin (implementation would check user roles)
    const isAdmin = await checkAdminPermissions(userId)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')
    const eventType = searchParams.get('eventType')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query filters
    const filters = {
      startDate: startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      endDate: endDate ? new Date(endDate) : new Date(),
      eventType,
      limit: Math.min(limit, 1000), // Cap at 1000 events
      offset
    }

    // Retrieve events from database
    const events = await getAnalyticsEvents(filters)
    const totalCount = await getAnalyticsEventsCount(filters)

    return NextResponse.json({
      events,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total: totalCount,
        hasMore: offset + limit < totalCount
      }
    })

  } catch (error) {
    console.error('Analytics events retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve analytics events' },
      { status: 500 }
    )
  }
}

/**
 * Store analytics events in database
 */
async function storeAnalyticsEvents(events: any[]): Promise<void> {
  // In a real implementation, this would store events in a database like PostgreSQL, ClickHouse, or BigQuery
  // For now, we'll simulate storage
  
  try {
    // Example implementation with Supabase
    // const { createSupabaseClient } = await import('@/lib/database')
    // const supabase = createSupabaseClient()
    
    // const { error } = await supabase
    //   .from('analytics_events')
    //   .insert(events)
    
    // if (error) {
    //   throw new Error(`Failed to store analytics events: ${error.message}`)
    // }

    // For demo purposes, just log the events
    console.log(`Stored ${events.length} analytics events`)
    
  } catch (error) {
    console.error('Failed to store analytics events:', error)
    throw error
  }
}

/**
 * Retrieve analytics events from database
 */
async function getAnalyticsEvents(filters: {
  startDate: Date
  endDate: Date
  eventType?: string | null
  limit: number
  offset: number
}): Promise<any[]> {
  // In a real implementation, this would query the database
  // For now, return mock data
  
  const mockEvents = [
    {
      id: '1',
      eventType: 'sign_in_started',
      sessionId: 'session_123',
      timestamp: Date.now() - 1000 * 60 * 5, // 5 minutes ago
      metadata: { page: '/sign-in' },
      userAgent: 'Mozilla/5.0...',
      ipAddress: '192.168.1.1'
    },
    {
      id: '2',
      eventType: 'sign_in_completed',
      sessionId: 'session_123',
      userId: 'user_456',
      timestamp: Date.now() - 1000 * 60 * 4, // 4 minutes ago
      metadata: { success: true },
      userAgent: 'Mozilla/5.0...',
      ipAddress: '192.168.1.1'
    }
  ]

  // Apply filters
  let filteredEvents = mockEvents.filter(event => 
    event.timestamp >= filters.startDate.getTime() &&
    event.timestamp <= filters.endDate.getTime()
  )

  if (filters.eventType) {
    filteredEvents = filteredEvents.filter(event => 
      event.eventType === filters.eventType
    )
  }

  // Apply pagination
  return filteredEvents.slice(filters.offset, filters.offset + filters.limit)
}

/**
 * Get total count of analytics events
 */
async function getAnalyticsEventsCount(filters: {
  startDate: Date
  endDate: Date
  eventType?: string | null
}): Promise<number> {
  // In a real implementation, this would count records in the database
  return 2 // Mock count
}

/**
 * Check if user has admin permissions
 */
async function checkAdminPermissions(userId: string): Promise<boolean> {
  // In a real implementation, this would check user roles/permissions
  // For now, return true for demo purposes
  return true
}