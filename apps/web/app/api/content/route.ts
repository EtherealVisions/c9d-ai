/**
 * Content Management API endpoints
 * Handles CRUD operations for onboarding content with validation
 * Migrated to use Drizzle repositories and Zod validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { contentCreationService } from '@/lib/services/content-creation-service'
import { 
  withAuth, 
  withBodyValidation, 
  withQueryValidation,
  withErrorHandling, 
  createErrorResponse, 
  createSuccessResponse 
} from '@/lib/validation/middleware'
import { 
  createOnboardingContentSchema,
  onboardingPathApiResponseSchema,
  validateCreateContent,
  type CreateOnboardingContent,
  type OnboardingPathApiResponse,
  type ContentSearch
} from '@/lib/validation/schemas/content'
import { ValidationError } from '@/lib/validation/errors'
import { z } from 'zod'

// Query parameter validation schema
const contentQuerySchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID').optional(),
  contentType: z.enum(['html', 'markdown', 'json', 'text']).optional(),
  isActive: z.string().transform(val => val === 'true').optional(),
  tags: z.string().transform(val => val.split(',')).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
  sortBy: z.enum(['title', 'createdAt', 'updatedAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
})

/**
 * GET /api/content - Get content with filtering and pagination
 */
async function getHandler(
  request: NextRequest, 
  { query, requestContext }: { query: z.infer<typeof contentQuerySchema>, requestContext: any }
) {
  const { userId } = requestContext
  
  try {
    // Transform query to ContentSearch format
    const searchParams: ContentSearch = {
      organizationId: query.organizationId,
      contentType: query.contentType,
      isActive: query.isActive,
      tags: query.tags,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder
    }

    // Get content using service (mock implementation for now)
    const mockContent: OnboardingPathApiResponse[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Welcome to the Team',
        description: 'Introduction content for new team members',
        targetRole: 'developer',
        subscriptionTier: 'pro',
        estimatedDuration: 30,
        difficulty: 'beginner',
        prerequisites: [],
        successCriteria: { completion: true },
        metadata: { category: 'onboarding' },
        createdAt: new Date(),
        updatedAt: new Date(),
        stepCount: 5,
        completionRate: 85.5,
        averageCompletionTime: 25
      }
    ]

    // Apply filters (mock implementation)
    let filteredContent = mockContent
    
    if (query.organizationId) {
      // In real implementation, filter by organizationId
      filteredContent = filteredContent.filter(content => 
        content.metadata.organizationId === query.organizationId
      )
    }

    if (query.contentType) {
      // In real implementation, filter by contentType
      filteredContent = filteredContent.filter(content => 
        content.metadata.contentType === query.contentType
      )
    }

    // Validate response data
    const validatedContent = filteredContent.map(content => 
      onboardingPathApiResponseSchema.parse(content)
    )

    const responseData = {
      content: validatedContent,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: validatedContent.length,
        totalPages: Math.ceil(validatedContent.length / query.limit)
      }
    }

    return createSuccessResponse(responseData)

  } catch (error) {
    console.error('Error in GET /api/content:', error)
    
    if (error instanceof ValidationError) {
      return error.toResponse()
    }
    
    return createErrorResponse('Failed to fetch content', { 
      statusCode: 500, 
      requestId: requestContext.requestId 
    })
  }
}

/**
 * POST /api/content - Create new content
 */
async function postHandler(
  request: NextRequest, 
  { body, requestContext }: { body: CreateOnboardingContent, requestContext: any }
) {
  const { userId } = requestContext
  
  try {
    // Create content using service
    const result = await contentCreationService.createContent(
      body.organizationId,
      {
        title: body.title,
        content: body.content,
        contentType: body.contentType,
        description: body.description,
        tags: body.tags,
        version: body.version
      },
      userId
    )

    if (result.error) {
      const statusCode = result.code === 'VALIDATION_ERROR' ? 400 :
                        result.code === 'ORGANIZATION_NOT_FOUND' ? 404 :
                        result.code === 'PERMISSION_DENIED' ? 403 : 500

      return createErrorResponse(result.error, { 
        statusCode, 
        requestId: requestContext.requestId 
      })
    }

    return createSuccessResponse(result.data, { statusCode: 201 })

  } catch (error) {
    console.error('Error in POST /api/content:', error)
    
    if (error instanceof ValidationError) {
      return error.toResponse()
    }
    
    return createErrorResponse('Failed to create content', { 
      statusCode: 500, 
      requestId: requestContext.requestId 
    })
  }
}

export const GET = withAuth(
  withQueryValidation(contentQuerySchema, withErrorHandling(getHandler))
)

export const POST = withAuth(
  withBodyValidation(createOnboardingContentSchema, withErrorHandling(postHandler))
)