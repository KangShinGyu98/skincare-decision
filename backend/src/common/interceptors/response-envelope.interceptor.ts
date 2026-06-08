import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map } from 'rxjs';
import type { Observable } from 'rxjs';
import type { RequestWithContext } from '../types/express-request.type';

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
  intercept<T>(context: ExecutionContext, next: CallHandler<T>): Observable<ResponseEnvelope<T>> {
    const request = context.switchToHttp().getRequest<RequestWithContext>();

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
