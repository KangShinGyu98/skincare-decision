import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation';
import { AuthService } from '../../modules/auth/auth.service';
import type { RequestWithContext } from '../types/express-request.type';

/**
 * session cookie가 있는 경우, 해당 세션이 유효한지 검사하여
 * request.context.user에 인증된 사용자 정보를 넣어주는 가드입니다.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const sessionToken = this.readSessionToken(request);

    if (!sessionToken) {
      return true;
    }

    const user = await this.authService.authenticateSession(sessionToken);

    if (user) {
      request.context.user = user;
    }

    return true;
  }

  private readSessionToken(request: RequestWithContext): string | undefined {
    const cookieName = this.configService.get('SESSION_ID_COOKIE_NAME', { infer: true });
    const signedCookies = request.signedCookies as Record<string, unknown> | undefined;
    const value = signedCookies?.[cookieName];

    return typeof value === 'string' ? value : undefined;
  }
}
