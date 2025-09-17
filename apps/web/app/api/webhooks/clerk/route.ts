import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { Webhook } from 'svix'
import { userSyncService, AuthEventType } from '@/lib/services/user-sync'
import { securityEventTracker } from '@/lib/services/security-event-tracker'
import { getAppConfigSync } from '@/lib/config/init'

export async function POST(req: NextRequest) {
  try {
    // Get the headers - handle both runtime and test environments
    let svix_id: string | null
    let svix_timestamp: string | null
    let svix_signature: string | null
    
    try {
      const headerPayload = await headers()
      svix_id = headerPayload.get('svix-id')
      svix_timestamp = headerPayload.get('svix-timestamp')
      svix_signature = headerPayload.get('svix-signature')
    } catch (error) {
      // Fallback for test environment - use request headers directly
      svix_id = req.headers.get?.('svix-id') || null
      svix_timestamp = req.headers.get?.('svix-timestamp') || null
      svix_signature = req.headers.get?.('svix-signature') || null
    }

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
      // Track security event for all webhook events
      await securityEventTracker.trackClerkWebhookEvent(evt)

      switch (eventType) {
        case 'user.created':
          // Sync user data when user is created with enhanced tracking
          const createResult = await userSyncService.syncUser(evt.data, {
            ...metadata,
            source: 'clerk_webhook',
            action: 'user_created',
            webhookEvent: true
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
            isNew: createResult.isNew,
            syncMetadata: createResult.syncMetadata
          })
          break

        case 'user.updated':
          // Sync user data when user is updated with enhanced change tracking
          const updateResult = await userSyncService.syncUser(evt.data, {
            ...metadata,
            source: 'clerk_webhook',
            action: 'user_updated',
            webhookEvent: true
          })
          
          if (updateResult.error) {
            console.error('Failed to sync updated user:', updateResult.error)
            return NextResponse.json(
              { error: 'Failed to sync user' },
              { status: 500 }
            )
          }
          
          // Handle 2FA enablement/disablement with enhanced logging
          if (evt.data.two_factor_enabled !== undefined) {
            await userSyncService.logAuthEvent(
              updateResult.user.id,
              AuthEventType.TWO_FACTOR_ENABLED,
              {
                ...metadata,
                twoFactorEnabled: evt.data.two_factor_enabled,
                action: evt.data.two_factor_enabled ? 'enabled' : 'disabled',
                securityEnhancement: true
              }
            )
            
            console.log(`2FA ${evt.data.two_factor_enabled ? 'enabled' : 'disabled'} for user:`, {
              userId: updateResult.user.id,
              email: updateResult.user.email,
              securityLevel: evt.data.two_factor_enabled ? 'enhanced' : 'standard'
            })
          }
          
          console.log(`User updated and synced:`, {
            userId: updateResult.user.id,
            email: updateResult.user.email,
            changes: updateResult.syncMetadata?.changes || [],
            syncSource: updateResult.syncMetadata?.source
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
          // Handle session creation with enhanced tracking
          await userSyncService.handleSessionCreated(
            evt.data.user_id,
            evt.data.id,
            {
              ...metadata,
              source: 'clerk_webhook',
              action: 'session_created',
              sessionData: {
                status: evt.data.status,
                lastActiveAt: evt.data.last_active_at,
                expireAt: evt.data.expire_at,
                abandonAt: evt.data.abandon_at
              }
            }
          )
          
          // Update last sign-in timestamp with enhanced metadata
          await userSyncService.updateLastSignIn(evt.data.user_id, {
            sessionId: evt.data.id,
            sessionStatus: evt.data.status,
            timestamp: new Date().toISOString()
          })
          
          // Track session creation for security monitoring
          await securityEventTracker.trackSessionEvent(
            evt.data.user_id,
            evt.data.id,
            'session_created',
            {
              ...metadata,
              sessionData: evt.data
            }
          )
          
          console.log('Session created with enhanced tracking:', {
            sessionId: evt.data.id,
            userId: evt.data.user_id,
            status: evt.data.status,
            expireAt: evt.data.expire_at
          })
          break

        case 'session.ended':
          // Handle session end with enhanced tracking
          await userSyncService.handleSessionEnded(
            evt.data.user_id,
            evt.data.id,
            {
              ...metadata,
              source: 'clerk_webhook',
              action: 'session_ended',
              sessionData: {
                status: evt.data.status,
                endedAt: new Date().toISOString(),
                reason: evt.data.status === 'expired' ? 'expired' : 'user_logout'
              }
            }
          )
          
          // Track session end for security monitoring
          await securityEventTracker.trackSessionEvent(
            evt.data.user_id,
            evt.data.id,
            'session_ended',
            {
              ...metadata,
              sessionData: evt.data,
              endReason: evt.data.status === 'expired' ? 'expired' : 'user_logout'
            }
          )
          
          console.log('Session ended with enhanced tracking:', {
            sessionId: evt.data.id,
            userId: evt.data.user_id,
            status: evt.data.status,
            endReason: evt.data.status === 'expired' ? 'expired' : 'user_logout'
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
                  verified: true,
                  verificationStrategy: evt.data.verification?.strategy
                }
              )
              
              // Track email verification for security monitoring
              await securityEventTracker.trackSecurityEvent(
                user.id,
                'email_verified',
                {
                  emailAddress: evt.data.email_address,
                  verificationMethod: evt.data.verification?.strategy,
                  ...metadata
                }
              )
            }
          }
          break

        case 'session.revoked':
          // Handle session revocation (security event)
          const revokedUser = await userSyncService.getUserByClerkId(evt.data.user_id)
          if (revokedUser) {
            await userSyncService.logAuthEvent(
              revokedUser.id,
              AuthEventType.SESSION_ENDED,
              {
                ...metadata,
                sessionId: evt.data.id,
                reason: 'revoked',
                revokedBy: evt.data.revoked_by || 'system'
              }
            )
            
            // Track session revocation as security event
            await securityEventTracker.trackSecurityEvent(
              revokedUser.id,
              'session_revoked',
              {
                sessionId: evt.data.id,
                revokedBy: evt.data.revoked_by || 'system',
                reason: 'security_revocation',
                ...metadata
              }
            )
          }
          
          console.log('Session revoked:', {
            sessionId: evt.data.id,
            userId: evt.data.user_id,
            revokedBy: evt.data.revoked_by
          })
          break

        case 'user.banned':
          // Handle user ban events
          const bannedUser = await userSyncService.getUserByClerkId(evt.data.id)
          if (bannedUser) {
            await userSyncService.updateUserStatus(
              evt.data.id,
              'suspended',
              'Account banned by administrator',
              'system'
            )
            
            await userSyncService.logAuthEvent(
              bannedUser.id,
              AuthEventType.ACCOUNT_LOCKED,
              {
                ...metadata,
                reason: 'banned',
                bannedBy: 'administrator'
              }
            )
            
            // Create security incident for user ban
            await securityEventTracker.createSecurityIncident({
              type: 'account_takeover',
              severity: 'high',
              userId: bannedUser.id,
              description: `User account ${evt.data.id} has been banned`,
              evidence: {
                clerkEvent: evt,
                timestamp: new Date().toISOString()
              },
              actions: ['account_suspended', 'sessions_revoked']
            })
          }
          
          console.log('User banned:', {
            userId: evt.data.id,
            bannedAt: new Date().toISOString()
          })
          break

        case 'user.unbanned':
          // Handle user unban events
          const unbannedUser = await userSyncService.getUserByClerkId(evt.data.id)
          if (unbannedUser) {
            await userSyncService.updateUserStatus(
              evt.data.id,
              'active',
              'Account unbanned by administrator',
              'system'
            )
            
            await userSyncService.logAuthEvent(
              unbannedUser.id,
              AuthEventType.USER_UPDATED,
              {
                ...metadata,
                action: 'unbanned',
                unbannedBy: 'administrator'
              }
            )
          }
          
          console.log('User unbanned:', {
            userId: evt.data.id,
            unbannedAt: new Date().toISOString()
          })
          break

        case 'organizationMembership.created':
          // Handle organization membership creation
          const memberUser = await userSyncService.getUserByClerkId(evt.data.public_user_data?.user_id)
          if (memberUser) {
            await userSyncService.logAuthEvent(
              memberUser.id,
              AuthEventType.USER_UPDATED,
              {
                ...metadata,
                action: 'organization_membership_created',
                organizationId: evt.data.organization?.id,
                role: evt.data.role
              }
            )
          }
          
          console.log('Organization membership created:', {
            userId: evt.data.public_user_data?.user_id,
            organizationId: evt.data.organization?.id,
            role: evt.data.role
          })
          break

        case 'organizationMembership.deleted':
          // Handle organization membership deletion
          const formerMemberUser = await userSyncService.getUserByClerkId(evt.data.public_user_data?.user_id)
          if (formerMemberUser) {
            await userSyncService.logAuthEvent(
              formerMemberUser.id,
              AuthEventType.USER_UPDATED,
              {
                ...metadata,
                action: 'organization_membership_deleted',
                organizationId: evt.data.organization?.id,
                previousRole: evt.data.role
              }
            )
          }
          
          console.log('Organization membership deleted:', {
            userId: evt.data.public_user_data?.user_id,
            organizationId: evt.data.organization?.id,
            previousRole: evt.data.role
          })
          break

        default:
          console.log(`Unhandled webhook event type: ${eventType}`)
          
          // Log unhandled events for monitoring
          await securityEventTracker.trackSecurityEvent(
            undefined,
            'webhook_unhandled_event',
            {
              eventType,
              eventData: evt.data,
              ...metadata
            }
          )
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