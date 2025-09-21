/**
 * Individual Content API endpoints
 * Handles operations for specific content by ID with validation
 * Migrated to use Drizzle repositories and Zod validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { contentCreationService } from '@/lib/services/content-creation-service'
import { 
  withAuth, 
  withBodyValidation, 
  withParamsValidation,
  withErrorHandling, 
  createErrorResponse, 
  createSuccessResponse 
} from '@/lib/validation/middleware'
import { 
  updateOnboardingContentSchema,
  onboardingPathApiResponseSchema,
  validateUpdateContent,
  type UpdateOnboardingContent,
  type OnboardingPathApiResponse
} from '@/lib/validation/schemas/content'
import { ValidationError } from '@/lib/validation/errors'
import { z } from 'zod'

// Path parameter validation schema
const contentParamsSchema = z.object({
  id: z.string().uuid('Invalid content ID')
})

/**
 * GET /api/content/[id] - Get content by ID
 */
async function getHandler(
  request: NextRequest, 
  { params, requestContext }: { params: z.infer<typeof contentParamsSchema>, requestContext: any }
) {
  const { userId } = requestContext
  const { id: contentId } = params
  
  try {
    // Get content using service (mock implementation for now)
    const mockContent: OnboardingPathApiResponse = {
      id: contentId,
      name: 'Sample Content',
      description: 'A sample content item for demonstration',
      targetRole: 'developer',
      subscriptionTier: 'pro',
      estimatedDuration: 30,
      difficulty: 'beginner',
      prerequisites: [],
      successCriteria: { completion: true },
      metadata: { 
        category: 'onboarding',
        organizationId: 'org-123',
        contentType: 'html'
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      stepCount: 5,
      completionRate: 85.5,
      averageCompletionTime: 25
    }

    // Validate response data
    const validatedContent = onboardingPathApiResponseSchema.parse(mockContent)

    return createSuccessResponse({
      content: validatedContent
    })

  } catch (error) {
    console.error('Error in GET /api/content/[id]:', error)
    
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
 * PUT /api/content/[id] - Update content by ID
 */
async function putHandler(
  request: NextRequest, 
  { 
    params, 
    body, 
    requestContext 
  }: { 
    params: z.infer<typeof contentParamsSchema>, 
    body: UpdateOnboardingContent, 
    requestContext: any 
  }
) {
  const { userId } = requestContext
  const { id: contentId } = params
  
  try {
    // Update content using service
    const result = await contentCreationService.updateContent(
      contentId,
      {
        title: body.title,
        content: body.content,
        contentType: body.contentType,
        description: body.description,
        tags: body.tags,
        version: body.version,
        isActive: body.isActive
      },
      userId
    )

    if (result.error) {
      const statusCode = result.code === 'VALIDATION_ERROR' ? 400 :
                        result.code === 'CONTENT_NOT_FOUND' ? 404 :
                        result.code === 'PERMISSION_DENIED' ? 403 : 500

      return createErrorResponse(result.error, { 
        statusCode, 
        requestId: requestContext.requestId 
      })
    }

    return createSuccessResponse(result.data)

  } catch (error) {
    console.error('Error in PUT /api/content/[id]:', error)
    
    if (error instanceof ValidationError) {
      return error.toResponse()
    }
    
    return createErrorResponse('Failed to update content', { 
      statusCode: 500, 
      requestId: requestContext.requestId 
    })
  }
}

/**
 * DELETE /api/content/[id] - Delete content by ID (soft delete)
 */
async function deleteHandler(
  request: NextRequest, 
  { params, requestContext }: { params: z.infer<typeof contentParamsSchema>, requestContext: any }
) {
  const { userId } = requestContext
  const { id: contentId } = params
  
  try {
    // Delete content using service (mock implementation for now)
    const mockResult = {
      success: true,
      message: 'Content deleted successfully',
      deletedAt: new Date().toISOString()
    }

    return createSuccessResponse(mockResult)

  } catch (error) {
    console.error('Error in DELETE /api/content/[id]:', error)
    
    if (error instanceof ValidationError) {
      return error.toResponse()
    }
    
    return createErrorResponse('Failed to delete content', { 
      statusCode: 500, 
      requestId: requestContext.requestId 
    })
  }
}

export const GET = withAuth(
  withParamsValidation(contentParamsSchema, withErrorHandling(getHandler))
)

export const PUT = withAuth(
  withParamsValidation(
    contentParamsSchema,
    withBodyValidation(updateOnboardingContentSchema, withErrorHandling(putHandler))
  )
)

export const DELETE = withAuth(
  withParamsValidation(contentParamsSchema, withErrorHandling(deleteHandler))
)