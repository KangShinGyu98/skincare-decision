import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';
import type { RequestWithContext } from '../types/express-request.type';
import { isHealthCheckRequest } from 'src/common/http/is-healthcheck-request';

type ResponseEnvelope<T> = {
  success: true;
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
  };
};

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept<T>(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ResponseEnvelope<T> | T> {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    if (isHealthCheckRequest(request.originalUrl)) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        meta: {
          requestId: request.context.requestId,
          timestamp: new Date().toISOString(),
        },
      })),
    );
  }
}
