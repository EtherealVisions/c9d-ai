/**
 * Organization Metadata API endpoints
 * Handles metadata operations for organizations
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { organizationService } from '@/lib/services/organization-service'
import { z } from 'zod'

const metadataSchema = z.record(z.any())

/**
 * PUT /api/organizations/[id]/metadata
 * Update organization metadata
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validate metadata
    const validatedMetadata = metadataSchema.parse(body)
    
    const result = await organizationService.updateOrganizationMetadata(
      params.id,
      userId,
      validatedMetadata
    )
    
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.code === 'ORGANIZATION_NOT_FOUND' ? 404 : 500 }
      )
    }

    return NextResponse.json({
      organization: result.data
    })
  } catch (error) {
    console.error('Error in PUT /api/organizations/[id]/metadata:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid metadata format',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}