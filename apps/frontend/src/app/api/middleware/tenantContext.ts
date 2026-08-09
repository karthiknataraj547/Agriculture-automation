import { NextResponse } from 'next/server';
import { UserRole } from '@aether/shared';

export interface AuthenticatedUserContext {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  accountId: string;
  mustChangePassword?: boolean;
}

export function extractAuthContext(req: Request): AuthenticatedUserContext | null {
  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('X-Aether-Session') || '';
    if (!authHeader) {
      const cookieHeader = req.headers.get('cookie') || '';
      const match = cookieHeader.match(/aether_session=([^;]+)/);
      if (match) {
        const decoded = Buffer.from(decodeURIComponent(match[1]), 'base64').toString('utf-8');
        return JSON.parse(decoded);
      }
      return null;
    }

    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    }
    return null;
  } catch {
    return null;
  }
}

export function validateTenantAccess(
  authCtx: AuthenticatedUserContext | null,
  targetAccountId?: string | null
): { allowed: boolean; errorResponse?: NextResponse } {
  if (!authCtx) {
    return {
      allowed: false,
      errorResponse: NextResponse.json(
        { success: false, error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      ),
    };
  }

  // Super Admin & Admin can access all accounts
  if (authCtx.role === UserRole.SUPER_ADMIN || authCtx.role === UserRole.ADMIN || authCtx.role === UserRole.SUPPORT_ADMIN) {
    return { allowed: true };
  }

  // Tenant Isolation Check
  if (targetAccountId && targetAccountId !== authCtx.accountId) {
    return {
      allowed: false,
      errorResponse: NextResponse.json(
        { success: false, error: 'Forbidden', message: 'Access denied to this tenant resource' },
        { status: 403 }
      ),
    };
  }

  return { allowed: true };
}
