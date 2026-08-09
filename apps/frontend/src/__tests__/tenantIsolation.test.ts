import { validateTenantAccess, AuthenticatedUserContext } from '../app/api/middleware/tenantContext';
import { hasPermission, requirePermission } from '../app/api/middleware/rbacGuard';
import { UserRole } from '@aether/shared';

describe('Multi-Tenant Data Isolation & RBAC Security Suite', () => {
  const userAContext: AuthenticatedUserContext = {
    userId: 'usr-001',
    email: 'usera@farm.com',
    name: 'Farmer A',
    role: UserRole.USER,
    accountId: 'account-farm-alpha',
  };

  const userBContext: AuthenticatedUserContext = {
    userId: 'usr-002',
    email: 'userb@farm.com',
    name: 'Farmer B',
    role: UserRole.USER,
    accountId: 'account-farm-beta',
  };

  const adminContext: AuthenticatedUserContext = {
    userId: 'admin-001',
    email: 'admin@aethercrop.io',
    name: 'Super Admin',
    role: UserRole.SUPER_ADMIN,
    accountId: 'account-system-admin',
  };

  test('User A can access resources belonging to Account A', () => {
    const res = validateTenantAccess(userAContext, 'account-farm-alpha');
    expect(res.allowed).toBe(true);
  });

  test('User A MUST BE BLOCKED (403) from accessing Account B resources', () => {
    const res = validateTenantAccess(userAContext, 'account-farm-beta');
    expect(res.allowed).toBe(false);
    expect(res.errorResponse?.status).toBe(403);
  });

  test('User B MUST BE BLOCKED (403) from accessing Account A resources', () => {
    const res = validateTenantAccess(userBContext, 'account-farm-alpha');
    expect(res.allowed).toBe(false);
    expect(res.errorResponse?.status).toBe(403);
  });

  test('Super Admin can access any tenant account resource', () => {
    const resA = validateTenantAccess(adminContext, 'account-farm-alpha');
    const resB = validateTenantAccess(adminContext, 'account-farm-beta');
    expect(resA.allowed).toBe(true);
    expect(resB.allowed).toBe(true);
  });

  test('Unauthenticated user is denied (401)', () => {
    const res = validateTenantAccess(null, 'account-farm-alpha');
    expect(res.allowed).toBe(false);
    expect(res.errorResponse?.status).toBe(401);
  });

  test('RBAC: Normal USER cannot execute emergency controls or device transfer', () => {
    expect(hasPermission(UserRole.USER, 'emergency.control')).toBe(false);
    expect(hasPermission(UserRole.USER, 'devices.transfer')).toBe(false);
  });

  test('RBAC: SUPER_ADMIN has full governance permissions', () => {
    expect(hasPermission(UserRole.SUPER_ADMIN, 'emergency.control')).toBe(true);
    expect(hasPermission(UserRole.SUPER_ADMIN, 'devices.transfer')).toBe(true);
    expect(hasPermission(UserRole.SUPER_ADMIN, 'users.disable')).toBe(true);
  });
});
