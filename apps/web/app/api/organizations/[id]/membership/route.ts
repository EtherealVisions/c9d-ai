import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseClient } from '@/lib/database'
import { userSyncService } from '@/lib/services/user-sync'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const { id: organizationId } = await params

    // Get user from database
    const user = await userSyncService.getUserByClerkId(userId)
    if (!user) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      )
    }

    const supabase = createSupabaseClient()

    // Get user's membership in this organization
    const { data: membership, error: membershipError } = await supabase
      .from('organization_memberships')
      .select(`
        *,
        role:roles (
          *
        )
      `)
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .single()

    if (membershipError) {
      if (membershipError.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'MEMBERSHIP_NOT_FOUND', message: 'User is not a member of this organization' } },
          { status: 404 }
        )
      }
      console.error('Failed to fetch membership:', membershipError)
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to fetch membership' } },
        { status: 500 }
      )
    }

    // Get permissions for the user's role
    let permissions: string[] = []
    if (membership.role) {
      permissions = membership.role.permissions || []
    }

    return NextResponse.json({
      membership,
      permissions
    })
  } catch (error) {
    console.error('Organization membership endpoint error:', error)
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Internal server error' 
        } 
      },
      { status: 500 }
    )
  }
}