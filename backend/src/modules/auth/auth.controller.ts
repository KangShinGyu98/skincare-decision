import { Controller, Get, Post, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Authenticated, Permissions, Public } from '../../common/decorators/auth.decorator';
import type { RequestWithContext } from '../../common/types/express-request.type';
import { SessionCookieService } from '../session/session-cookie.service';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionCookieService: SessionCookieService,
  ) {}

  @Public()
  @Post('logout')
  async logout(@Req() request: RequestWithContext, @Res({ passthrough: true }) response: Response) {
    const sessionToken = this.sessionCookieService.readSessionToken(request);

    await this.authService.logout(sessionToken);
    this.sessionCookieService.clearSessionCookie(response);

    return { ok: true };
  }

  @Authenticated()
  @Get('me')
  me(@Req() request: RequestWithContext) {
    return request.context.user;
  }

  @Permissions('user_responses:update:self')
  @Post('test/user-response')
  testUserPermission() {
    return { ok: true };
  }

  @Permissions('products:create:any')
  @Post('test/product')
  testAdminProductPermission() {
    return { ok: true };
  }

  @Permissions('priority_rules:manage:any')
  @Post('test/priority-rule')
  testAdminPriorityRulePermission() {
    return { ok: true };
  }
}
