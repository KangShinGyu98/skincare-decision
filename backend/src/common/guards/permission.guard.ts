import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTHENTICATED_KEY, IS_PUBLIC_KEY, PERMISSIONS_KEY } from '../decorators/auth.decorator';
import type { Permission } from '../types/auth.type';
import type { RequestWithContext } from '../types/express-request.type';

/**
 * PermissionGuard는 @Auth() 데코레이터로 설정된 인증/권한 요구사항을 검사하는 가드입니다.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.getMetadata<boolean>(context, IS_PUBLIC_KEY) === true) {
      return true;
    }

    const requiresAuth = this.getMetadata<boolean>(context, AUTHENTICATED_KEY) === true;
    const requiredPermissions = this.getMetadata<Permission[]>(context, PERMISSIONS_KEY) ?? [];

    if (!requiresAuth && requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const user = request.context.user;

    if (!user) {
      throw new UnauthorizedException({
        code: 'AUTH_REQUIRED',
        message: 'Authentication is required',
      });
    }

    const hasAllPermissions = requiredPermissions.every((permission) =>
      user.permissions.includes(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_PERMISSION',
        message: 'Required permission is missing',
      });
    }

    return true;
  }

  private getMetadata<T>(context: ExecutionContext, key: string): T | undefined {
    return this.reflector.getAllAndOverride<T>(key, [context.getHandler(), context.getClass()]);
  }
}
