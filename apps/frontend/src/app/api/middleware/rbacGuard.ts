import { NextResponse } from 'next/server';
import { Permission, ROLE_PERMISSIONS, UserRole } from '@aether/shared';
import { AuthenticatedUserContext } from './tenantContext';

export function hasPermission(role: UserRole | string, requiredPermission: Permission): boolean {
  const userRole = role as UserRole;
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(requiredPermission);
}

export function requirePermission(
  authCtx: AuthenticatedUserContext | null,
  permission: Permission
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

  if (!hasPermission(authCtx.role, permission)) {
    return {
      allowed: false,
      errorResponse: NextResponse.json(
        { success: false, error: 'Forbidden', message: `Permission '${permission}' required` },
        { status: 403 }
      ),
    };
  }

  return { allowed: true };
}

export function requireAdminRole(
  authCtx: AuthenticatedUserContext | null
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

  const isAdmin =
    authCtx.role === UserRole.SUPER_ADMIN ||
    authCtx.role === UserRole.ADMIN ||
    authCtx.role === UserRole.SUPPORT_ADMIN;

  if (!isAdmin) {
    return {
      allowed: false,
      errorResponse: NextResponse.json(
        { success: false, error: 'Forbidden', message: 'Admin role required' },
        { status: 403 }
      ),
    };
  }

  return { allowed: true };
}
