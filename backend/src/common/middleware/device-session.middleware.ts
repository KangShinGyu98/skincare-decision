import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, NextFunction } from 'express';
import { Env } from 'src/config/env.validation';
import { validate as isUuid, v7 as uuidv7 } from 'uuid';
import { RequestWithContext } from '../types/express-request.type';
import { SessionService } from 'src/modules/session/session.service';
import { randomBytes } from 'node:crypto';

/**
 * Device/Session 식별 미들웨어
 * deviceId, sessionId 없으면 생성해서 cookie 설정,
 * ensureDeviceSession로 devices, sessions DB row 보장 (Redis에 있으면 lastSeenAt 업데이트, 없으면 Redis, DB 에 익명 세션 생성)
 * sessionId 없으면 무조건 비로그인 사용자
 */
@Injectable()
export class DeviceSessionMiddleware implements NestMiddleware {
  constructor(
    private readonly configService: ConfigService<Env, true>,
    private readonly sessionService: SessionService,
  ) {}

  async use(req: RequestWithContext, res: Response, next: NextFunction): Promise<void> {
    const deviceCookieName = this.configService.get('DEVICE_ID_COOKIE_NAME', { infer: true });
    const sessionCookieName = this.configService.get('SESSION_ID_COOKIE_NAME', { infer: true });
    const deviceCookieMaxAgeDays = this.configService.get('COOKIE_MAX_AGE_DAYS', { infer: true });
    const sessionCookieMaxAgeSeconds = this.sessionService.getSessionTtlSeconds();
    const secure = this.configService.get('NODE_ENV', { infer: true }) === 'production';

    const signedCookies = req.signedCookies as Record<string, unknown> | undefined;

    const incomingDeviceId = signedCookies?.[deviceCookieName];
    const incomingSessionToken = signedCookies?.[sessionCookieName];

    const deviceId =
      typeof incomingDeviceId === 'string' && isUuid(incomingDeviceId)
        ? incomingDeviceId
        : uuidv7();

    const sessionToken =
      typeof incomingSessionToken === 'string' ? incomingSessionToken : this.generateSessionToken();

    const referrer = this.readReferrer(req);

    try {
      const session = await this.sessionService.ensureDeviceSession({
        deviceId,
        sessionToken,
        entryPath: req.originalUrl,
        ...(referrer ? { referrer } : {}),
      });

      req.context.deviceId = deviceId;
      req.context.sessionId = session.sessionId;

      res.cookie(deviceCookieName, deviceId, {
        httpOnly: true,
        sameSite: 'lax',
        secure,
        signed: true,
        maxAge: deviceCookieMaxAgeDays * 24 * 60 * 60 * 1000,
      });

      res.cookie(sessionCookieName, sessionToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure,
        signed: true,
        maxAge: sessionCookieMaxAgeSeconds * 1000,
      });

      next();
    } catch (error) {
      next(error);
    }
  }

  private generateSessionToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private readReferrer(req: RequestWithContext): string | undefined {
    const referrer = req.headers['referer'] ?? req.headers['referrer'];

    if (Array.isArray(referrer)) {
      return referrer[0];
    }

    return referrer;
  }
}
