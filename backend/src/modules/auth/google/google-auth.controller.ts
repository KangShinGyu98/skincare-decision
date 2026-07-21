import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { Public } from '../../../common/decorators/auth.decorator';
import type { RequestWithContext } from '../../../common/types/express-request.type';
import type { Env } from '../../../config/env.validation';
import { SessionCookieService } from '../../session/session-cookie.service';
import { SessionService } from '../../session/session.service';
import { UsersService } from '../../users/users.service';
import { GoogleAuthService } from './google-auth.service';

const OAUTH_STATE_COOKIE_NAME = 'google_oauth_state';
const OAUTH_STATE_MAX_AGE_MS = 5 * 60 * 1000;

type OAuthState = {
  nonce: string;
  redirectTo: string;
};

@Controller('auth/google')
export class GoogleAuthController {
  constructor(
    private readonly googleAuthService: GoogleAuthService,
    private readonly usersService: UsersService,
    private readonly sessionService: SessionService,
    private readonly sessionCookieService: SessionCookieService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  @Public()
  @Get()
  authorize(@Res() response: Response, @Query('redirectTo') redirectTo?: string): void {
    const nonce = randomBytes(16).toString('hex');
    const state: OAuthState = { nonce, redirectTo: this.sanitizeRedirectTo(redirectTo) };

    response.cookie(
      OAUTH_STATE_COOKIE_NAME,
      nonce,
      this.getStateCookieOptions(OAUTH_STATE_MAX_AGE_MS),
    );
    response.redirect(this.googleAuthService.buildAuthUrl(this.encodeState(state)));
  }

  @Public()
  @Get('callback')
  async callback(
    @Req() request: RequestWithContext,
    @Res() response: Response,
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('error') error?: string,
  ): Promise<void> {
    const expectedNonce = this.sessionCookieService.readSignedCookie(
      request,
      OAUTH_STATE_COOKIE_NAME,
    );
    response.clearCookie(OAUTH_STATE_COOKIE_NAME, this.getStateCookieOptions());

    const decodedState = state ? this.decodeState(state) : undefined;

    if (
      error ||
      !code ||
      !decodedState ||
      !expectedNonce ||
      decodedState.nonce !== expectedNonce ||
      !request.context.deviceId
    ) {
      response.redirect(this.buildFrontendUrl('/?login_error=1'));
      return;
    }

    try {
      const profile = await this.googleAuthService.exchangeCodeForProfile(code);
      const user = await this.usersService.upsertFromGoogleProfile(profile);
      const oldSessionToken = this.sessionCookieService.readSessionToken(request);
      const newSessionToken = this.sessionCookieService.generateSessionToken();
      const referrer = this.sessionCookieService.readReferrer(request);

      await this.sessionService.rotateToAuthenticatedSession({
        ...(oldSessionToken ? { oldSessionToken } : {}),
        newSessionToken,
        deviceId: request.context.deviceId,
        userId: user.id,
        roles: [user.role],
        entryPath: request.originalUrl,
        ...(referrer ? { referrer } : {}),
      });

      this.sessionCookieService.setSessionCookie(response, newSessionToken);
      response.redirect(this.buildFrontendUrl(decodedState.redirectTo));
    } catch {
      response.redirect(this.buildFrontendUrl('/?login_error=1'));
    }
  }

  private buildFrontendUrl(path: string): string {
    return `${this.configService.get('CORS_ORIGIN', { infer: true })}${path}`;
  }

  private sanitizeRedirectTo(value: string | undefined): string {
    if (!value || !value.startsWith('/') || value.startsWith('//')) {
      return '/';
    }

    return value;
  }

  private encodeState(state: OAuthState): string {
    return Buffer.from(JSON.stringify(state)).toString('base64url');
  }

  private decodeState(state: string): OAuthState | undefined {
    try {
      const parsed: unknown = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));

      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        typeof (parsed as OAuthState).nonce !== 'string' ||
        typeof (parsed as OAuthState).redirectTo !== 'string'
      ) {
        return undefined;
      }

      return parsed as OAuthState;
    } catch {
      return undefined;
    }
  }

  private getStateCookieOptions(maxAge?: number): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.configService.get('NODE_ENV', { infer: true }) === 'production',
      signed: true,
      ...(maxAge !== undefined ? { maxAge } : {}),
    };
  }
}
