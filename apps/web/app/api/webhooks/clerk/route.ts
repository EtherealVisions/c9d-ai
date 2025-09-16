import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { Webhook } from 'svix'
import { userSyncService, AuthEventType } from '@/lib/services/user-sync'
import { getAppConfigSync } from '@/lib/config/init'

export async function POST(req: NextRequest) {
  try {
    // Get the headers
    const headerPayload = await headers()
    const svix_id = headerPayload.get('svix-id')
    const svix_timestamp = headerPayload.get('svix-timestamp')
    const svix_signature = headerPayload.get('svix-signature')

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      console.error('Webhook missing required headers')
      return new Response('Missing required webhook headers', {
        status: 400,
      })
    }

    // Get the body
    const payload = await req.json()
    const body = JSON.stringify(payload)

    // Get webhook secret from configuration
    const webhookSecret = getAppConfigSync('CLERK_WEBHOOK_SECRET')
    if (!webhookSecret) {
      console.error('CLERK_WEBHOOK_SECRET not configured')
      return new Response('Webhook not configured', {
        status: 500,
      })
    }

    // Create a new Svix instance with your secret
    const wh = new Webhook(webhookSecret)

    let evt: any

    // Verify the payload with the headers
    try {
      evt = wh.verify(body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      }) as any
    } catch (err) {
      console.error('Error verifying webhook signature:', err)
      return new Response('Invalid webhook signature', {
        status: 400,
      })
    }

    // Extract metadata from request
    const metadata = {
      webhookId: svix_id,
      timestamp: svix_timestamp,
      eventType: evt.type,
      clerkEventId: evt.data?.id
    }

    // Handle the webhook
    const eventType = evt.type

    console.log(`Processing Clerk webhook: ${eventType}`, {
      eventId: evt.data?.id,
      webhookId: svix_id
    })

    try {
      switch (eventType) {
        case 'user.created':
          // Sync user data when user is created
          const createResult = await userSyncService.syncUser(evt.data, {
            ...metadata,
            source: 'clerk_webhook',
            action: 'user_created'
          })
          
          if (createResult.error) {
            console.error('Failed to sync created user:', createResult.error)
            return NextResponse.json(
              { error: 'Failed to sync user' },
              { status: 500 }
            )
          }
          
          console.log(`User created and synced:`, {
            userId: createResult.user.id,
            email: createResult.user.email,
            isNew: createResult.isNew
          })
          break

        case 'user.updated':
          // Sync user data when user is updated
          const updateResult = await userSyncService.syncUser(evt.data, {
            ...metadata,
            source: 'clerk_webhook',
            action: 'user_updated'
          })
          
          if (updateResult.error) {
            console.error('Failed to sync updated user:', updateResult.error)
            return NextResponse.json(
              { error: 'Failed to sync user' },
              { status: 500 }
            )
          }
          
          console.log(`User updated and synced:`, {
            userId: updateResult.user.id,
            email: updateResult.user.email
          })
          break

        case 'user.deleted':
          // Delete user from database when deleted from Clerk
          const deleted = await userSyncService.deleteUser(evt.data.id)
          if (!deleted) {
            console.error('Failed to delete user:', evt.data.id)
            return NextResponse.json(
              { error: 'Failed to delete user' },
              { status: 500 }
            )
          }
          
          console.log('User deleted:', evt.data.id)
          break

        case 'session.created':
          // Handle session creation
          await userSyncService.handleSessionCreated(
            evt.data.user_id,
            evt.data.id,
            {
              ...metadata,
              source: 'clerk_webhook',
              action: 'session_created'
            }
          )
          
          // Update last sign-in timestamp
          await userSyncService.updateLastSignIn(evt.data.user_id)
          
          console.log('Session created:', {
            sessionId: evt.data.id,
            userId: evt.data.user_id
          })
          break

        case 'session.ended':
          // Handle session end
          await userSyncService.handleSessionEnded(
            evt.data.user_id,
            evt.data.id,
            {
              ...metadata,
              source: 'clerk_webhook',
              action: 'session_ended'
            }
          )
          
          console.log('Session ended:', {
            sessionId: evt.data.id,
            userId: evt.data.user_id
          })
          break

        case 'email.created':
          // Handle email verification events
          if (evt.data.verification?.status === 'verified') {
            const user = await userSyncService.getUserByClerkId(evt.data.object_id)
            if (user) {
              await userSyncService.logAuthEvent(
                user.id,
                AuthEventType.EMAIL_VERIFICATION,
                {
                  ...metadata,
                  emailAddress: evt.data.email_address,
                  verified: true
                }
              )
            }
          }
          break

        default:
          console.log(`Unhandled webhook event type: ${eventType}`)
      }

      return NextResponse.json({ 
        received: true,
        eventType,
        processed: true
      })
      
    } catch (error) {
      console.error('Webhook handler error:', {
        eventType,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      
      return NextResponse.json(
        { 
          error: 'Internal server error',
          eventType,
          processed: false
        },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}