import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { Webhook } from 'svix'
import { userSyncService } from '@/lib/services/user-sync'

export async function POST(req: NextRequest) {
  // Get the headers
  const headerPayload = headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your secret.
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '')

  let evt: any

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as any
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', {
      status: 400,
    })
  }

  // Handle the webhook
  const eventType = evt.type

  try {
    switch (eventType) {
      case 'user.created':
      case 'user.updated':
        // Sync user data when user is created or updated
        const syncResult = await userSyncService.syncUser(evt.data)
        if (syncResult.error) {
          console.error('Failed to sync user:', syncResult.error)
          return NextResponse.json(
            { error: 'Failed to sync user' },
            { status: 500 }
          )
        }
        console.log(`User ${eventType}:`, syncResult.user.email)
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

      default:
        console.log(`Unhandled webhook event type: ${eventType}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}