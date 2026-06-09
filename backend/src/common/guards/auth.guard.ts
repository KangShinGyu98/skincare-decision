import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../modules/auth/auth.service';
import type { RequestWithContext } from '../types/express-request.type';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const token = this.extractBearerToken(request);

    if (!token) {
      return true;
    }

    const user = await this.authService.authenticateAccessToken(token);

    request.context.user = user;
    return true;
  }

  private extractBearerToken(request: RequestWithContext): string | undefined {
    const authorization = request.headers['authorization'];

    if (authorization === undefined) {
      return undefined;
    }

    if (typeof authorization !== 'string') {
      throw new UnauthorizedException({
        code: 'INVALID_AUTH_HEADER',
        message: 'Invalid authorization header',
      });
    }

    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException({
        code: 'INVALID_AUTH_HEADER',
        message: 'Authorization header must use Bearer token',
      });
    }

    return token;
  }
}
