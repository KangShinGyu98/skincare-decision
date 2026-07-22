import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import { randomBytes } from 'node:crypto';
import type { Env } from '../../config/env.validation';
import type { RequestWithContext } from '../../common/types/express-request.type';

/**
 * skincare_session_id 쿠키 발급/삭제/조회를 캡슐화한다.
 * ADR-0004 세션 정책(Redis opaque session)에 따라 로그인 경로(임시 로그인, Google OAuth 등)가
 * 공통으로 재사용하는 세션 쿠키 로직을 한 곳에 모은다.
 */
@Injectable()
export class SessionCookieService {
  constructor(private readonly configService: ConfigService<Env, true>) {}

  generateSessionToken(): string {
    return randomBytes(32).toString('base64url');
  }

  setSessionCookie(response: Response, sessionToken: string): void {
    response.cookie(this.getSessionCookieName(), sessionToken, {
      ...this.getSessionCookieOptions(),
      maxAge: this.getSessionCookieMaxAgeMs(),
    });
  }

  clearSessionCookie(response: Response): void {
    response.clearCookie(this.getSessionCookieName(), this.getSessionCookieOptions());
  }

  readSessionToken(request: RequestWithContext): string | undefined {
    return this.readSignedCookie(request, this.getSessionCookieName());
  }

  readSignedCookie(request: RequestWithContext, name: string): string | undefined {
    const signedCookies = request.signedCookies as Record<string, unknown> | undefined;
    const value = signedCookies?.[name];

    return typeof value === 'string' ? value : undefined;
  }

  readReferrer(request: RequestWithContext): string | undefined {
    const referrer = request.headers['referer'] ?? request.headers['referrer'];

    if (Array.isArray(referrer)) {
      return referrer[0];
    }

    return referrer;
  }

  getSessionCookieName(): string {
    return this.configService.get('SESSION_ID_COOKIE_NAME', { infer: true });
  }

  getSessionCookieOptions(): CookieOptions {
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
}
