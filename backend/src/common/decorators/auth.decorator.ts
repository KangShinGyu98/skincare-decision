import { SetMetadata } from '@nestjs/common';
import type { Permission } from '../types/auth.type';

export const IS_PUBLIC_KEY = 'isPublic';
export const AUTHENTICATED_KEY = 'authenticated';
export const PERMISSIONS_KEY = 'permissions';

/**
 * @Public()         → guest 허용, 모든 Anonymous 요청에 의도적으로 작성한다.
 * @Authenticated()  → 로그인 필요
 * @Permissions(...) → 특정 permission 필요
 */
export function Public(): MethodDecorator & ClassDecorator {
  return SetMetadata(IS_PUBLIC_KEY, true);
}

export function Authenticated(): MethodDecorator & ClassDecorator {
  return SetMetadata(AUTHENTICATED_KEY, true);
}

export function Permissions(...permissions: Permission[]): MethodDecorator & ClassDecorator {
  return SetMetadata(PERMISSIONS_KEY, permissions);
}
