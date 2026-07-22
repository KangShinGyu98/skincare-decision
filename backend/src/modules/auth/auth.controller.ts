import { Controller, Get, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { Authenticated } from '../../common/decorators/auth.decorator';
import type { RequestWithContext } from '../../common/types/express-request.type';
import { SessionCookieService } from '../session/session-cookie.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionCookieService: SessionCookieService,
    private readonly usersService: UsersService,
  ) {}

  @Authenticated()
  @Post('logout')
  async logout(@Req() request: RequestWithContext, @Res({ passthrough: true }) response: Response) {
    const sessionToken = this.sessionCookieService.readSessionToken(request);

    await this.authService.logout(sessionToken);
    this.sessionCookieService.clearSessionCookie(response);

    return { ok: true };
  }

  @Authenticated()
  @Get('me')
  async me(@Req() request: RequestWithContext) {
    const authenticatedUser = this.requireAuthenticatedUser(request);
    const user = await this.usersService.findById(authenticatedUser.id);

    return {
      ...authenticatedUser,
      consentRequired: user?.consentedAt == null,
    };
  }

  @Authenticated()
  @Post('consent')
  async consent(@Req() request: RequestWithContext) {
    const authenticatedUser = this.requireAuthenticatedUser(request);

    await this.usersService.recordConsent(authenticatedUser.id);

    return { ok: true };
  }

  private requireAuthenticatedUser(request: RequestWithContext) {
    const authenticatedUser = request.context.user;

    if (!authenticatedUser) {
      throw new UnauthorizedException({
        code: 'AUTH_REQUIRED',
        message: 'Authentication is required',
      });
    }

    return authenticatedUser;
  }
}
