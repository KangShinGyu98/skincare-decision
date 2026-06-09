import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, NextFunction } from 'express';
import { Env } from 'src/config/env.validation';
import { validate as isUuid, v7 as uuidv7 } from 'uuid';
import { RequestWithContext } from '../types/express-request.type';

/**
  Device/Session 식별 미들웨어
  deviceId: 장기 쿠키, 사용자를 익명으로 식별
  sessionId: 브라우저 세션 쿠키, 현재 활동창 식별
  쿠키 값이 없거나 UUID가 아니면 UUIDv7 새 발급
  req.context.deviceId/sessionId에 주입
  signed cookie로 클라이언트 임의 조작을 줄임
 */
@Injectable()
export class DeviceSessionMiddleware implements NestMiddleware {
  constructor(private readonly configService: ConfigService<Env, true>) {}
  use(req: RequestWithContext, res: Response, next: NextFunction): void {
    const deviceIdCookieName = this.configService.get('DEVICE_ID_COOKIE_NAME', {
      infer: true,
    });
    const sessionIdCookieName = this.configService.get('SESSION_ID_COOKIE_NAME', {
      infer: true,
    });
    const cookieMaxAgeDays = this.configService.get('DEVICE_SESSION_COOKIE_MAX_AGE_DAYS', {
      infer: true,
    });

    const nodeEnv = this.configService.get('NODE_ENV', { infer: true });

    const signedCookies = req.signedCookies as Record<string, unknown> | undefined;
    const cookies = req.cookies as Record<string, unknown> | undefined;

    const incomingDeviceId = signedCookies?.[deviceIdCookieName] ?? cookies?.[deviceIdCookieName];
    const incomingSessionId =
      signedCookies?.[sessionIdCookieName] ?? cookies?.[sessionIdCookieName];

    const deviceId =
      typeof incomingDeviceId === 'string' && isUuid(incomingDeviceId)
        ? incomingDeviceId
        : uuidv7();
    const sessionId =
      typeof incomingSessionId === 'string' && isUuid(incomingSessionId)
        ? incomingSessionId
        : uuidv7();

    req.context.deviceId = deviceId;
    req.context.sessionId = sessionId;

    const secure = nodeEnv === 'production';

    res.cookie(deviceIdCookieName, deviceId, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      signed: true,
      maxAge: cookieMaxAgeDays * 24 * 60 * 60 * 1000,
    });

    res.cookie(sessionIdCookieName, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      signed: true,
      maxAge: cookieMaxAgeDays * 24 * 60 * 60 * 1000,
    });

    next();
  }
}
