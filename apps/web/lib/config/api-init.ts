import { NextRequest, NextResponse } from 'next/server';
import { initializeAppConfig } from './init';

/**
 * Higher-order function to wrap API routes with configuration initialization
 * @param handler The API route handler
 * @returns Wrapped handler with configuration initialization
 */
export function withConfigInit<T extends any[]>(
  handler: (req: NextRequest, ...args: T) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      // Initialize configuration before handling the request
      await initializeAppConfig();
    } catch (error) {
      console.error('[API] Configuration initialization failed:', error);
      // Continue with the request - configuration manager handles fallbacks
    }

    return handler(req, ...args);
  };
}

/**
 * Middleware function for API routes to initialize configuration
 * @param req Next.js request object
 * @param res Next.js response object
 * @param next Next function
 */
export async function configInitMiddleware(
  req: NextRequest,
  res: NextResponse,
  next: () => void
): Promise<void> {
  try {
    await initializeAppConfig();
  } catch (error) {
    console.error('[API] Configuration initialization failed:', error);
    // Continue with the request - configuration manager handles fallbacks
  }
  
  next();
}