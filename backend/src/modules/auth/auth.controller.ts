import { Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { loginBodySchema, type LoginBodyDto } from '@skincare-decision/shared/schemas';
import type { CookieOptions, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { Authenticated, Permissions, Public } from '../../common/decorators/auth.decorator';
import { ZodBody } from '../../common/decorators/zod-body.decorator';
import type { RequestWithContext } from '../../common/types/express-request.type';
import type { Env } from '../../config/env.validation';
import { AuthService } from './auth.service';

/**
 * 임시 로그인 컨트롤러
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  @Public()
  @Post('login')
  async login(
    @Req() request: RequestWithContext,
    @Res({ passthrough: true }) response: Response,
    @ZodBody(loginBodySchema) body: LoginBodyDto,
  ) {
    const oldSessionToken = this.readSignedCookie(request, this.getSessionCookieName());
    const newSessionToken = this.generateSessionToken();
    const referrer = this.readReferrer(request);

    const loginResult = await this.authService.login(body.username, body.password, {
      ...(request.context.deviceId ? { deviceId: request.context.deviceId } : {}),
      ...(oldSessionToken ? { oldSessionToken } : {}),
      newSessionToken,
      entryPath: request.originalUrl,
      ...(referrer ? { referrer } : {}),
    });

    this.setSessionCookie(response, newSessionToken);

    request.context.sessionId = loginResult.sessionId;
    request.context.user = loginResult.user;

    return {
      user: loginResult.user,
      expiresInSeconds: loginResult.expiresInSeconds,
    };
  }

  @Public()
  @Post('logout')
  async logout(@Req() request: RequestWithContext, @Res({ passthrough: true }) response: Response) {
    const sessionToken = this.readSignedCookie(request, this.getSessionCookieName());

    await this.authService.logout(sessionToken);
    this.clearSessionCookie(response);

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

  private generateSessionToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private setSessionCookie(response: Response, sessionToken: string): void {
    response.cookie(this.getSessionCookieName(), sessionToken, {
      ...this.getSessionCookieOptions(),
      maxAge: this.getSessionCookieMaxAgeMs(),
    });
  }

  private clearSessionCookie(response: Response): void {
    response.clearCookie(this.getSessionCookieName(), this.getSessionCookieOptions());
  }

  private getSessionCookieName(): string {
    return this.configService.get('SESSION_ID_COOKIE_NAME', { infer: true });
  }

  private getSessionCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.configService.get('NODE_ENV', { infer: true }) === 'production',
      signed: true,
    };
  }

  private getSessionCookieMaxAgeMs(): number {
    return this.configService.get('SESSION_COOKIE_MAX_AGE_SECONDS', { infer: true }) * 1000;
  }

  private readSignedCookie(request: RequestWithContext, name: string): string | undefined {
    const signedCookies = request.signedCookies as Record<string, unknown> | undefined;
    const value = signedCookies?.[name];

    return typeof value === 'string' ? value : undefined;
  }

  private readReferrer(request: RequestWithContext): string | undefined {
    const referrer = request.headers['referer'] ?? request.headers['referrer'];

    if (Array.isArray(referrer)) {
      return referrer[0];
    }

    return referrer;
  }
}
