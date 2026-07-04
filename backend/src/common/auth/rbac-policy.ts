import type { Permission, UserRole } from '../types/auth.type';

export const USER_PERMISSIONS = [
  'products:read:any',
  'user_responses:read:self',
  'user_responses:create:self',
  'user_responses:update:self',
  'session_events:create:self',
] as const satisfies Permission[];

export const ADMIN_PERMISSIONS = [
  ...USER_PERMISSIONS,
  'products:create:any',
  'products:update:any',
  'products:delete:any',
  'questions:manage:any',
  'priority_rules:manage:any',
  'user_responses:read:any',
  'session_events:read:any',
] as const satisfies Permission[];

export function permissionsForRoles(roles: UserRole[]): Permission[] {
  const permissions = new Set<Permission>();

  for (const role of roles) {
    const rolePermissions = role === 'ADMIN' ? ADMIN_PERMISSIONS : USER_PERMISSIONS;

    for (const permission of rolePermissions) {
      permissions.add(permission);
    }
  }

  return [...permissions];
}
