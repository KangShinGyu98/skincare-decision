export type UserRole = 'USER' | 'ADMIN';

export type PermissionScope = 'self' | 'own' | 'any';

export type PermissionResource =
  | 'products'
  | 'user_responses'
  | 'questions'
  | 'priority_rules'
  | 'session_events';

export type PermissionAction = 'read' | 'create' | 'update' | 'delete' | 'manage';

export type Permission = `${PermissionResource}:${PermissionAction}:${PermissionScope}`;

export type AuthenticatedUser = {
  id: string;
  roles: UserRole[];
  permissions: Permission[];
};
