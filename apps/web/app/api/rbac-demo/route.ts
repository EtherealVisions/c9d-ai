/**
 * Demo API endpoint showing RBAC middleware in action
 * Temporarily simplified for build compatibility
 */

import { NextRequest, NextResponse } from 'next/server'

// Demo endpoint - temporarily disabled due to middleware type issues
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'RBAC demo endpoint - temporarily disabled during build',
    status: 'disabled'
  })
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    message: 'RBAC demo endpoint - temporarily disabled during build',
    status: 'disabled'
  })
}

export async function PUT(request: NextRequest) {
  return NextResponse.json({
    message: 'RBAC demo endpoint - temporarily disabled during build',
    status: 'disabled'
  })
}