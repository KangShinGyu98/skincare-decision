import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, NextFunction } from 'express';
import { Env } from 'src/config/env.validation';
import { validate as isUuid, v7 as uuidv7 } from 'uuid';
import { RequestContext } from '../types/request-context.type';
import { MaybeRequestWithContext } from '../types/express-request.type';

/**
 * 요청마다 RequestContext를 생성하는 middleware.
 *
 * - 클라이언트/프록시가 보낸 request id가 UUID면 재사용한다.
 * - 없거나 형식이 이상하면 서버가 UUIDv7 request id를 생성한다.
 * - 생성한 request id를 req.context에 저장한다.
 * - 같은 request id를 응답 header에도 실어준다.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly configService: ConfigService<Env, true>) {}
  use(req: MaybeRequestWithContext, res: Response, next: NextFunction): void {
    const requestIdHeader = this.configService.get('REQUEST_ID_HEADER', {
      infer: true,
    });

    const incomingRequestId = req.header(requestIdHeader);
    const requestId = incomingRequestId && isUuid(incomingRequestId) ? incomingRequestId : uuidv7();
    const context: RequestContext = {
      requestId,
      startedAt: Date.now(),
    };

    if (req.ip) {
      context.ip = req.ip;
    }
    const userAgent = req.header('User-Agent');
    if (userAgent) {
      context.userAgent = userAgent;
    }

    req.context = context;
    res.setHeader(requestIdHeader, requestId);

    next();
  }
}
