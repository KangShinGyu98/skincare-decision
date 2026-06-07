import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Response } from 'express';
import { tap } from 'rxjs';
import type { Observable } from 'rxjs';
import { AppLogger } from '../logger/logger.service';
import type { RequestWithContext } from '../types/express-request.type';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithContext>();
    const response = http.getResponse<Response>();

    return next.handle().pipe(
      tap(() => {
        const requestContext = request.context;
        const durationMs = Date.now() - requestContext.startedAt;

        this.logger.info('request completed', {
          requestId: requestContext.requestId,
          deviceId: requestContext.deviceId,
          sessionId: requestContext.sessionId,
          userId: requestContext.userId,
          method: request.method,
          path: request.originalUrl,
          statusCode: response.statusCode,
          durationMs,
          ip: requestContext.ip,
          userAgent: requestContext.userAgent,
        });
      }),
    );
  }
}
