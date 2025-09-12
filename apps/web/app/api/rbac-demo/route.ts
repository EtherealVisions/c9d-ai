/**
 * Demo API endpoint showing RBAC middleware in action
 */

import { NextRequest, NextResponse } from 'next/server'
import { rbacMiddleware } from '../../../lib/middleware/rbac'

// Demo endpoint that requires organization membership
export const GET = rbacMiddleware.organizationMember()(
  async (request: any) => {
    return NextResponse.json({
      message: 'Access granted! You are a member of this organization.',
      user: {
        id: request.user?.id,
        email: request.user?.email
      },
      organization: {
        id: request.organization?.id,
        slug: request.organization?.slug
      },
      rbacContext: {
        permissions: request.rbacContext?.permissions || [],
        roles: request.rbacContext?.roles || []
      }
    })
  }
)

// Demo endpoint that requires admin permissions
export const POST = rbacMiddleware.organizationAdmin()(
  async (request: any) => {
    return NextResponse.json({
      message: 'Admin access granted! You can perform administrative actions.',
      user: {
        id: request.user?.id,
        email: request.user?.email
      },
      organization: {
        id: request.organization?.id,
        slug: request.organization?.slug
      },
      rbacContext: {
        permissions: request.rbacContext?.permissions || [],
        roles: request.rbacContext?.roles || []
      }
    })
  }
)

// Demo endpoint that requires specific permissions
export const PUT = rbacMiddleware.requirePermissions(['users:write', 'roles:manage'])(
  async (request: any) => {
    return NextResponse.json({
      message: 'Permission-based access granted! You have the required permissions.',
      user: {
        id: request.user?.id,
        email: request.user?.email
      },
      organization: {
        id: request.organization?.id,
        slug: request.organization?.slug
      },
      rbacContext: {
        permissions: request.rbacContext?.permissions || [],
        roles: request.rbacContext?.roles || []
      }
    })
  }
)