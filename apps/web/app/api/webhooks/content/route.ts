/**
 * Content Management Webhook Handler
 * Handles webhook events for content updates and synchronization
 * Migrated to use Drizzle repositories and Zod validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { contentCreationService } from '@/lib/services/content-creation-service'
import { 
  withBodyValidation, 
  withErrorHandling, 
  createErrorResponse, 
  createSuccessResponse 
} from '@/lib/validation/middleware'
import { ValidationError } from '@/lib/validation/errors'
import { z } from 'zod'

// Webhook event validation schemas
const contentWebhookEventSchema = z.object({
  event: z.enum(['content.created', 'content.updated', 'content.deleted', 'content.published']),
  timestamp: z.string().datetime(),
  source: z.string().min(1, 'Source is required'),
  contentId: z.string().uuid('Invalid content ID'),
  organizationId: z.string().uuid('Invalid organization ID'),
  userId: z.string().uuid('Invalid user ID').optional(),
  data: z.object({
    title: z.string().optional(),
    contentType: z.enum(['html', 'markdown', 'json', 'text']).optional(),
    version: z.string().optional(),
    isActive: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    metadata: z.record(z.unknown()).optional()
  }).optional(),
  signature: z.string().min(1, 'Webhook signature is required')
})

// File upload validation schema
const fileUploadWebhookSchema = z.object({
  event: z.literal('file.uploaded'),
  timestamp: z.string().datetime(),
  source: z.string().min(1, 'Source is required'),
  fileId: z.string().uuid('Invalid file ID'),
  organizationId: z.string().uuid('Invalid organization ID'),
  userId: z.string().uuid('Invalid user ID'),
  file: z.object({
    name: z.string().min(1, 'File name is required'),
    size: z.number().int().min(1, 'File size must be positive'),
    type: z.string().min(1, 'File type is required'),
    url: z.string().url('Invalid file URL'),
    checksum: z.string().optional(),
    metadata: z.record(z.unknown()).optional()
  }),
  signature: z.string().min(1, 'Webhook signature is required')
})

// Media handling validation schema
const mediaWebhookSchema = z.object({
  event: z.enum(['media.processed', 'media.failed', 'media.optimized']),
  timestamp: z.string().datetime(),
  source: z.string().min(1, 'Source is required'),
  mediaId: z.string().uuid('Invalid media ID'),
  organizationId: z.string().uuid('Invalid organization ID'),
  processing: z.object({
    status: z.enum(['completed', 'failed', 'processing']),
    formats: z.array(z.object({
      type: z.string(),
      url: z.string().url(),
      size: z.number().int().min(0),
      dimensions: z.object({
        width: z.number().int().min(1),
        height: z.number().int().min(1)
      }).optional()
    })).optional(),
    error: z.string().optional(),
    processingTime: z.number().min(0).optional()
  }),
  signature: z.string().min(1, 'Webhook signature is required')
})

// Union schema for all webhook types
const webhookPayloadSchema = z.discriminatedUnion('event', [
  contentWebhookEventSchema,
  fileUploadWebhookSchema,
  mediaWebhookSchema
])

/**
 * Verify webhook signature (mock implementation)
 */
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  // In a real implementation, this would verify the HMAC signature
  // For now, we'll just check that the signature exists
  return signature.length > 0
}

/**
 * POST /api/webhooks/content - Handle content management webhooks
 */
async function postHandler(
  request: NextRequest, 
  { body, requestContext }: { body: z.infer<typeof webhookPayloadSchema>, requestContext: any }
) {
  try {
    // Verify webhook signature
    const webhookSecret = process.env.CONTENT_WEBHOOK_SECRET || 'default-secret'
    const rawBody = JSON.stringify(body)
    
    if (!verifyWebhookSignature(rawBody, body.signature, webhookSecret)) {
      return createErrorResponse('Invalid webhook signature', { 
        statusCode: 401, 
        requestId: requestContext.requestId 
      })
    }

    // Handle different webhook events
    switch (body.event) {
      case 'content.created':
      case 'content.updated':
        await handleContentEvent(body as z.infer<typeof contentWebhookEventSchema>)
        break
        
      case 'content.deleted':
        await handleContentDeletion(body as z.infer<typeof contentWebhookEventSchema>)
        break
        
      case 'content.published':
        await handleContentPublication(body as z.infer<typeof contentWebhookEventSchema>)
        break
        
      case 'file.uploaded':
        await handleFileUpload(body as z.infer<typeof fileUploadWebhookSchema>)
        break
        
      case 'media.processed':
      case 'media.failed':
      case 'media.optimized':
        await handleMediaProcessing(body as z.infer<typeof mediaWebhookSchema>)
        break
        
      default:
        return createErrorResponse('Unsupported webhook event', { 
          statusCode: 400, 
          requestId: requestContext.requestId 
        })
    }

    return createSuccessResponse({
      success: true,
      event: body.event,
      processedAt: new Date().toISOString(),
      message: 'Webhook processed successfully'
    })

  } catch (error) {
    console.error('Error processing content webhook:', error)
    
    if (error instanceof ValidationError) {
      return error.toResponse()
    }
    
    return createErrorResponse('Failed to process webhook', { 
      statusCode: 500, 
      requestId: requestContext.requestId 
    })
  }
}

/**
 * Handle content creation/update events
 */
async function handleContentEvent(event: z.infer<typeof contentWebhookEventSchema>) {
  console.log(`Processing ${event.event} for content ${event.contentId}`)
  
  // In a real implementation, this would:
  // 1. Update content in the database
  // 2. Invalidate relevant caches
  // 3. Trigger notifications
  // 4. Update search indexes
  
  // Mock implementation
  if (event.data) {
    const updateResult = await contentCreationService.updateContent(
      event.contentId,
      {
        title: event.data.title,
        contentType: event.data.contentType,
        version: event.data.version,
        isActive: event.data.isActive,
        tags: event.data.tags
      },
      event.userId || 'system'
    )
    
    if (updateResult.error) {
      throw new Error(`Failed to update content: ${updateResult.error}`)
    }
  }
}

/**
 * Handle content deletion events
 */
async function handleContentDeletion(event: z.infer<typeof contentWebhookEventSchema>) {
  console.log(`Processing content deletion for ${event.contentId}`)
  
  // In a real implementation, this would:
  // 1. Soft delete or archive the content
  // 2. Update related references
  // 3. Clean up associated files
  // 4. Log the deletion for audit purposes
}

/**
 * Handle content publication events
 */
async function handleContentPublication(event: z.infer<typeof contentWebhookEventSchema>) {
  console.log(`Processing content publication for ${event.contentId}`)
  
  // In a real implementation, this would:
  // 1. Mark content as published
  // 2. Update content visibility
  // 3. Trigger distribution to CDN
  // 4. Send notifications to subscribers
}

/**
 * Handle file upload events
 */
async function handleFileUpload(event: z.infer<typeof fileUploadWebhookSchema>) {
  console.log(`Processing file upload ${event.fileId}`)
  
  // Validate file type and size
  const maxFileSize = 50 * 1024 * 1024 // 50MB
  if (event.file.size > maxFileSize) {
    throw new ValidationError('File size exceeds maximum allowed size', [{
      field: 'file.size',
      message: 'File size must be less than 50MB',
      code: 'FILE_TOO_LARGE'
    }])
  }
  
  // Validate file type
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm',
    'application/pdf',
    'text/plain', 'text/markdown'
  ]
  
  if (!allowedTypes.includes(event.file.type)) {
    throw new ValidationError('Unsupported file type', [{
      field: 'file.type',
      message: 'File type not allowed',
      code: 'INVALID_FILE_TYPE'
    }])
  }
  
  // In a real implementation, this would:
  // 1. Store file metadata in database
  // 2. Trigger virus scanning
  // 3. Generate thumbnails for images
  // 4. Process videos for different formats
}

/**
 * Handle media processing events
 */
async function handleMediaProcessing(event: z.infer<typeof mediaWebhookSchema>) {
  console.log(`Processing media event ${event.event} for ${event.mediaId}`)
  
  if (event.processing.status === 'failed') {
    console.error(`Media processing failed: ${event.processing.error}`)
    // In a real implementation, this would:
    // 1. Log the error
    // 2. Notify the user
    // 3. Retry processing if appropriate
  } else if (event.processing.status === 'completed') {
    // In a real implementation, this would:
    // 1. Update media record with processed formats
    // 2. Update content that references this media
    // 3. Invalidate CDN cache
  }
}

export const POST = withBodyValidation(webhookPayloadSchema, withErrorHandling(postHandler))